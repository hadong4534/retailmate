/**
 * 급여 인정 근무시간(분) 계산.
 *
 * 1) 계약 시작시간보다 일찍 출근 체크한 '자발적 조기출근'분은 절사(무급).
 * 2) 계약서상 1일 근무시간을 '자동 상한'으로 적용 — 퇴근 미체크/늦은 퇴근으로
 *    근무시간이 비정상적으로 부풀어 과지급되는 것을 원천 차단한다.
 *    (정당한 연장근무는 별도 '연장근무 승인'분으로 가산 — 본 모듈 범위 밖)
 *
 * - per_day(요일별): 해당 KST 요일의 시작·종료시각 기준.
 * - 일 N시간 / 주 N시간 계약: 일/주 한도로 상한.
 * - 계약 기준이 없는 날(대타 등)은 상한 없이 실근무 인정.
 */

export interface ScheduleForPay {
  work_schedule?: {
    mode: string;
    per_day?: Record<string, { start: string; end: string }>;
    daily_hours?: number;
    weekly_hours?: number;
  } | null;
  work_start_time?: string | null; // 'HH:MM' 또는 'HH:MM:SS'
  work_end_time?: string | null;
  break_minutes?: number | null;
  work_days?: string[] | null;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function hhmmToMin(v: string): number {
  const [h, m] = v.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

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

/**
 * 해당 출근 건의 '급여 인정 상한(분)'. 계약서상 1일 근무시간(휴게 제외).
 * 기준을 못 구하면 null(상한 없음 → 실근무 그대로).
 */
export function contractedMinutesForDay(checkInIso: string, s: ScheduleForPay): number | null {
  const ws = s.work_schedule;
  const breakMin = Math.max(0, s.break_minutes ?? 0);
  if (ws) {
    if (ws.mode === 'daily_hours' && ws.daily_hours) return Math.round(ws.daily_hours * 60);
    if (ws.mode === 'weekly_hours' && ws.weekly_hours) {
      const days = s.work_days?.length ?? 0;
      return days > 0 ? Math.round((ws.weekly_hours * 60) / days) : null;
    }
    if (ws.mode === 'per_day' && ws.per_day) {
      const kst = new Date(new Date(checkInIso).getTime() + 9 * 3600 * 1000);
      const wd = DAY_KEYS[kst.getUTCDay()];
      const d = ws.per_day[wd];
      if (d?.start && d?.end) {
        const span = hhmmToMin(d.end) - hhmmToMin(d.start);
        return span > 0 ? Math.max(0, span - breakMin) : null; // 자정 넘는 교대는 상한 미적용
      }
      return null;
    }
  }
  if (s.work_start_time && s.work_end_time) {
    const span = hhmmToMin(String(s.work_end_time)) - hhmmToMin(String(s.work_start_time));
    return span > 0 ? Math.max(0, span - breakMin) : null;
  }
  return null;
}

/**
 * check_in~check_out 구간의 급여 인정 분(分).
 * 조기출근 절사 + 계약시간 자동 상한 적용. 미퇴근이면 0.
 */
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
  let result = Math.max(0, Math.floor((outMs - startMs) / 60000));
  // 계약시간 자동 상한 — 과지급 방지. 정당한 연장은 별도 승인분으로 가산.
  if (schedule) {
    const cap = contractedMinutesForDay(checkInIso, schedule);
    if (cap !== null) result = Math.min(result, cap);
  }
  return result;
}
