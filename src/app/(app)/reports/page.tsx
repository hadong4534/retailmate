import { BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPageContext } from '@/lib/auth/page-context';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/app';
import { EmptyChart } from '@/components/app/EmptyIllustration';
import { PageInsight } from '@/components/insights/PageInsight';
import { formatWon, currentYearMonth } from '@/lib/utils';
import { getMonthlyReport } from '@/lib/reports/data';
import { EXPENSE_CATEGORY_COLOR, EXPENSE_CATEGORY_LUCIDE } from '@/lib/constants';
import { DailyTrendChart, CategoryPieChart } from './charts';

/** 리포트 페이지용 짧은 운영 요약 — 2줄 이내, 자세한 분석은 AI 챗봇으로 연결. */
function buildReportInsight(args: {
  totalSales: number;
  totalExpenses: number;
  profit: number;
  profitRate: number;
  hasExpenses: boolean;
}): { title: string; body: string; tip?: { text: string } } {
  if (args.totalSales === 0 && !args.hasExpenses) {
    return {
      title: '아직 분석할 데이터가 부족해요',
      body: '매출과 비용이 입력되면 자동으로 손익을 요약해 드립니다.',
    };
  }
  if (args.totalSales > 0 && !args.hasExpenses) {
    return {
      title: '비용을 함께 입력해 정확한 손익을 보세요',
      body: `매출 ${formatWon(args.totalSales)}만 기록되어 영업이익이 100%로 잡혀 있어요. 인건비·재료비 등 실제 비용을 입력하면 진짜 이익률이 보입니다.`,
      tip: { text: '비용 메뉴에서 카테고리별로 입력할 수 있어요.' },
    };
  }
  if (args.profit < 0) {
    return {
      title: '이번 달은 적자 흐름이에요',
      body: `매출 대비 비용이 ${Math.round((args.totalExpenses / Math.max(args.totalSales, 1)) * 100)}%로 높습니다. 가장 큰 지출 항목부터 점검해보세요.`,
      tip: { text: '비용 페이지의 "가장 큰 지출 항목"을 먼저 확인해보세요.' },
    };
  }
  return {
    title: `이익률 ${args.profitRate.toFixed(1)}% — 양호합니다`,
    body: `매출 ${formatWon(args.totalSales)}, 비용 ${formatWon(args.totalExpenses)}로 영업이익 ${formatWon(args.profit)}을 기록 중이에요.`,
    tip: { text: '더 자세한 분석이 필요하면 AI 챗봇에서 "이번 달 손익 자세히"라고 물어보세요.' },
  };
}

export const metadata = {
  title: '월간 리포트 · 리테일메이트',
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentYearMonth();

  const supabase = await createClient();
  const ctx = await getPageContext(supabase);
  if (!ctx) return null;
  const store = { id: ctx.adminStore.storeId, name: ctx.adminStore.storeName };

  const report = await getMonthlyReport(supabase, store.id, store.name, month);
  const hasData = report.totalSales > 0 || report.totalExpenses > 0;
  const expenseRatio = report.totalSales > 0
    ? Math.round((report.totalExpenses / report.totalSales) * 100)
    : 0;
  const reportInsight = buildReportInsight({
    totalSales: report.totalSales,
    totalExpenses: report.totalExpenses,
    profit: report.profit,
    profitRate: report.profitRate,
    hasExpenses: report.totalExpenses > 0,
  });

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          Icon={BarChart3}
          tone="emerald"
          title="월간 리포트"
          description="손익·채널·카테고리를 한눈에 확인하고 엑셀로 내보내세요."
          right={
            <div className="flex flex-wrap items-center gap-2">
              <MonthPicker value={month} />
              <a href={`/api/reports/excel?month=${month}`}>
                <Button size="sm" variant="secondary">엑셀 다운로드</Button>
              </a>
            </div>
          }
          className="mb-5"
        />

        {/* 손익 요약 KPI */}
        <div className="rm-stagger grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            label="매출"
            value={formatWon(report.totalSales)}
            tone="blue"
            sub={`${month}`}
          />
          <KpiCard
            label="비용"
            value={formatWon(report.totalExpenses)}
            tone="red"
            sub={`매출의 ${expenseRatio}%`}
          />
          <KpiCard
            label="영업이익"
            value={formatWon(report.profit)}
            tone="emerald"
            sub={`이익률 ${report.profitRate.toFixed(1)}%`}
          />
        </div>

        {/* AI 운영 요약 — 짧은 보조 카드 (손익 표 위) */}
        <div className="mt-6">
          <PageInsight title={reportInsight.title} body={reportInsight.body} tip={reportInsight.tip} />
        </div>

        {/* 손익 표 */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 lg:p-6">
          <h2 className="text-lg font-bold text-slate-900">손익계산</h2>
          <div className="-mx-6 mt-4 overflow-x-auto px-6">
          <table className="w-full min-w-[320px] text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="whitespace-nowrap py-2 text-slate-700">매출</td>
                <td className="whitespace-nowrap py-2 text-right font-mono font-semibold tabular-nums text-blue-600">
                  {formatWon(report.totalSales)}
                </td>
              </tr>
              {(() => {
                const positive = report.expensesByCategory.filter((c) => c.amount > 0);
                if (positive.length === 0) {
                  return (
                    <tr>
                      <td className="whitespace-nowrap py-2 pl-4 text-slate-600">비용</td>
                      <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums text-slate-400">
                        − {formatWon(0)}
                      </td>
                    </tr>
                  );
                }
                return positive.map((c) => {
                  const CatIcon = EXPENSE_CATEGORY_LUCIDE[c.category];
                  return (
                    <tr key={c.category}>
                      <td className="whitespace-nowrap py-2 pl-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <CatIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                          {c.label}
                          <span className="text-xs text-slate-400">
                            ({c.ratio.toFixed(1)}%)
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums text-red-500">
                        − {formatWon(c.amount)}
                      </td>
                    </tr>
                  );
                });
              })()}
              <tr className="border-t-2 border-slate-300">
                <td className="whitespace-nowrap py-3 font-semibold text-slate-900">영업이익</td>
                <td className={
                  'whitespace-nowrap py-3 text-right font-mono text-lg font-bold tabular-nums ' +
                  (report.profit >= 0 ? 'text-emerald-600' : 'text-red-600')
                }>
                  {formatWon(report.profit)}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        {/* 차트 영역 */}
        {hasData ? (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">일별 추이</h2>
              <p className="mt-1 text-xs text-slate-500">매출 · 비용 · 이익</p>
              <div className="mt-4">
                <DailyTrendChart data={report.dailySeries} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">비용 구성</h2>
              <p className="mt-1 text-xs text-slate-500">카테고리별 비중</p>
              <div className="mt-4">
                <CategoryPieChart data={report.expensesByCategory} />
              </div>
              {report.totalExpenses > 0 && (
                <ul className="mt-4 space-y-1.5 text-xs">
                  {report.expensesByCategory
                    .filter((c) => c.amount > 0)
                    .map((c) => (
                      <li key={c.category} className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: EXPENSE_CATEGORY_COLOR[c.category] }}
                          />
                          {c.label}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600">
                          {formatWon(c.amount)} · {c.ratio.toFixed(1)}%
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <EmptyChart className="text-slate-400" />
            <p className="mt-3 text-[15px] font-medium text-slate-900">
              {month}에 기록된 매출·비용이 없습니다
            </p>
            <p className="mt-1 text-xs text-slate-500">
              매출과 비용을 입력하면 자동으로 차트가 표시됩니다.
            </p>
          </div>
        )}

        {/* 채널별 매출 */}
        {report.totalSales > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">채널별 매출</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {report.salesByChannel.map((c) => (
                <div key={c.channel} className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className="mt-1 truncate text-base font-bold tabular-nums text-slate-900 lg:text-lg" title={formatWon(c.amount)}>
                    {formatWon(c.amount)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{c.ratio.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label, value, tone, sub,
}: { label: string; value: string; tone: 'blue' | 'red' | 'emerald'; sub: string }) {
  const colorMap = {
    blue: 'text-blue-600',
    red: 'text-red-500',
    emerald: 'text-emerald-600',
  };
  const borderMap = {
    blue: 'border-l-blue-500',
    red: 'border-l-red-500',
    emerald: 'border-l-emerald-500',
  };
  return (
    <div className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] lg:p-6 ${borderMap[tone]}`}>
      <p className="text-[13px] text-slate-500">{label}</p>
      <p className={`mt-1 text-[24px] font-extrabold tabular-nums leading-tight lg:text-3xl ${colorMap[tone]}`}>{value}</p>
      <p className="mt-1 text-[12px] text-slate-500">{sub}</p>
    </div>
  );
}
