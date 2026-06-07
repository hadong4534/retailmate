/**
 * 급여 인정 근무시간(분) 계산.
 *
 * 직원이 계약 시작시간보다 일찍 출근 체크를 해도, 계약 시작 전 구간은
 * 급여·인건비에서 절사한다(자발적 조기 출근 무급). 늦게까지 일한 연장분은 그대로 인정.
 *
 * - per_day(요일별) 계약: 해당 KST 요일의 시작시각 기준. 계약에 없는 요일(대타 등)은 절사 기준이 없어 전액 인정.
 * - 일 N시간 / 주 N시간 계약: 시작시각 개념이 없어 절사하지 않음.
 * - 지각(계약 시작 이후 출근)은 실제 출근시각 그대로 계산.
 */

export interface ScheduleForPay {
  work_schedule?: {
    mode: string;
    per_day?: Record<string, { start: string; end: string }>;
  } | null;
  work_start_time?: string | null; // 'HH:MM' 또는 'HH:MM:SS'
  work_days?: string[] | null;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** 해당 출근 건의 KST 요일 기준 계약 시작시각 'HH:MM'. 기준 없으면 null(절사 안 함). */
function contractStartFor(checkInIso: string, s: ScheduleForPay): string | null {
  const ws = s.work_schedule;
  if (ws && (ws.mode === 'daily_hours' || ws.mode === 'weekly_hours')) return null;
  const kst = new Date(new Date(checkInIso).getTime() + 9 * 3600 * 1000);
  const wd = DAY_KEYS[kst.getUTCDay()];
  if (ws && ws.mode === 'per_day' && ws.per_day) {
    const t = ws.per_day[wd]?.start;
    return t ? t.slice(0, 5) : null;
  }
  return s.work_start_time ? String(s.work_start_time).slice(0, 5) : null;
}

/** check_in~check_out 구간에서 계약 시작 전 조기 출근분을 제외한 인정 분(分). 미퇴근이면 0. */
export function paidMinutes(
  checkInIso: string,
  checkOutIso: string | null,
  schedule: ScheduleForPay | null,
): number {
  if (!checkOutIso) return 0;
  const inMs = new Date(checkInIso).getTime();
  const outMs = new Date(checkOutIso).getTime();
  let startMs = inMs;
  if (schedule) {
    const hhmm = contractStartFor(checkInIso, schedule);
    if (hhmm) {
      const kstDate = new Date(inMs + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const schedMs = new Date(`${kstDate}T${hhmm}:00+09:00`).getTime();
      if (Number.isFinite(schedMs) && schedMs > startMs) startMs = schedMs;
    }
  }
  return Math.max(0, Math.floor((outMs - startMs) / 60000));
}
