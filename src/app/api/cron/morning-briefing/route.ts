import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser, pushEnabled } from '@/lib/push/send';
import { complete, MODELS } from '@/lib/ai/openrouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** KST 기준 날짜 유틸 */
function kstDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function won(n: number) { return `${Math.round(n).toLocaleString('ko-KR')}원`; }

async function sumSales(admin: ReturnType<typeof createAdminClient>, storeId: string, from: string, to: string) {
  const { data } = await admin.from('sales').select('amount').eq('store_id', storeId).gte('sale_date', from).lte('sale_date', to);
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}

/**
 * 아침 브리핑 크론 (매일 08:00 KST = 23:00 UTC).
 * 어제 매출·전주 동일요일 대비·이번 달 목표 페이스를 AI(haiku)가 1~2문장으로 요약해 푸시.
 * briefing_alert가 꺼진 사용자는 제외. VAPID/CRON_SECRET/OPENROUTER 미설정 시 안전 무동작.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ skipped: 'CRON_SECRET 미설정' });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!pushEnabled()) return NextResponse.json({ skipped: 'VAPID 미설정' });
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ skipped: 'OPENROUTER 미설정' });

  const admin = createAdminClient();
  const yesterday = kstDate(-1);
  const lastWeek = kstDate(-8);
  const monthStart = yesterday.slice(0, 7) + '-01';
  const dayOfMonth = Number(yesterday.slice(8, 10));
  const daysInMonth = new Date(Number(yesterday.slice(0,4)), Number(yesterday.slice(5,7)), 0).getDate();

  const { data: subs } = await admin.from('push_subscriptions').select('user_id').limit(2000);
  const userIds = Array.from(new Set((subs ?? []).map((s) => s.user_id as string)));

  let notified = 0;
  for (const uid of userIds) {
    try {
      const { data: prefs } = await admin.from('user_notification_prefs')
        .select('briefing_alert').eq('user_id', uid).maybeSingle();
      if (prefs && prefs.briefing_alert === false) continue;

      const { data: stores } = await admin.from('stores').select('id, name, monthly_target').eq('owner_id', uid).limit(1);
      const store = stores?.[0];
      if (!store) continue;

      const [yTotal, lwTotal, mtdTotal] = await Promise.all([
        sumSales(admin, store.id, yesterday, yesterday),
        sumSales(admin, store.id, lastWeek, lastWeek),
        sumSales(admin, store.id, monthStart, yesterday),
      ]);
      if (yTotal === 0 && mtdTotal === 0) continue; // 데이터 없으면 스킵

      const target = Number(store.monthly_target ?? 0);
      const wowPct = lwTotal > 0 ? Math.round(((yTotal - lwTotal) / lwTotal) * 100) : null;
      const goalPct = target > 0 ? Math.round((mtdTotal / target) * 100) : null;
      const pacePct = Math.round((dayOfMonth / daysInMonth) * 100);

      const facts = [
        `매장명: ${store.name}`,
        `어제 매출: ${won(yTotal)}`,
        wowPct !== null ? `지난주 같은 요일 대비: ${wowPct >= 0 ? '+' : ''}${wowPct}%` : '전주 비교: 데이터 없음',
        `이번 달 누적: ${won(mtdTotal)}`,
        target > 0 ? `월 목표 달성률: ${goalPct}% (정상 페이스 ${pacePct}%)` : '월 목표: 미설정',
      ].join('\n');

      let text = '';
      try {
        const r = await complete({
          model: MODELS.haiku,
          temperature: 0.5,
          maxTokens: 220,
          timeoutMs: 18000,
          messages: [
            { role: 'system', content: '너는 자영업 사장님을 돕는 매장 비서야. 아래 데이터를 바탕으로 사장님께 보낼 아침 브리핑을 한국어로 1~2문장(90자 이내)으로 따뜻하고 간결하게 작성해. 숫자는 핵심만, 이모지·과장 금지, 존댓말.' },
            { role: 'user', content: facts },
          ],
        });
        text = (r.text || '').trim().replace(/\s+/g, ' ');
      } catch { text = ''; }
      if (!text) {
        text = wowPct !== null
          ? `어제 매출 ${won(yTotal)}, 지난주 같은 요일 대비 ${wowPct >= 0 ? '+' : ''}${wowPct}%예요.`
          : `어제 매출 ${won(yTotal)} 입력됐어요. 오늘도 좋은 하루 되세요.`;
      }

      await sendPushToUser(uid, {
        title: '오늘의 매장 브리핑',
        body: text.slice(0, 160),
        url: '/dashboard',
        tag: 'rm-morning-briefing',
      });
      notified += 1;
    } catch (e) {
      console.error('[cron/morning-briefing] user', uid, e);
    }
  }
  return NextResponse.json({ ok: true, candidates: userIds.length, notified });
}
