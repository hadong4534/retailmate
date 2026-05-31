import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPageContext } from '@/lib/auth/page-context';
import { Button } from '@/components/ui/Button';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { PageHeader } from '@/components/app';
import { EmptyReceipt } from '@/components/app/EmptyIllustration';
import { formatWon, getMonthRange, currentYearMonth, todayInKST } from '@/lib/utils';
import {
  SALE_CHANNELS,
  SALE_CHANNEL_LABEL,
  SALE_CHANNEL_COLOR,
  type SaleChannel,
} from '@/lib/constants';
import { generateSalesInsight } from '@/lib/insights/sales';
import { SalesViews, type SaleRow } from './SalesViews';

export const metadata = {
  title: '매출 · 리테일메이트',
};

function emptyChannelMap(): Record<SaleChannel, number> {
  return SALE_CHANNELS.reduce(
    (acc, c) => ({ ...acc, [c]: 0 }),
    {} as Record<SaleChannel, number>,
  );
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentYearMonth();
  const { start, end } = getMonthRange(month);

  // 전월 범위
  const [yStr, mStr] = month.split('-').map(Number);
  const prevDate = new Date(yStr, mStr - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const { start: prevStart, end: prevEnd } = getMonthRange(prevMonth);

  // 지난 6개월 범위 (월별 추이용)
  const sixMonthsAgo = new Date(yStr, mStr - 6, 1);
  const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

  const supabase = await createClient();
  const ctx = await getPageContext(supabase);
  if (!ctx) return null;
  const store = { id: ctx.adminStore.storeId };

  const [{ data: rowsData }, { data: prevData }, { data: sixMonthsData }] = await Promise.all([
    supabase
      .from('sales')
      .select('id, sale_date, channel, amount, memo')
      .eq('store_id', store.id)
      .gte('sale_date', start)
      .lte('sale_date', end)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('sales')
      .select('amount')
      .eq('store_id', store.id)
      .gte('sale_date', prevStart)
      .lte('sale_date', prevEnd),
    supabase
      .from('sales')
      .select('sale_date, channel, amount')
      .eq('store_id', store.id)
      .gte('sale_date', sixMonthsAgoStr)
      .lte('sale_date', end),
  ]);

  const rows = (rowsData ?? []) as SaleRow[];
  const prevMonthSales = (prevData ?? []).reduce((acc, r) => acc + Number(r.amount), 0);

  const totals: Record<SaleChannel, number> = emptyChannelMap();
  rows.forEach((r) => { totals[r.channel] += Number(r.amount); });
  const grandTotal = SALE_CHANNELS.reduce((acc, c) => acc + totals[c], 0);

  // 일자별 그룹핑 + 전일 대비 계산
  const byDate = new Map<string, SaleRow[]>();
  rows.forEach((r) => {
    const list = byDate.get(r.sale_date) ?? [];
    list.push(r);
    byDate.set(r.sale_date, list);
  });
  const dailyEntries = Array.from(byDate.entries())
    .map(([date, items]) => {
      const dayTotal = items.reduce((acc, r) => acc + Number(r.amount), 0);
      const channelDay: Record<SaleChannel, number> = emptyChannelMap();
      items.forEach((r) => { channelDay[r.channel] += Number(r.amount); });
      return { date, items, dayTotal, channelDay };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // 전일 대비 — 날짜 오름차순으로 계산
  const ascending = [...dailyEntries].sort((a, b) => a.date.localeCompare(b.date));
  const deltaByDate = new Map<string, number | null>();
  ascending.forEach((entry, idx) => {
    if (idx === 0) {
      deltaByDate.set(entry.date, null);
    } else {
      const prev = ascending[idx - 1].dayTotal;
      deltaByDate.set(entry.date, prev > 0 ? Math.round(((entry.dayTotal - prev) / prev) * 100) : null);
    }
  });

  // KPI: 일평균 / 최고 매출일 / 카드 비중
  const daysWithSales = dailyEntries.length;
  const dailyAverage = daysWithSales > 0 ? Math.round(grandTotal / daysWithSales) : 0;
  const bestDay = dailyEntries.length > 0
    ? dailyEntries.reduce((max, cur) => (cur.dayTotal > max.dayTotal ? cur : max))
    : null;
  const cardPct = grandTotal > 0 ? (totals.card / grandTotal) * 100 : 0;
  const monthDelta = prevMonthSales > 0
    ? Math.round(((grandTotal - prevMonthSales) / prevMonthSales) * 100)
    : null;

  // 일별 매출 추이 (월 전체, 빈 날 0, 미래 날짜는 null로 plot 제외)
  const [yy, mm] = month.split('-').map(Number);
  const lastDay = new Date(yy, mm, 0).getDate();
  const todayStr = todayInKST();
  const trendData: { label: string; value: number | null; date: string }[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const entry = dailyEntries.find((e) => e.date === dateStr);
    const isFuture = dateStr > todayStr;
    trendData.push({
      label: `${d}일`,
      value: isFuture ? null : entry?.dayTotal ?? 0,
      date: dateStr,
    });
  }

  // 월별 추이 (지난 6개월)
  const sixMonthsRows = (sixMonthsData ?? []) as { sale_date: string; channel: SaleChannel; amount: number }[];
  const monthlyMap = new Map<string, { total: number; channels: Record<SaleChannel, number> }>();
  sixMonthsRows.forEach((r) => {
    const ym = r.sale_date.slice(0, 7);
    let cur = monthlyMap.get(ym);
    if (!cur) {
      cur = { total: 0, channels: emptyChannelMap() };
      monthlyMap.set(ym, cur);
    }
    cur.total += Number(r.amount);
    cur.channels[r.channel] += Number(r.amount);
  });
  const monthlyEntries: { month: string; total: number; channels: Record<SaleChannel, number> }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(yStr, mStr - 1 - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = monthlyMap.get(ym) ?? { total: 0, channels: emptyChannelMap() };
    monthlyEntries.push({ month: ym, total: cur.total, channels: cur.channels });
  }
  const monthlyTrend = monthlyEntries.map((e) => ({
    label: `${Number(e.month.slice(5))}월`,
    value: e.total,
    date: e.month,
  }));

  const donutData = SALE_CHANNELS
    .filter((c) => totals[c] > 0)
    .map((c) => ({
      name: SALE_CHANNEL_LABEL[c],
      value: totals[c],
      color: SALE_CHANNEL_COLOR[c],
    }));

  const insight = generateSalesInsight({
    monthSales: grandTotal,
    prevMonthSales,
    channelTotals: totals,
    bestDay: bestDay ? { date: bestDay.date, amount: bestDay.dayTotal } : null,
    dailyAverage,
  });

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        {/* 헤더 */}
        <PageHeader
          Icon={Receipt}
          tone="blue"
          title="매출"
          description="일별·월별·결제수단별 매출을 확인하세요."
          right={
            <div className="flex flex-wrap items-center gap-2">
              <MonthPicker value={month} />
              <Link href="/sales/new">
                <Button size="sm">+ 매출 입력</Button>
              </Link>
            </div>
          }
          className="mb-5"
        />

        {/* 합계 + 우측 KPI 3개 */}
        <div className="rm-stagger grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2 lg:p-6">
            <p className="text-[12px] text-slate-500">{month} 합계</p>
            <p className="mt-1 text-[28px] font-extrabold tabular-nums text-indigo-600 lg:text-4xl">
              {formatWon(grandTotal)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {SALE_CHANNELS.map((c) => (
                <div key={c} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] text-slate-500">{SALE_CHANNEL_LABEL[c]}</p>
                  <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-slate-900">
                    {formatWon(totals[c])}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* KPI — 모바일에서는 inline row 형태로 */}
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
            <KpiSmall
              label="일평균 매출"
              value={formatWon(dailyAverage)}
              delta={monthDelta != null ? { value: monthDelta, suffix: '전월' } : null}
            />
            <KpiSmall
              label="최고 매출일"
              value={bestDay ? `${new Date(bestDay.date).getMonth() + 1}/${new Date(bestDay.date).getDate()}` : '-'}
              sub={bestDay ? formatWon(bestDay.dayTotal) : '데이터 없음'}
            />
            <KpiSmall
              label="카드 비중"
              value={`${cardPct.toFixed(1)}%`}
              sub={`카드 ${formatWon(totals.card)}`}
            />
          </div>
        </div>

        {grandTotal === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <EmptyReceipt className="text-slate-400" />
            <p className="mt-3 text-[15px] font-medium text-slate-900">
              이번 달 매출 기록이 없습니다
            </p>
            <p className="mt-1 text-[12px] text-slate-500">
              + 매출 입력 버튼으로 첫 매출을 기록해보세요.
            </p>
            <Link href="/sales/new" className="mt-4 inline-block">
              <Button size="sm">+ 매출 입력</Button>
            </Link>
          </div>
        ) : (
          // view 전환은 client state 기반 (SalesViews 내부 useState). SSR 새로고침 없음.
          <SalesViews
            totals={totals}
            grandTotal={grandTotal}
            trendData={trendData}
            dailyEntries={dailyEntries}
            deltaByDate={Object.fromEntries(deltaByDate)}
            insight={insight}
            monthlyEntries={monthlyEntries}
            monthlyTrend={monthlyTrend}
            currentMonth={month}
            donutData={donutData}
          />
        )}
      </div>
    </div>
  );
}

function KpiSmall({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: { value: number; suffix: string } | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 lg:p-4">
      <p className="text-[11px] text-slate-500">{label}</p>
      {/*
        모바일 3-column에서 카드가 좁아 긴 금액이 ...로 잘리지 않도록:
        - truncate 제거 + 모바일 12px / PC 16px 폰트
        - whitespace-nowrap으로 줄바꿈 방지
        - 컨테이너가 자연스럽게 fit (text-overflow 없음)
      */}
      <p className="mt-0.5 whitespace-nowrap text-[12px] font-bold tabular-nums text-slate-900 lg:text-base">
        {value}
      </p>
      {sub && (
        <p className="whitespace-nowrap text-[10px] text-slate-400">{sub}</p>
      )}
      {delta && (
        <p className={
          'whitespace-nowrap text-[10px] font-medium ' +
          (delta.value > 0 ? 'text-emerald-600' : delta.value < 0 ? 'text-red-500' : 'text-slate-500')
        }>
          {delta.value > 0 ? '▲' : delta.value < 0 ? '▼' : '–'} {Math.abs(delta.value)}% {delta.suffix}
        </p>
      )}
    </div>
  );
}
