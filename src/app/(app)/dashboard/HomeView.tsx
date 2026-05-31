import Link from 'next/link';
import { Sparkles, TrendingDown, TrendingUp, Wallet, Receipt, Users, ChevronRight, Target } from 'lucide-react';

/**
 * 홈 — "매장 운영 대시보드" (2026-05 개편 v3).
 *
 * 사양 v3:
 *  - 입력 대기 화면이 아닌 매장 운영 대시보드. 월 매출/비용/이익이 주인공.
 *  - 순서: AI 슬림 → 이번 달 요약(큰 카드 1개) → KPI 4(2열) → 마감 상태(어제 통합) → 빠른 입력 → 남은 입력.
 *  - 빠른 입력 버튼은 모두 보조 스타일(파란 채움 제거). 메인 CTA는 AI/마감 카드 내부에만.
 *  - 입력 전 상태는 큰 카드가 아니라 작은 배지/상태값으로.
 */

export interface HomeViewProps {
  baseDate: Date;
  // 월간
  monthSales: number;
  monthExpenses: number;
  prevMonthSales: number;
  monthSalesEntryDays: number;       // 매출이 입력된 일 수 (일평균 계산)
  monthlyTarget: number;
  daysInMonth: number;
  daysIntoMonth: number;
  // 어제
  baseSales: number;
  baseExpenses: number;
  prevSales: number;
  lastSameWeekdaySales: number | null;
  recent7DayAvgSales: number | null;
  // 출근
  workingCount: number;
  totalEmployees: number;
}

export function HomeView(p: HomeViewProps) {
  // ── 파생 ────────────────────────────────────────────────────────────────────
  const hasMonthSales = p.monthSales > 0;
  const hasMonthExpenses = p.monthExpenses > 0;
  const hasBaseSales = p.baseSales > 0;
  const hasBaseExpenses = p.baseExpenses > 0;
  const hasAttendance = p.workingCount > 0;

  const monthProfit = p.monthSales - p.monthExpenses;
  const monthProfitRate: number | null = hasMonthSales
    ? Math.round((monthProfit / p.monthSales) * 1000) / 10
    : null;
  const monthCostRatio: number | null = hasMonthSales
    ? Math.round((p.monthExpenses / p.monthSales) * 1000) / 10
    : null;

  const monthlyGoalRate: number | null = p.monthlyTarget > 0
    ? Math.round((p.monthSales / p.monthlyTarget) * 100)
    : null;

  const monthSalesChange: number | null = p.prevMonthSales > 0
    ? Math.round(((p.monthSales - p.prevMonthSales) / p.prevMonthSales) * 100)
    : null;

  // 일평균 매출 = 월 매출 / 매출 입력 일수 (0원 일자 제외).
  const dailyAverageSales: number | null = p.monthSalesEntryDays > 0
    ? Math.round(p.monthSales / p.monthSalesEntryDays)
    : null;
  // 일일 목표 = 월 목표 / 이번달 일수.
  const dailyGoal = p.monthlyTarget > 0 ? Math.round(p.monthlyTarget / p.daysInMonth) : 0;

  // 어제 손익
  const baseProfit = p.baseSales - p.baseExpenses;
  const baseProfitRate: number | null = hasBaseSales
    ? Math.round((baseProfit / p.baseSales) * 1000) / 10
    : null;

  // AI 한 줄 진단
  const ai = pickAIInsight({
    monthSales: p.monthSales, monthExpenses: p.monthExpenses,
    monthCostRatio,
    hasBaseSales, hasBaseExpenses,
    totalEmployees: p.totalEmployees, hasAttendance,
  });

  return (
    <div className="px-4 py-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-2xl space-y-4 lg:max-w-3xl">

        {/* 1. AI 한 줄 진단 (최상단 고정) */}
        <AISlimCard text={ai.text} ctaLabel={ai.ctaLabel} ctaHref={ai.ctaHref} />

        {/* 2. 이번 달 매장 현황 — 큰 요약 카드 1개 */}
        <MonthOverviewCard
          monthSales={p.monthSales}
          monthExpenses={p.monthExpenses}
          monthProfit={monthProfit}
          monthlyGoalRate={monthlyGoalRate}
          monthlyTarget={p.monthlyTarget}
          daysIntoMonth={p.daysIntoMonth}
          daysInMonth={p.daysInMonth}
        />

        {/* 3. 핵심 KPI 4개 — 2열 그리드 */}
        <section className="grid grid-cols-2 gap-2.5">
          <KpiSmall
            title="월 매출"
            value={hasMonthSales ? `${won(p.monthSales)}원` : '입력 전'}
            valueMuted={!hasMonthSales}
            sub={
              !hasMonthSales
                ? '매출 입력 필요'
                : monthSalesChange === null
                  ? '비교 데이터 없음'
                  : `전월 대비 ${monthSalesChange > 0 ? '+' : ''}${monthSalesChange}%`
            }
            subTrend={monthSalesChange !== null
              ? (monthSalesChange > 0 ? 'up' : monthSalesChange < 0 ? 'down' : 'flat')
              : undefined}
          />
          <KpiSmall
            title="월 비용"
            value={hasMonthExpenses ? `${won(p.monthExpenses)}원` : '입력 전'}
            valueMuted={!hasMonthExpenses}
            sub={
              !hasMonthExpenses
                ? '비용 입력 필요'
                : monthCostRatio !== null
                  ? `매출의 ${monthCostRatio}%`
                  : '매출 입력 시 비중 계산'
            }
          />
          <KpiSmall
            title="예상 이익"
            value={
              hasMonthSales && hasMonthExpenses
                ? `${won(monthProfit)}원`
                : '계산 대기'
            }
            valueMuted={!(hasMonthSales && hasMonthExpenses)}
            valueDanger={hasMonthSales && hasMonthExpenses && monthProfit < 0}
            sub={
              !(hasMonthSales && hasMonthExpenses)
                ? '매출+비용 필요'
                : monthProfit < 0
                  ? '손실 발생'
                  : `이익률 ${monthProfitRate ?? 0}%`
            }
          />
          <KpiSmall
            title="일평균 매출"
            value={dailyAverageSales !== null ? `${won(dailyAverageSales)}원` : '계산 대기'}
            valueMuted={dailyAverageSales === null}
            sub={
              dailyGoal > 0
                ? `일일 목표 ${won(dailyGoal)}원`
                : '목표 설정 필요'
            }
          />
        </section>

        {/* 4. 마감 상태 카드 — 어제 3종 통합 */}
        <ClosingCard
          hasBaseSales={hasBaseSales}
          hasBaseExpenses={hasBaseExpenses}
          hasAttendance={hasAttendance}
          baseProfit={baseProfit}
          baseProfitRate={baseProfitRate}
          lastSameWeekdaySales={p.lastSameWeekdaySales}
          recent7DayAvgSales={p.recent7DayAvgSales}
          baseDate={p.baseDate}
        />

        {/* 5. 빠른 입력 — 모두 동일한 보조 스타일 */}
        <section>
          <h2 className="mb-2 text-[13px] font-semibold text-slate-900">빠른 입력</h2>
          <div className="grid grid-cols-3 gap-2">
            <QuickButton
              href="/sales/new"
              icon={<Wallet className="h-4 w-4" strokeWidth={2.2} />}
              label={hasBaseSales || hasMonthSales ? '매출 추가' : '매출 입력'}
            />
            <QuickButton
              href="/expenses/new"
              icon={<Receipt className="h-4 w-4" strokeWidth={2.2} />}
              label={hasBaseExpenses || hasMonthExpenses ? '비용 추가' : '비용 입력'}
            />
            <QuickButton
              href="/attendance"
              icon={<Users className="h-4 w-4" strokeWidth={2.2} />}
              label={hasAttendance ? '근무 현황' : '출근 확인'}
            />
          </div>
        </section>

        {/* 6. 남은 입력 — 간결한 한 줄 또는 미니 리스트 */}
        <RemainingInputs
          hasBaseSales={hasBaseSales}
          hasBaseExpenses={hasBaseExpenses}
          hasAttendance={hasAttendance}
          workingCount={p.workingCount}
        />

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI 한 줄 진단 우선순위
// ─────────────────────────────────────────────────────────────────────────────
function pickAIInsight(s: {
  monthSales: number;
  monthExpenses: number;
  monthCostRatio: number | null;
  hasBaseSales: boolean;
  hasBaseExpenses: boolean;
  totalEmployees: number;
  hasAttendance: boolean;
}): { text: string; ctaLabel: string; ctaHref: string } {
  const hasAny = s.monthSales > 0 || s.monthExpenses > 0;
  // G. 최초 — 모든 데이터 없음
  if (!hasAny && s.totalEmployees === 0) {
    return {
      text: '매출·비용·근무 데이터를 입력하면 내 매장 손익이 자동으로 정리돼요.',
      ctaLabel: '첫 데이터 입력',
      ctaHref: '/sales/new',
    };
  }
  // C. 월 매출이 없음
  if (s.monthSales === 0) {
    return {
      text: '아직 매출 데이터가 부족해요. 매출을 입력하면 목표 달성률과 순이익 분석이 시작돼요.',
      ctaLabel: '매출 입력',
      ctaHref: '/sales/new',
    };
  }
  // B. 매출은 있는데 비용 입력 부족 (월 비용이 매출의 10% 미만은 거의 누락 상태로 본다)
  if (s.monthSales > 0 && (s.monthCostRatio === null || s.monthCostRatio < 10)) {
    return {
      text: '이번 달 매출은 확인됐지만, 비용 입력이 부족해 순이익 정확도가 낮아요.',
      ctaLabel: '비용 입력',
      ctaHref: '/expenses/new',
    };
  }
  // D. 비용 비중 50% 이상
  if (s.monthCostRatio !== null && s.monthCostRatio >= 50) {
    return {
      text: '비용 비중이 평소보다 높아요. 원재료비와 인건비를 먼저 확인해보세요.',
      ctaLabel: '비용 분석',
      ctaHref: '/expenses',
    };
  }
  // E. 어제 마감 미완료
  if (!s.hasBaseSales || !s.hasBaseExpenses) {
    return {
      text: '어제 마감이 아직 비어 있어요. 매출과 비용을 입력하면 이번 달 리포트가 더 정확해져요.',
      ctaLabel: '마감 입력',
      ctaHref: '/sales/new',
    };
  }
  // F. 직원 있는데 출근 없음
  if (s.totalEmployees > 0 && !s.hasAttendance) {
    return {
      text: '오늘 출근 기록이 아직 없어요. 근무자를 확인하면 인건비 계산이 더 정확해져요.',
      ctaLabel: '출근 확인',
      ctaHref: '/attendance',
    };
  }
  // A. 정상
  return {
    text: '이번 달 매장 흐름은 안정적이에요. 순이익과 비용 비중을 계속 확인해보세요.',
    ctaLabel: '리포트 보기',
    ctaHref: '/reports',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI 슬림 카드 — 흰색/연한 블루 톤, 최대 2줄
// ─────────────────────────────────────────────────────────────────────────────
function AISlimCard({
  text, ctaLabel, ctaHref,
}: {
  text: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl rm-ai-live border border-[#E4E4FB] bg-gradient-to-br from-white to-[#F2F2FD]">
      <div className="flex items-start gap-2.5 px-4 pt-3.5">
        <span
          aria-hidden
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#8E94F2] to-[#6366F1] text-white shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6366F1]">
            RetailMate AI
          </p>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-900">{text}</p>
        </div>
      </div>
      <Link
        href={ctaHref}
        className="mt-3 flex items-center justify-between border-t border-[#E4E4FB] bg-white/60 px-4 py-2.5 text-[13px] font-semibold text-[#5458E6] transition active:bg-[#EEEEFD]"
      >
        <span>{ctaLabel}</span>
        <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
      </Link>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 이번 달 매장 현황 — 큰 요약 카드 1개
// ─────────────────────────────────────────────────────────────────────────────
function MonthOverviewCard({
  monthSales, monthExpenses, monthProfit,
  monthlyGoalRate, monthlyTarget,
  daysIntoMonth, daysInMonth,
}: {
  monthSales: number;
  monthExpenses: number;
  monthProfit: number;
  monthlyGoalRate: number | null;
  monthlyTarget: number;
  daysIntoMonth: number;
  daysInMonth: number;
}) {
  const hasSales = monthSales > 0;
  const hasExpenses = monthExpenses > 0;
  const hasTarget = monthlyTarget > 0;
  const goalPct = monthlyGoalRate ?? 0;
  const goalPctClamped = Math.min(100, Math.max(0, goalPct));
  const done = goalPct >= 100;

  return (
    <section className="rounded-2xl border border-[#E9EAF4] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-bold text-slate-900">이번 달 매장 현황</h2>
        <span className="text-[10px] text-slate-400">{daysIntoMonth}/{daysInMonth}일</span>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {hasTarget
          ? `목표의 ${monthlyGoalRate}%까지 왔어요`
          : '이번 달 목표를 설정하면 달성률을 확인할 수 있어요'}
      </p>

      {/* 2x2 메트릭 */}
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
        <MetricInline
          label="이번 달 매출"
          value={hasSales ? `${won(monthSales)}원` : '입력 전'}
          muted={!hasSales}
          accent={hasSales ? 'primary' : undefined}
        />
        <MetricInline
          label="예상 순이익"
          value={hasSales && hasExpenses ? `${won(monthProfit)}원` : '계산 대기'}
          muted={!(hasSales && hasExpenses)}
          accent={
            hasSales && hasExpenses
              ? (monthProfit < 0 ? 'danger' : 'success')
              : undefined
          }
        />
        <MetricInline
          label="월 비용"
          value={hasExpenses ? `${won(monthExpenses)}원` : '입력 전'}
          muted={!hasExpenses}
        />
        <MetricInline
          label="목표 달성률"
          value={hasTarget ? `${monthlyGoalRate}%` : '목표 없음'}
          muted={!hasTarget}
          accent={hasTarget && done ? 'success' : undefined}
        />
      </div>

      {/* 진행 막대 */}
      {hasTarget && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={'h-full rounded-full transition-[width] duration-500 ' + (done ? 'bg-emerald-500' : 'bg-[#6366F1]')}
              style={{ width: `${goalPctClamped}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">
            <Target className="-mt-0.5 mr-1 inline-block h-3 w-3" strokeWidth={2.4} />
            월 목표 {won(monthlyTarget)}원
          </p>
        </div>
      )}
      {!hasTarget && (
        <Link
          href="/settings"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#6366F1]"
        >
          목표 설정하기 <ChevronRight className="h-3 w-3" strokeWidth={2.4} />
        </Link>
      )}
    </section>
  );
}

function MetricInline({
  label, value, muted, accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: 'primary' | 'success' | 'danger';
}) {
  const valueCls = muted
    ? 'text-slate-400'
    : accent === 'success'
      ? 'text-emerald-600'
      : accent === 'danger'
        ? 'text-red-600'
        : accent === 'primary'
          ? 'text-slate-900'
          : 'text-slate-900';
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-[18px] font-bold tabular-nums ${valueCls}`}>{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 핵심 KPI — 작은 2x2 카드
// ─────────────────────────────────────────────────────────────────────────────
function KpiSmall({
  title, value, sub, valueMuted, valueDanger, subTrend,
}: {
  title: string;
  value: string;
  sub: string;
  valueMuted?: boolean;
  valueDanger?: boolean;
  subTrend?: 'up' | 'down' | 'flat';
}) {
  const valueCls = valueDanger
    ? 'text-red-600'
    : valueMuted
      ? 'text-slate-400'
      : 'text-slate-900';
  const subToneCls = subTrend === 'down'
    ? 'text-red-600'
    : subTrend === 'up'
      ? 'text-emerald-600'
      : 'text-slate-500';
  return (
    <div className="rounded-2xl border border-[#E9EAF4] bg-white p-3">
      <p className="text-[10px] font-medium text-slate-500">{title}</p>
      <p className={`mt-0.5 text-[15px] font-bold tabular-nums ${valueCls}`}>{value}</p>
      <p className={`mt-0.5 inline-flex items-center gap-0.5 text-[10px] ${subToneCls}`}>
        {subTrend === 'up' && <TrendingUp className="h-2.5 w-2.5" strokeWidth={2.4} />}
        {subTrend === 'down' && <TrendingDown className="h-2.5 w-2.5" strokeWidth={2.4} />}
        {sub}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 마감 상태 카드 — 어제 3종 통합
// ─────────────────────────────────────────────────────────────────────────────
function ClosingCard({
  hasBaseSales, hasBaseExpenses, hasAttendance,
  baseProfit, baseProfitRate,
  lastSameWeekdaySales, recent7DayAvgSales,
  baseDate,
}: {
  hasBaseSales: boolean;
  hasBaseExpenses: boolean;
  hasAttendance: boolean;
  baseProfit: number;
  baseProfitRate: number | null;
  lastSameWeekdaySales: number | null;
  recent7DayAvgSales: number | null;
  baseDate: Date;
}) {
  // 상태 판정
  const allMissing = !hasBaseSales && !hasBaseExpenses;
  const completed = hasBaseSales && hasBaseExpenses;

  let title: string;
  let line: string;
  let ctaLabel: string;
  let ctaHref: string;

  if (completed) {
    title = '어제 마감 완료';
    line = `순이익 ${won(baseProfit)}원 · 이익률 ${baseProfitRate ?? 0}%`;
    ctaLabel = '어제 리포트 보기';
    ctaHref = '/reports';
  } else if (hasBaseSales && !hasBaseExpenses) {
    title = '어제 마감 진행 중';
    line = '비용 입력 후 순이익을 계산할 수 있어요';
    ctaLabel = '비용 입력하기';
    ctaHref = '/expenses/new';
  } else if (allMissing) {
    title = '어제 마감 미완료';
    const parts = [
      !hasBaseSales ? '매출 미입력' : null,
      !hasBaseExpenses ? '비용 미입력' : null,
      !hasAttendance ? '출근 기록 없음' : null,
    ].filter(Boolean);
    line = parts.join(' · ');
    ctaLabel = '마감 입력하기';
    ctaHref = '/sales/new';
  } else {
    title = '어제 마감 미완료';
    line = '매출 입력 후 순이익을 계산할 수 있어요';
    ctaLabel = '매출 입력하기';
    ctaHref = '/sales/new';
  }

  const baseline = lastSameWeekdaySales !== null
    ? `지난 같은 요일 매출 ${won(lastSameWeekdaySales)}원`
    : recent7DayAvgSales !== null
      ? `최근 7일 평균 ${won(recent7DayAvgSales)}원`
      : null;

  return (
    <section className="rounded-2xl border border-[#E9EAF4] bg-white">
      <div className="px-4 pt-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold text-slate-900">마감 상태</h2>
          <span className="text-[10px] text-slate-400">{formatKoDateShort(baseDate)}</span>
        </div>
        <p className={'mt-1.5 text-[14px] font-semibold ' + (completed ? 'text-emerald-700' : 'text-slate-900')}>
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">{line}</p>
        {!completed && baseline && (
          <p className="mt-1.5 text-[10px] text-slate-400">{baseline}</p>
        )}
      </div>
      <Link
        href={ctaHref}
        className="mt-3 flex items-center justify-between border-t border-[#E9EAF4] bg-[#6366F1] px-4 py-2.5 text-[13px] font-semibold text-white transition active:bg-[#5458E6]"
      >
        <span>{ctaLabel}</span>
        <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
      </Link>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 빠른 입력 — 모두 보조 스타일 (메인 CTA 사용 금지)
// ─────────────────────────────────────────────────────────────────────────────
function QuickButton({
  href, icon, label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-[#E9EAF4] bg-white text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 남은 입력 — 간결한 슬림 카드
// ─────────────────────────────────────────────────────────────────────────────
function RemainingInputs({
  hasBaseSales, hasBaseExpenses, hasAttendance, workingCount,
}: {
  hasBaseSales: boolean;
  hasBaseExpenses: boolean;
  hasAttendance: boolean;
  workingCount: number;
}) {
  const items = [
    { key: 'sales', done: hasBaseSales, label: hasBaseSales ? '매출 입력 완료' : '매출 입력 전' },
    { key: 'exp', done: hasBaseExpenses, label: hasBaseExpenses ? '비용 입력 완료' : '비용 입력 전' },
    { key: 'att', done: hasAttendance, label: hasAttendance ? `직원 ${workingCount}명 출근 중` : '출근 기록 없음' },
  ];
  const remaining = items.filter((i) => !i.done).length;

  if (remaining === 0) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
        <p className="text-[12px] font-semibold text-emerald-800">남은 입력 없음</p>
        <p className="mt-0.5 text-[11px] text-emerald-700">오늘 필요한 입력이 완료됐어요</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#E9EAF4] bg-white px-4 py-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-[12px] font-semibold text-slate-900">남은 입력</p>
        <span className="text-[10px] text-slate-400">{remaining}개</span>
      </div>
      <ul className="mt-1 space-y-0.5">
        {items.filter((i) => !i.done).map((i) => (
          <li key={i.key} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300" />
            {i.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────────────────
function won(n: number): string {
  return Math.abs(n).toLocaleString('ko-KR');
}

function formatKoDateShort(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekdayMap: Record<string, string> = {
    Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토',
  };
  return `${parseInt(get('month'), 10)}/${parseInt(get('day'), 10)} (${weekdayMap[get('weekday')] ?? ''})`;
}
