import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { HomeView } from './HomeView';

export const metadata = {
  title: '홈 · 리테일메이트',
};

/**
 * 홈 — "매장 운영 대시보드" (2026-05 개편 v3).
 *
 * v3 사양 핵심:
 *  - 홈은 "입력 대기 화면"이 아니라 "매장 운영 대시보드". 월간 매출/지출/이익이 메인.
 *  - 어제 마감은 보조 영역(상단에서 밀어냄).
 *  - AI 한 줄 진단은 최상단 고정.
 *
 * 데이터 모델:
 *  - 월간: 이번 달 누적 매출/지출 + 전월 매출(전월 대비 변화율)
 *  - 어제: 마감 카드용 매출/지출
 *  - 비교: 그제 매출, 지난 같은 요일, 최근 7일 평균
 *
 * 모든 일자는 KST 기준 (UTC 처리 시 자정~09시 구간에서 +1일 어긋남).
 */
function ymdInKST(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function getKstYmd(d: Date): { y: number; m: number; day: number } {
  const [y, m, day] = ymdInKST(d).split('-').map(Number);
  return { y, m, day };
}

function shiftDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as { sub?: string } | undefined;
  if (!claims?.sub) return null;
  const userId = claims.sub;

  const adminStore = await getCurrentAdminStore(supabase, userId);
  if (!adminStore) return null;
  const storeId = adminStore.storeId;

  // ── 선택 월 계산 (KST) — ?month=YYYY-MM 으로 지난달 보기/비교 지원 ──────────────
  const sp = await searchParams;
  const now = new Date();
  const kst = getKstYmd(now);
  let selY = kst.y;
  let selM = kst.m;
  const mp = typeof sp?.month === 'string' ? sp.month : undefined;
  if (mp && /^\d{4}-\d{2}$/.test(mp)) {
    const [yy, mm] = mp.split('-').map(Number);
    const isFuture = yy > kst.y || (yy === kst.y && mm > kst.m);
    if (yy >= 2000 && mm >= 1 && mm <= 12 && !isFuture) { selY = yy; selM = mm; }
  }
  const isCurrentMonth = selY === kst.y && selM === kst.m;

  const monthStartStr = `${selY}-${String(selM).padStart(2, '0')}-01`;
  const monthEndStr = ymdInKST(new Date(selY, selM, 0));   // 선택 월 말일
  const daysInMonth = new Date(selY, selM, 0).getDate();
  const daysIntoMonth = isCurrentMonth ? kst.day : daysInMonth;

  // 선택 월의 직전 월(전월 대비 비교용)
  const prevY = selM === 1 ? selY - 1 : selY;
  const prevM = selM === 1 ? 12 : selM - 1;
  const prevMonthStartStr = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
  const prevMonthEndStr = ymdInKST(new Date(selY, selM - 1, 0));

  // 월 이동 네비게이션 링크
  const monthLabel = `${selM}월`;
  const prevHref = `/dashboard?month=${prevY}-${String(prevM).padStart(2, '0')}`;
  const nY = selM === 12 ? selY + 1 : selY;
  const nM = selM === 12 ? 1 : selM + 1;
  const nextIsFuture = nY > kst.y || (nY === kst.y && nM > kst.m);
  const nextHref = nextIsFuture ? null : (nY === kst.y && nM === kst.m ? '/dashboard' : `/dashboard?month=${nY}-${String(nM).padStart(2, '0')}`);

  const baseDate = shiftDays(now, -1);                              // 어제
  const baseDateStr = ymdInKST(baseDate);
  const prevDateStr = ymdInKST(shiftDays(now, -2));                 // 그제
  const lastSameWeekdayStr = ymdInKST(shiftDays(now, -8));          // 지난 같은 요일
  const window7StartStr = ymdInKST(shiftDays(now, -8));             // 어제 이전 7일 시작

  // ── 단일 라운드트립으로 모든 쿼리 묶음 ──────────────────────────────────────
  const [
    storeRes,
    monthSalesRes, monthExpensesRes, prevMonthSalesRes,
    baseSalesRes, baseExpensesRes, prevSalesRes,
    pastWeekSalesRes,
    workingRes, employeeCountRes,
  ] = await Promise.all([
    supabase.from('stores').select('name, monthly_target').eq('id', storeId).maybeSingle(),
    // 월간 집계
    supabase.from('sales').select('sale_date, amount').eq('store_id', storeId).gte('sale_date', monthStartStr).lte('sale_date', monthEndStr),
    supabase.from('expenses').select('amount').eq('store_id', storeId).gte('expense_date', monthStartStr).lte('expense_date', monthEndStr),
    supabase.from('sales').select('amount').eq('store_id', storeId)
      .gte('sale_date', prevMonthStartStr).lte('sale_date', prevMonthEndStr),
    // 어제 (마감 카드용)
    supabase.from('sales').select('amount').eq('store_id', storeId).eq('sale_date', baseDateStr),
    supabase.from('expenses').select('amount').eq('store_id', storeId).eq('expense_date', baseDateStr),
    supabase.from('sales').select('amount').eq('store_id', storeId).eq('sale_date', prevDateStr),
    // baseline (어제 이전 7일)
    supabase.from('sales').select('sale_date, amount').eq('store_id', storeId)
      .gte('sale_date', window7StartStr).lt('sale_date', baseDateStr),
    supabase.from('attendances').select('id').eq('store_id', storeId).is('check_out_at', null),
    supabase.from('store_members').select('id', { count: 'exact', head: true })
      .eq('store_id', storeId).neq('role', 'owner').eq('is_active', true),
  ]);

  const store = storeRes.data;
  if (!store) return null;

  const sum = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

  // ── 월간 집계 + 매출 입력 일수 (일평균 매출 계산용) ─────────────────────────
  const monthSalesRows = monthSalesRes.data ?? [];
  const monthSales = monthSalesRows.reduce((a, r) => a + Number(r.amount ?? 0), 0);
  // 매출이 입력된 고유 날짜 수 (0원 일자 제외 → "일평균"의 노이즈를 줄임).
  const monthSalesEntryDays = new Set(monthSalesRows.map((r) => r.sale_date as string)).size;
  const monthExpenses = sum(monthExpensesRes.data);
  const prevMonthSales = sum(prevMonthSalesRes.data);

  // ── 어제/그제 ────────────────────────────────────────────────────────────────
  const baseSales = sum(baseSalesRes.data);
  const baseExpenses = sum(baseExpensesRes.data);
  const prevSales = sum(prevSalesRes.data);

  // ── baseline (지난 같은 요일 / 최근 7일 평균) ───────────────────────────────
  const pastByDate = new Map<string, number>();
  (pastWeekSalesRes.data ?? []).forEach((r) => {
    const d = r.sale_date as string;
    pastByDate.set(d, (pastByDate.get(d) ?? 0) + Number(r.amount));
  });
  const lastSameWeekdaySales: number | null = pastByDate.has(lastSameWeekdayStr)
    ? pastByDate.get(lastSameWeekdayStr) ?? null
    : null;
  const pastValues = Array.from(pastByDate.values()).filter((v) => v > 0);
  const recent7DayAvgSales: number | null = pastValues.length > 0
    ? Math.round(pastValues.reduce((a, b) => a + b, 0) / pastValues.length)
    : null;

  // ── 일별 매출 시계열 (차트용) ───────────────────────────────────────────────
  const dailyMap = new Map<number, number>();
  monthSalesRows.forEach((r) => {
    const dd = parseInt(String(r.sale_date).slice(8, 10), 10);
    if (!Number.isNaN(dd)) dailyMap.set(dd, (dailyMap.get(dd) ?? 0) + Number(r.amount ?? 0));
  });
  const dailySeries = Array.from(dailyMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, sales]) => ({ day, sales }));

  return (
    <HomeView
      baseDate={baseDate}
      // 월간
      monthSales={monthSales}
      monthExpenses={monthExpenses}
      prevMonthSales={prevMonthSales}
      monthSalesEntryDays={monthSalesEntryDays}
      monthlyTarget={Number(store.monthly_target ?? 0)}
      daysInMonth={daysInMonth}
      daysIntoMonth={daysIntoMonth}
      // 어제
      baseSales={baseSales}
      baseExpenses={baseExpenses}
      prevSales={prevSales}
      lastSameWeekdaySales={lastSameWeekdaySales}
      recent7DayAvgSales={recent7DayAvgSales}
      // 직원/출근
      workingCount={workingRes.data?.length ?? 0}
      totalEmployees={employeeCountRes.count ?? 0}
      dailySeries={dailySeries}
      monthLabel={monthLabel}
      isCurrentMonth={isCurrentMonth}
      prevHref={prevHref}
      nextHref={nextHref}
    />
  );
}
