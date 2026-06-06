/**
 * 근무시간 세부 옵션(work_schedule) 표시 헬퍼.
 *
 * labor_contracts.work_schedule(jsonb)이 null이면 기존 동일시간 모드
 * (work_days + work_start_time~work_end_time)로 표기한다.
 * 서명 화면(SignFlow)·계약서 본문(template.ts)·작성 미리보기가 공용 사용.
 */

import type { WorkSchedule } from '@/types/database';

const DAY_KO: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const hhmm = (t: string) => t.slice(0, 5);

export interface ScheduleSource {
  work_schedule?: WorkSchedule | null;
  work_days: string[];
  work_start_time: string;
  work_end_time: string;
  break_minutes: number;
}

/** 근무 요일 표기 — per_day는 시간이 설정된 요일 기준 */
export function scheduleDaysText(c: ScheduleSource): string {
  const ws = c.work_schedule;
  if (ws?.mode === 'per_day' && ws.per_day) {
    const days = DAY_ORDER.filter((d) => ws.per_day![d]);
    if (days.length > 0) return days.map((d) => DAY_KO[d]).join(', ');
  }
  if (ws?.mode === 'weekly_hours') {
    const days = DAY_ORDER.filter((d) => c.work_days.includes(d)).map((d) => DAY_KO[d]).join(', ');
    return days ? `${days} (주 단위 운영)` : '주 단위 운영 (요일 협의)';
  }
  return DAY_ORDER.filter((d) => c.work_days.includes(d)).map((d) => DAY_KO[d]).join(', ');
}

/** 근무 시간 표기 — 모드별 요약 한 줄 */
export function scheduleTimeText(c: ScheduleSource): string {
  const ws = c.work_schedule;
  if (ws?.mode === 'per_day' && ws.per_day) {
    const parts = DAY_ORDER.filter((d) => ws.per_day![d]).map(
      (d) => `${DAY_KO[d]} ${hhmm(ws.per_day![d].start)}~${hhmm(ws.per_day![d].end)}`,
    );
    if (parts.length > 0) return `${parts.join(', ')} (휴게 ${c.break_minutes}분)`;
  }
  if (ws?.mode === 'daily_hours' && ws.daily_hours) {
    return `1일 ${ws.daily_hours}시간 (구체적 시간은 매장 스케줄에 따름 · 휴게 ${c.break_minutes}분)`;
  }
  if (ws?.mode === 'weekly_hours' && ws.weekly_hours) {
    return `주 ${ws.weekly_hours}시간 (구체적 시간은 매장 스케줄에 따름 · 휴게 ${c.break_minutes}분)`;
  }
  return `${hhmm(c.work_start_time)} ~ ${hhmm(c.work_end_time)} (휴게 ${c.break_minutes}분)`;
}

/** 주 소정근로시간(시간) — 단시간 별표·주휴 판단 참고용. 계산 불가 시 null */
export function scheduleWeeklyHours(c: ScheduleSource): number | null {
  const ws = c.work_schedule;
  const span = (s: string, e: string) => {
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    let m = eh * 60 + em - (sh * 60 + sm);
    if (m < 0) m += 24 * 60; // 야간 교대(자정 넘김)
    return m;
  };
  if (ws?.mode === 'per_day' && ws.per_day) {
    const days = DAY_ORDER.filter((d) => ws.per_day![d]);
    if (days.length === 0) return null;
    const total = days.reduce(
      (acc, d) => acc + Math.max(0, span(ws.per_day![d].start, ws.per_day![d].end) - c.break_minutes),
      0,
    );
    return total / 60;
  }
  if (ws?.mode === 'daily_hours' && ws.daily_hours) return ws.daily_hours * c.work_days.length;
  if (ws?.mode === 'weekly_hours' && ws.weekly_hours) return ws.weekly_hours;
  if (!c.work_start_time || !c.work_end_time) return null;
  const per = Math.max(0, span(c.work_start_time, c.work_end_time) - c.break_minutes);
  return (per * c.work_days.length) / 60;
}
