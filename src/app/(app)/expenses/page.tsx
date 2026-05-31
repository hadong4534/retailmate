import Link from 'next/link';
import { Tags, PieChart, TrendingUp, Trophy, Package, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPageContext } from '@/lib/auth/page-context';
import { Button } from '@/components/ui/Button';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { PageHeader } from '@/components/app';
import { formatWon, getMonthRange, currentYearMonth, todayInKST } from '@/lib/utils';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LUCIDE,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_COLOR,
  type ExpenseCategory,
} from '@/lib/constants';
import { ChannelDonut } from '@/components/charts/ChannelDonut';
import { WeekBarChart } from '@/components/charts/WeekBarChart';
import { PageInsight } from '@/components/insights/PageInsight';
import { generateExpenseInsight } from '@/lib/insights/expenses';
import { DeleteExpenseButton } from './DeleteExpenseButton';

interface ExpenseRow {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string | null;
  memo: string | null;
  item_name: string | null;
  payment_method: string | null;
  created_at: string;
}

export const metadata = {
  title: '비용 · 리테일메이트',
};

const TOP_CATEGORIES: ExpenseCategory[] = ['material', 'labor', 'rent', 'utility'];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentYearMonth();
  const { start, end } = getMonthRange(month);

  const [yStr, mStr] = month.split('-').map(Number);
  const prevDate = new Date(yStr, mStr - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const { start: prevStart, end: prevEnd } = getMonthRange(prevMonth);

  const supabase = await createClient();
  const ctx = await getPageContext(supabase);
  if (!ctx) return null;
  const store = { id: ctx.adminStore.storeId };

  const [{ data: expensesData }, { data: prevData }, { data: salesData }] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, expense_date, category, amount, vendor, memo, item_name, payment_method, created_at')
      .eq('store_id', store.id)
      .gte('expense_date', start)
      .lte('expense_date', end)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('amount')
      .eq('store_id', store.id)
      .gte('expense_date', prevStart)
      .lte('expense_date', prevEnd),
    supabase
      .from('sales')
      .select('amount')
      .eq('store_id', store.id)
      .gte('sale_date', start)
      .lte('sale_date', end),
  ]);

  const rows = (expensesData ?? []) as ExpenseRow[];
  const prevMonthExpenses = (prevData ?? []).reduce((acc, r) => acc + Number(r.amount), 0);
  const monthSales = (salesData ?? []).reduce((acc, r) => acc + Number(r.amount), 0);

  const grandTotal = rows.reduce((acc, r) => acc + Number(r.amount), 0);

  const categoryTotals: Record<ExpenseCategory, number> = {
    material: 0, labor: 0, rent: 0, utility: 0,
    communication: 0, marketing: 0, tax: 0, etc: 0,
  };
  rows.forEach((r) => { categoryTotals[r.category] += Number(r.amount); });

  // 도넛 데이터 (0이 아닌 카테고리만)
  const donutData = EXPENSE_CATEGORIES
    .filter((c) => categoryTotals[c] > 0)
    .map((c) => ({
      name: EXPENSE_CATEGORY_LABEL[c],
      value: categoryTotals[c],
      color: EXPENSE_CATEGORY_COLOR[c],
    }));

  // 주간 추이: 월 내 5주 또는 마지막 5주
  const weekBuckets: { label: string; value: number; rangeStart: number; rangeEnd: number; current: boolean }[] = [];
  const [yy, mm] = month.split('-').map(Number);
  const lastDay = new Date(yy, mm, 0).getDate();
  const todayStr = todayInKST();
  for (let weekStart = 1; weekStart <= lastDay; weekStart += 7) {
    const weekEnd = Math.min(weekStart + 6, lastDay);
    const startDate = `${month}-${String(weekStart).padStart(2, '0')}`;
    const endDate = `${month}-${String(weekEnd).padStart(2, '0')}`;
    const value = rows
      .filter((r) => r.expense_date >= startDate && r.expense_date <= endDate)
      .reduce((acc, r) => acc + Number(r.amount), 0);
    const isCurrent = startDate <= todayStr && todayStr <= endDate;
    weekBuckets.push({
      label: `${weekStart}~${weekEnd}일`,
      value,
      rangeStart: weekStart,
      rangeEnd: weekEnd,
      current: isCurrent,
    });
  }

  // KPI
  const expenseRatio = monthSales > 0 ? (grandTotal / monthSales) * 100 : 0;
  const monthDelta = prevMonthExpenses > 0
    ? ((grandTotal - prevMonthExpenses) / prevMonthExpenses) * 100
    : null;
  const topCatEntry = EXPENSE_CATEGORIES
    .map((c) => ({ category: c, amount: categoryTotals[c] }))
    .sort((a, b) => b.amount - a.amount)[0];
  const topCategory = topCatEntry && topCatEntry.amount > 0
    ? { category: topCatEntry.category, amount: topCatEntry.amount, label: EXPENSE_CATEGORY_LABEL[topCatEntry.category] }
    : null;

  const insight = generateExpenseInsight({
    monthExpenses: grandTotal,
    prevMonthExpenses,
    monthSales,
    categoryTotals,
    topCategory,
  });

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        {/* 헤더 */}
        <PageHeader
          Icon={Tags}
          tone="red"
          title="비용"
          description="매장 비용 내역을 확인하고 관리하세요."
          right={
            <div className="flex flex-wrap items-center gap-2">
              <MonthPicker value={month} />
              <Link href="/expenses/new">
                <Button size="sm">+ 비용 입력</Button>
              </Link>
            </div>
          }
          className="mb-5"
        />

        {/* 합계 + 우측 KPI 3개 */}
        <div className="rm-stagger grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#EAECF5] bg-white p-5 lg:col-span-2 lg:p-6">
            <p className="text-[12px] text-slate-500">{month} 합계</p>
            <p className="mt-1 text-[28px] font-extrabold tabular-nums text-slate-900 lg:text-4xl">
              {formatWon(grandTotal)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TOP_CATEGORIES.map((c) => {
                const CatIcon = EXPENSE_CATEGORY_LUCIDE[c];
                return (
                  <div key={c} className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <CatIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                      <span>{EXPENSE_CATEGORY_LABEL[c]}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                      {formatWon(categoryTotals[c])}
                    </p>
                  </div>
                );
              })}
              <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Package className="h-3.5 w-3.5" strokeWidth={2.2} />
                  <span>기타비용</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                  {formatWon(
                    categoryTotals.communication + categoryTotals.marketing +
                    categoryTotals.tax + categoryTotals.etc
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <KpiSmall
              Icon={PieChart}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
              label="비용률"
              value={`${expenseRatio.toFixed(1)}%`}
              sub={monthSales > 0 ? `매출 대비` : '매출 입력 필요'}
            />
            <KpiSmall
              Icon={TrendingUp}
              iconBg="bg-violet-100"
              iconColor="text-violet-600"
              label="전월 대비"
              value={monthDelta != null ? `${monthDelta > 0 ? '+' : ''}${monthDelta.toFixed(1)}%` : '-'}
              sub={
                monthDelta != null && prevMonthExpenses > 0
                  ? `${formatWon(grandTotal - prevMonthExpenses)}`
                  : '전월 데이터 없음'
              }
              tone={monthDelta != null && monthDelta > 0 ? 'red' : 'emerald'}
            />
            <KpiSmall
              Icon={Trophy}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              label="가장 큰 지출 항목"
              value={topCategory?.label ?? '-'}
              sub={topCategory ? `${formatWon(topCategory.amount)} (${((topCategory.amount / grandTotal) * 100).toFixed(1)}%)` : '데이터 없음'}
            />
          </div>
        </div>

        {grandTotal === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#E3E5F0] bg-white px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Receipt className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <p className="mt-3 text-[15px] font-medium text-slate-900">이번 달 비용 기록이 없습니다</p>
            <p className="mt-1 text-[12px] text-slate-500">매출 대비 정확한 영업이익을 보려면 비용도 함께 입력해주세요.</p>
            <Link href="/expenses/new" className="mt-4 inline-block">
              <Button size="sm">+ 비용 입력</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-[#EAECF5] bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">비용 카테고리 비중</h2>
                <div className="mt-3">
                  <ChannelDonut
                    data={donutData}
                    centerLabel="합계"
                    centerValue={formatWon(grandTotal)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#EAECF5] bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">주간 비용 추이</h2>
                <p className="mt-0.5 text-xs text-slate-400">{month} 5주차</p>
                <div className="mt-3">
                  <WeekBarChart data={weekBuckets} valueLabel="비용" height={240} />
                </div>
              </div>

              <PageInsight title={insight.title} body={insight.body} tip={insight.tip} />
            </div>

            {/* 최근 비용 내역 — 모바일 카드 / PC 테이블 */}
            <section className="mt-6 rounded-2xl border border-[#EAECF5] bg-white">
              <h2 className="border-b border-[#EAECF5] px-5 py-3 text-sm font-semibold text-slate-900">
                최근 비용 내역
              </h2>

              {/* 모바일 카드 리스트 (lg 미만) — 날짜/항목/카테고리/금액/삭제만 노출 */}
              <ul className="divide-y divide-slate-100 lg:hidden">
                {rows.map((r) => {
                  const cat = r.category;
                  const CatIcon = EXPENSE_CATEGORY_LUCIDE[cat];
                  const desc = [r.vendor, r.memo].filter(Boolean).join(' · ');
                  return (
                    <li key={r.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: EXPENSE_CATEGORY_COLOR[cat] + '20',
                                color: EXPENSE_CATEGORY_COLOR[cat],
                              }}
                            >
                              <CatIcon className="h-3 w-3" strokeWidth={2.4} />
                              {EXPENSE_CATEGORY_LABEL[cat]}
                            </span>
                            <span className="text-[12px] text-slate-500">{r.expense_date}</span>
                          </div>
                          <p className="mt-1 truncate text-[14px] font-semibold text-slate-900">
                            {r.item_name ?? '-'}
                          </p>
                          {desc && (
                            <p className="mt-0.5 truncate text-[12px] text-slate-500">{desc}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <p className="rm-tnum text-[15px] font-bold text-slate-900">
                            {formatWon(Number(r.amount))}
                          </p>
                          <DeleteExpenseButton id={r.id} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* PC 테이블 (lg+) — 기존 7컬럼 유지 */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">날짜</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">항목</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">카테고리</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">설명</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">금액</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">결제수단</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => {
                      const cat = r.category;
                      const CatIcon = EXPENSE_CATEGORY_LUCIDE[cat];
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                            {r.expense_date}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-900 max-w-[180px] truncate">
                            {r.item_name ?? '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: EXPENSE_CATEGORY_COLOR[cat] + '20',
                                color: EXPENSE_CATEGORY_COLOR[cat],
                              }}
                            >
                              <CatIcon className="h-3 w-3" strokeWidth={2.4} />
                              {EXPENSE_CATEGORY_LABEL[cat]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap max-w-xs truncate px-4 py-3 text-slate-600">
                            {[r.vendor, r.memo].filter(Boolean).join(' · ') || '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                            {formatWon(Number(r.amount))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {r.payment_method ?? '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <DeleteExpenseButton id={r.id} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function KpiSmall({
  Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  tone,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  tone?: 'red' | 'emerald';
}) {
  const valueColor = tone === 'red' ? 'text-red-500' : tone === 'emerald' ? 'text-emerald-600' : 'text-slate-900';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#EAECF5] bg-white p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className={`mt-0.5 text-base font-bold tabular-nums ${valueColor}`}>{value}</p>
        <p className="text-[10px] text-slate-400">{sub}</p>
      </div>
    </div>
  );
}
