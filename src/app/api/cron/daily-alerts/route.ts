import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser, pushEnabled } from '@/lib/push/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** 'YYYY-MM-DD' (KST) */
function todayKST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * 일일 알림 크론 (Vercel Cron, 매일 20:00 KST).
 * - 푸시 구독이 있는 사장님 중, 오늘 매출이 아직 입력 안 된 매장에 마감 리마인더 발송.
 * - VAPID/CRON_SECRET 미설정 시 안전하게 무동작.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ skipped: 'CRON_SECRET 미설정' });
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!pushEnabled()) return NextResponse.json({ skipped: 'VAPID 미설정' });

  const admin = createAdminClient();
  const today = todayKST();

  // 푸시 구독이 있는 사용자만 대상 (불필요한 처리 최소화)
  const { data: subs } = await admin.from('push_subscriptions').select('user_id').limit(2000);
  const userIds = Array.from(new Set((subs ?? []).map((s) => s.user_id as string)));

  let notified = 0;
  for (const uid of userIds) {
    try {
      // 알림 선호: 하나라도 켜져 있으면 발송 대상
      const { data: prefs } = await admin
        .from('user_notification_prefs')
        .select('expense_alert, attendance_alert, notice_alert, important_alert')
        .eq('user_id', uid)
        .maybeSingle();
      if (prefs && !prefs.expense_alert && !prefs.attendance_alert && !prefs.notice_alert && !prefs.important_alert) continue;

      // 본인이 소유한 매장
      const { data: stores } = await admin.from('stores').select('id, name').eq('owner_id', uid).limit(5);
      if (!stores || stores.length === 0) continue;

      for (const store of stores) {
        const { count } = await admin
          .from('sales')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('sale_date', today);
        if ((count ?? 0) === 0) {
          await sendPushToUser(uid, {
            title: '오늘 마감 잊지 마세요',
            body: `${store.name} · 오늘 매출이 아직 입력되지 않았어요. 1분이면 끝나요.`,
            url: '/sales/new',
            tag: 'rm-daily-close',
          });
          notified += 1;
          break; // 사용자당 1건
        }
      }
    } catch (e) {
      console.error('[cron/daily-alerts] user', uid, e);
    }
  }

  return NextResponse.json({ ok: true, candidates: userIds.length, notified });
}
