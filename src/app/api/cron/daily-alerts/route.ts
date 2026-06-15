import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser, pushEnabled } from '@/lib/push/send';
import { contractedMinutesForDay, type ScheduleForPay } from '@/lib/payroll/paid-minutes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** 'YYYY-MM-DD' (KST) */
function todayKST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const DEFAULT_SHIFT_MIN = 480; // 계약 정보가 없을 때 기본 8시간

/**
 * 일일 알림 크론 (Vercel Cron, 매일 20:00 KST).
 *  1) 미퇴근 자동마감 — 전날 이전 출근인데 퇴근 미체크 건을 계약시간 기준으로 마감(과지급 방지).
 *  2) 매출 마감 리마인더 + 자동마감 알림 (푸시 설정된 사장님께).
 * VAPID/CRON_SECRET 미설정 시 1)은 수행하되 2) 푸시는 건너뛴다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ skipped: 'CRON_SECRET 미설정' });
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const today = todayKST();

  // ─────────────────────────────────────────────────────────────
  // 1) 미퇴근 자동마감 (푸시 설정과 무관하게 항상 수행)
  // ─────────────────────────────────────────────────────────────
  let autoClosed = 0;
  const closedByStore = new Map<string, number>();
  try {
    const kstStartIso = new Date(`${today}T00:00:00+09:00`).toISOString();
    const { data: openAtts } = await admin
      .from('attendances')
      .select('id, store_id, user_id, check_in_at')
      .is('check_out_at', null)
      .lt('check_in_at', kstStartIso) // 전날 이전 출근 = 퇴근 누락
      .limit(500);

    if (openAtts && openAtts.length > 0) {
      const storeIds = Array.from(new Set(openAtts.map((a) => a.store_id)));
      const userIds = Array.from(new Set(openAtts.map((a) => a.user_id)));
      const { data: contracts } = await admin
        .from('labor_contracts')
        .select('store_id, employee_id, status, work_start_time, work_end_time, break_minutes, work_schedule, work_days')
        .in('store_id', storeIds)
        .in('employee_id', userIds)
        .in('status', ['signed', 'sent']);
      const cMap = new Map<string, ScheduleForPay>();
      (contracts ?? []).forEach((c) => {
        const k = `${c.store_id}:${c.employee_id}`;
        if (!cMap.has(k)) cMap.set(k, c as unknown as ScheduleForPay);
      });

      for (const a of openAtts) {
        const c = cMap.get(`${a.store_id}:${a.user_id}`) ?? null;
        const cap = (c ? contractedMinutesForDay(String(a.check_in_at), c) : null) ?? DEFAULT_SHIFT_MIN;
        const outIso = new Date(new Date(a.check_in_at).getTime() + cap * 60000).toISOString();
        const { error } = await admin
          .from('attendances')
          .update({ check_out_at: outIso, memo: '자동마감(퇴근 미체크)' })
          .eq('id', a.id);
        if (!error) {
          autoClosed += 1;
          closedByStore.set(a.store_id, (closedByStore.get(a.store_id) ?? 0) + 1);
        }
      }
    }
  } catch (e) {
    console.error('[cron/daily-alerts] auto-close', e);
  }

  // 여기부터는 푸시 알림 — VAPID 미설정 시 건너뜀
  if (!pushEnabled()) {
    return NextResponse.json({ ok: true, autoClosed, skipped: 'VAPID 미설정' });
  }

  // 1.5) 자동마감 알림 (해당 매장 사장님께)
  let autoCloseNotified = 0;
  for (const [storeId, n] of closedByStore) {
    try {
      const { data: st } = await admin.from('stores').select('owner_id, name').eq('id', storeId).maybeSingle();
      if (st?.owner_id) {
        await sendPushToUser(st.owner_id, {
          title: '퇴근 미체크 자동마감',
          body: `${st.name} · ${n}건이 퇴근 미체크로 계약시간 기준 자동마감됐어요. 확인해주세요.`,
          url: '/attendance',
          tag: 'rm-auto-close',
        });
        autoCloseNotified += 1;
      }
    } catch (e) {
      console.error('[cron/daily-alerts] auto-close notify', e);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2) 매출 마감 리마인더
  // ─────────────────────────────────────────────────────────────
  const { data: subs } = await admin.from('push_subscriptions').select('user_id').limit(2000);
  const subUserIds = Array.from(new Set((subs ?? []).map((s) => s.user_id as string)));

  let notified = 0;
  for (const uid of subUserIds) {
    try {
      const { data: prefs } = await admin
        .from('user_notification_prefs')
        .select('expense_alert, attendance_alert, notice_alert, important_alert')
        .eq('user_id', uid)
        .maybeSingle();
      if (prefs && !prefs.expense_alert && !prefs.attendance_alert && !prefs.notice_alert && !prefs.important_alert) continue;

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

  return NextResponse.json({ ok: true, autoClosed, autoCloseNotified, notified, candidates: subUserIds.length });
}
