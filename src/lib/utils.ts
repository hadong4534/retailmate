import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number | null | undefined): string {
  if (amount == null) return '₩0';
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/**
 * 모바일 친화 금액 표기 — "원" 접미. 한국 사용자에게 자연스럽다.
 * 예: 102,448,200원 / 0원
 * ₩ 기호는 일부 폰트에서 가운데 가로선처럼 보이는 문제가 있어 모바일은 "원"이 안전.
 */
export function formatWon(amount: number | null | undefined): string {
  if (amount == null) return '0원';
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '0';
  return n.toLocaleString('ko-KR');
}

/**
 * 직원 급여 표시 — 채워진 값(월급>일급>시급)에 맞는 라벨·금액 반환. 모두 없으면 '미설정'.
 */
export function memberWageDisplay(m: {
  monthly_wage?: number | null;
  daily_wage?: number | null;
  hourly_wage?: number | null;
}): { label: string; value: string; isSet: boolean } {
  if (m.monthly_wage && m.monthly_wage > 0) return { label: '월급', value: formatWon(m.monthly_wage), isSet: true };
  if (m.daily_wage && m.daily_wage > 0) return { label: '일급', value: formatWon(m.daily_wage), isSet: true };
  if (m.hourly_wage && m.hourly_wage > 0) return { label: '시급', value: formatWon(m.hourly_wage), isSet: true };
  return { label: '시급', value: '미설정', isSet: false };
}

export function parseMoney(input: string): number {
  const digits = input.replace(/[^0-9]/g, '');
  return digits === '' ? 0 : Number(digits);
}

export function formatMoneyInput(value: number | string): string {
  const n = typeof value === 'string' ? parseMoney(value) : value;
  if (!Number.isFinite(n) || n === 0) return '';
  return n.toLocaleString('ko-KR');
}

export function todayInKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** KST 오늘 0시를 UTC ISO로 — '지금 근무 중' 판정 등 당일 필터용. */
export function kstTodayStartIso(): string {
  return new Date(todayInKST() + 'T00:00:00+09:00').toISOString();
}

export function formatTimeKST(d: Date | string): string {
  // 서버(UTC)에서도 항상 한국시간(KST, UTC+9)으로 HH:MM 표시.
  // new Date().getHours()는 서버 로컬(Vercel=UTC) 기준이라 9시간 어긋나는 문제를 막는다.
  const dt = typeof d === 'string' ? new Date(d) : d;
  const kst = new Date(dt.getTime() + 9 * 60 * 60 * 1000);
  return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatKoDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

export function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function currentYearMonth(): string {
  return todayInKST().slice(0, 7);
}

export function distanceInMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
