'use client';

import { useState } from 'react';
import {
  SALE_CHANNELS,
  SALE_CHANNEL_ICON,
  SALE_CHANNEL_LABEL,
  SALE_CHANNEL_COLOR,
  type SaleChannel,
} from '@/lib/constants';
import { ChannelDonut } from '@/components/charts/ChannelDonut';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { PageInsight } from '@/components/insights/PageInsight';
import { formatWon, formatKoDate } from '@/lib/utils';
import { EditDayLink } from './EditDayLink';

/**
 * 매출 탭 — 일별/월별/결제수단별 view 전환을 client state로 처리.
 *
 * 이전엔 ViewTab이 `<Link href="?view=...">` 였어서 매 클릭마다 SSR 전체 새로고침(데이터 재조회).
 * 데이터는 어차피 page.tsx가 한 번에 다 가져오므로, client에서 view state만 바꿔 즉시 전환.
 */

export type SaleRow = {
  id: string;
  sale_date: string;
  channel: SaleChannel;
  amount: number;
  memo: string | null;
};

type ViewMode = 'daily' | 'monthly' | 'channel';

interface Props {
  // 공통
  totals: Record<SaleChannel, number>;
  grandTotal: number;
  // 일별
  trendData: { label: string; value: number | null; date: string }[];
  dailyEntries: {
    date: string;
    items: SaleRow[];
    dayTotal: number;
    channelDay: Record<SaleChannel, number>;
  }[];
  /** 일별 전일대비. Map은 client serialize 안 되므로 plain object로 받음. */
  deltaByDate: Record<string, number | null>;
  insight: { title: string; body: string; tip?: { text: string } };
  // 월별
  monthlyEntries: { month: string; total: number; channels: Record<SaleChannel, number> }[];
  monthlyTrend: { label: string; value: number; date: string }[];
  currentMonth: string;
  // 결제수단별
  donutData: { name: string; value: number; color: string }[];
}

export function SalesViews(p: Props) {
  const [view, setView] = useState<ViewMode>('daily');

  return (
    <>
      {/* 탭: 일별/월별/결제수단별 — client state */}
      <div className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <ViewTabButton label="일별" active={view === 'daily'} onClick={() => setView('daily')} />
        <ViewTabButton label="월별" active={view === 'monthly'} onClick={() => setView('monthly')} />
        <ViewTabButton
          label="결제수단별"
          active={view === 'channel'}
          onClick={() => setView('channel')}
        />
      </div>

      {view === 'daily' && (
        <DailyView
          trendData={p.trendData}
          dailyEntries={p.dailyEntries}
          deltaByDate={p.deltaByDate}
          insight={p.insight}
        />
      )}

      {view === 'monthly' && (
        <MonthlyView
          monthlyEntries={p.monthlyEntries}
          monthlyTrend={p.monthlyTrend}
          currentMonth={p.currentMonth}
        />
      )}

      {view === 'channel' && (
        <ChannelView
          totals={p.totals}
          grandTotal={p.grandTotal}
          donutData={p.donutData}
          dailyEntries={p.dailyEntries}
        />
      )}
    </>
  );
}

function ViewTabButton({
  label, active, onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-lg px-3.5 py-1.5 text-sm font-medium transition ' +
        (active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100')
      }
    >
      {label}
    </button>
  );
}

/* ───────────────────── 일별 뷰 ───────────────────── */
function DailyView({
  trendData,
  dailyEntries,
  deltaByDate,
  insight,
}: {
  trendData: { label: string; value: number | null; date: string }[];
  dailyEntries: {
    date: string;
    items: SaleRow[];
    dayTotal: number;
    channelDay: Record<SaleChannel, number>;
  }[];
  deltaByDate: Record<string, number | null>;
  insight: { title: string; body: string; tip?: { text: string } };
}) {
  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">일별 매출 추이</h2>
          <div className="mt-3">
            <TrendLineChart data={trendData} valueLabel="매출" height={240} />
          </div>
        </div>
        <PageInsight title={insight.title} body={insight.body} tip={insight.tip} />
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
          일별 매출 내역
        </h2>

        {/* 모바일 카드 리스트 */}
        <ul className="divide-y divide-slate-100 lg:hidden">
          {dailyEntries.map((entry) => {
            const delta = deltaByDate[entry.date];
            const channelChips = SALE_CHANNELS
              .filter((c) => entry.channelDay[c] > 0)
              .slice(0, 2)
              .map((c) => `${SALE_CHANNEL_LABEL[c]} ${formatWon(entry.channelDay[c])}`);
            return (
              <li key={entry.date} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-slate-900">{formatKoDate(entry.date)}</p>
                      {delta != null && (
                        <span className={
                          'inline-flex items-center gap-0.5 text-[11px] font-medium ' +
                          (delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400')
                        }>
                          {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(delta)}%
                        </span>
                      )}
                    </div>
                    {channelChips.length > 0 && (
                      <p className="mt-0.5 truncate text-[12px] text-slate-500">
                        {channelChips.join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="rm-tnum text-[15px] font-bold text-blue-600">{formatWon(entry.dayTotal)}</p>
                    <EditDayLink date={entry.date} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* PC 테이블 */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">날짜</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">전일 대비</th>
                {SALE_CHANNELS.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2.5 text-right font-medium">
                    {SALE_CHANNEL_LABEL[c]}
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">총 매출</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyEntries.map((entry) => {
                const delta = deltaByDate[entry.date];
                return (
                  <tr key={entry.date} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {formatKoDate(entry.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {delta == null ? (
                        <span className="text-xs text-slate-400">-</span>
                      ) : (
                        <span className={
                          'inline-flex items-center gap-0.5 text-xs font-medium ' +
                          (delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400')
                        }>
                          {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(delta)}%
                        </span>
                      )}
                    </td>
                    {SALE_CHANNELS.map((c) => (
                      <td key={c} className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums text-slate-700">
                        {entry.channelDay[c] > 0 ? formatWon(entry.channelDay[c]) : <span className="text-slate-300">-</span>}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold tabular-nums text-blue-600">
                      {formatWon(entry.dayTotal)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <EditDayLink date={entry.date} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ───────────────────── 월별 뷰 ───────────────────── */
function MonthlyView({
  monthlyEntries,
  monthlyTrend,
  currentMonth,
}: {
  monthlyEntries: { month: string; total: number; channels: Record<SaleChannel, number> }[];
  monthlyTrend: { label: string; value: number; date: string }[];
  currentMonth: string;
}) {
  return (
    <>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">월별 매출 추이 (최근 6개월)</h2>
        <p className="mt-1 text-xs text-slate-500">
          월간 합계로 시즌성·성장 추세를 파악하세요.
        </p>
        <div className="mt-3">
          <TrendLineChart data={monthlyTrend} valueLabel="월 매출" height={240} />
        </div>
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
          월별 채널 분해
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">월</th>
                {SALE_CHANNELS.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                    {SALE_CHANNEL_LABEL[c]}
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">월 합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyEntries.map((entry) => {
                const isCurrent = entry.month === currentMonth;
                return (
                  <tr
                    key={entry.month}
                    className={isCurrent ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-slate-50'}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {entry.month}
                      {isCurrent && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          이번 달
                        </span>
                      )}
                    </td>
                    {SALE_CHANNELS.map((c) => (
                      <td key={c} className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums text-slate-700">
                        {entry.channels[c] > 0 ? formatWon(entry.channels[c]) : <span className="text-slate-300">-</span>}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-blue-600 whitespace-nowrap">
                      {formatWon(entry.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ───────────────────── 결제수단별 뷰 ───────────────────── */
function ChannelView({
  totals,
  grandTotal,
  donutData,
  dailyEntries,
}: {
  totals: Record<SaleChannel, number>;
  grandTotal: number;
  donutData: { name: string; value: number; color: string }[];
  dailyEntries: { date: string; channelDay: Record<SaleChannel, number> }[];
}) {
  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">결제수단 비중</h2>
          {donutData.length === 0 ? (
            <p className="mt-6 text-center text-xs text-slate-400">데이터 없음</p>
          ) : (
            <div className="mt-3">
              <ChannelDonut
                data={donutData}
                centerLabel="합계"
                centerValue={formatWon(grandTotal)}
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">결제수단별 합계</h2>
          <div className="mt-3 space-y-2.5">
            {SALE_CHANNELS.map((c) => {
              const amount = totals[c];
              const pct = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
              return (
                <div key={c}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{SALE_CHANNEL_ICON[c]}</span>
                      <span className="font-medium text-slate-700">{SALE_CHANNEL_LABEL[c]}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatWon(amount)}
                      </span>
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: SALE_CHANNEL_COLOR[c],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
          일자 × 결제수단 매트릭스
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">날짜</th>
                {SALE_CHANNELS.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                    {SALE_CHANNEL_LABEL[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyEntries.map((entry) => (
                <tr key={entry.date} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {formatKoDate(entry.date)}
                  </td>
                  {SALE_CHANNELS.map((c) => (
                    <td key={c} className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums text-slate-700">
                      {entry.channelDay[c] > 0 ? formatWon(entry.channelDay[c]) : <span className="text-slate-300">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
