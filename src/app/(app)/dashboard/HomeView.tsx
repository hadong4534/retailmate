import Link from 'next/link';
import { ChevronRight, Wallet, Receipt, Users, Clock } from 'lucide-react';
import { MonthSalesChart } from '@/components/charts/MonthSalesChart';

/**
 * 홈 대시보드 (Aurora 파스텔 v4 — 레퍼런스 레이아웃 + 우리 데이터).
 * PC: 글래스 히어로 + 도넛 목표 / 곡선 차트 + AI 인사이트 / 스탯 4 / 운영 입력.
 * 모바일: 동일 요소 세로 스택.
 * 모든 수치는 실제 매장 데이터(props)에서 계산 — 가짜 데이터 없음.
 */

export interface HomeViewProps {
  baseDate: Date;
  monthSales: number;
  monthExpenses: number;
  prevMonthSales: number;
  monthSalesEntryDays: number;
  monthlyTarget: number;
  daysInMonth: number;
  daysIntoMonth: number;
  baseSales: number;
  baseExpenses: number;
  prevSales: number;
  lastSameWeekdaySales: number | null;
  recent7DayAvgSales: number | null;
  workingCount: number;
  totalEmployees: number;
  dailySeries?: { day: number; sales: number }[];
}

export function HomeView(p: HomeViewProps) {
  const hasMonthSales = p.monthSales > 0;
  const hasMonthExpenses = p.monthExpenses > 0;
  const hasBaseSales = p.baseSales > 0;
  const hasBaseExpenses = p.baseExpenses > 0;
  const hasAttendance = p.workingCount > 0;

  const monthProfit = p.monthSales - p.monthExpenses;
  const monthProfitRate = hasMonthSales ? Math.round((monthProfit / p.monthSales) * 1000) / 10 : null;
  const monthCostRatio = hasMonthSales ? Math.round((p.monthExpenses / p.monthSales) * 1000) / 10 : null;
  const goalRate = p.monthlyTarget > 0 ? Math.round((p.monthSales / p.monthlyTarget) * 100) : null;
  const monthSalesChange = p.prevMonthSales > 0
    ? Math.round(((p.monthSales - p.prevMonthSales) / p.prevMonthSales) * 100) : null;
  const dailyAverageSales = p.monthSalesEntryDays > 0 ? Math.round(p.monthSales / p.monthSalesEntryDays) : null;
  const baseChange = p.prevSales > 0
    ? Math.round(((p.baseSales - p.prevSales) / p.prevSales) * 1000) / 10 : null;

  const expectedPace = p.daysInMonth > 0 ? Math.round((p.daysIntoMonth / p.daysInMonth) * 100) : 0;
  const ai = pickAIInsight({
    monthSales: p.monthSales, monthExpenses: p.monthExpenses, monthCostRatio,
    monthSalesChange, baseChange, goalRate, expectedPace, monthProfitRate,
    hasBaseSales, hasBaseExpenses, totalEmployees: p.totalEmployees, hasAttendance,
  });
  const series = (p.dailySeries && p.dailySeries.length > 0) ? p.dailySeries : null;

  return (
    <div className="px-4 py-5 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-6xl">
        {/* 헤더 */}
        <div className="relative mb-5 flex items-end justify-between">
          <span aria-hidden className="pointer-events-none absolute -left-7 -top-9 -z-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.22),transparent_70%)] blur-2xl" />
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 lg:text-[26px]">홈</h1>
            <p className="mt-1 text-[13px] text-slate-500">오늘도 좋은 하루 되세요.</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-xl border border-[#E9EAF4] bg-white/70 px-3 py-2 text-[13px] font-semibold text-slate-500 backdrop-blur sm:inline-flex">
            {formatKoDateLong(p.baseDate)}
          </span>
        </div>

        {/* Row 1 — 이달 매출 히어로 + 목표 도넛 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="relative overflow-hidden rounded-[24px] border border-white/70 bg-gradient-to-br from-white to-[#F3F2FE] p-6 shadow-[0_10px_30px_-18px_rgba(99,102,241,0.35)] lg:col-span-2">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.25),transparent_70%)]" />
            <p className="text-[14px] font-semibold text-slate-500">이달 매출</p>
            <p className="mt-3 text-[34px] font-extrabold tabular-nums tracking-tight text-slate-900 lg:text-[40px]">
              {hasMonthSales ? `₩${won(p.monthSales)}` : '입력 전'}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {monthSalesChange !== null ? (
                <span className={'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold ' +
                  (monthSalesChange >= 0 ? 'bg-[#EEF0FE] text-[#5961E6]' : 'bg-red-50 text-red-600')}>
                  {monthSalesChange >= 0 ? '+' : ''}{monthSalesChange}%
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-500">비교 데이터 없음</span>
              )}
              <span className="text-[12.5px] text-slate-500">지난 달 대비</span>
            </div>
          </section>

          <section className="flex flex-col items-center rounded-[24px] border border-[#E9EAF4] bg-white p-5 shadow-[0_8px_24px_-18px_rgba(99,102,241,0.3)]">
            <p className="self-start text-[13px] font-semibold text-slate-500">이달 목표 달성</p>
            <Donut pct={goalRate ?? 0} hasTarget={p.monthlyTarget > 0} />
            <p className="mt-2 text-[11.5px] font-medium text-slate-400">
              {p.monthlyTarget > 0 ? `₩${won(p.monthSales)} / ₩${won(p.monthlyTarget)}` : '목표 미설정'}
            </p>
            {p.monthlyTarget === 0 && (
              <Link href="/settings" className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#6366F1]">
                목표 설정 <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </section>
        </div>

        {/* Row 2 — 일별 매출 추이 + AI 인사이트 */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-[24px] border border-[#E9EAF4] bg-white p-5 shadow-[0_8px_24px_-18px_rgba(99,102,241,0.3)] lg:col-span-2">
            <p className="text-[14px] font-semibold text-slate-900">일별 매출 추이</p>
            <div className="mt-2">
              {series ? (
                <MonthSalesChart data={series} height={210} />
              ) : (
                <div className="flex h-[210px] flex-col items-center justify-center text-center">
                  <p className="text-[13px] font-medium text-slate-400">아직 매출 데이터가 없어요</p>
                  <Link href="/sales/new" className="mt-2 inline-flex items-center gap-1 rounded-xl bg-[#EEF0FE] px-3 py-2 text-[12.5px] font-semibold text-[#5961E6]">
                    매출 입력하기 <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[24px] border border-[#E6E5FB] bg-gradient-to-br from-[#F6F5FE] to-[#EEEFFD] p-5">
            <p className="text-[14px] font-extrabold text-[#3A3F73]">AI 인사이트</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aurora-orb.png" alt="" aria-hidden className="rm-ai-float mt-3 h-12 w-12 object-contain" />
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{ai.text}</p>
            <Link href={ai.ctaHref} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#DCDBF6] bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-[#5961E6] transition active:scale-95">
              {ai.ctaLabel} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        </div>

        {/* Row 3 — 스탯 4 (우리 데이터) */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={<Wallet className="h-4 w-4" />} label="어제 매출"
            value={hasBaseSales ? `₩${won(p.baseSales)}` : '입력 전'} muted={!hasBaseSales}
            delta={baseChange !== null ? `어제 대비 ${baseChange >= 0 ? '+' : ''}${baseChange}%` : undefined}
            deltaUp={baseChange !== null ? baseChange >= 0 : undefined} />
          <Stat icon={<Receipt className="h-4 w-4" />} label="일평균 매출"
            value={dailyAverageSales !== null ? `₩${won(dailyAverageSales)}` : '계산 대기'} muted={dailyAverageSales === null} />
          <Stat icon={<Users className="h-4 w-4" />} label="근무 중"
            value={`${p.workingCount}명`} muted={!hasAttendance}
            delta={p.totalEmployees > 0 ? `직원 ${p.totalEmployees}명` : '직원 미등록'} />
          <Stat icon={<Clock className="h-4 w-4" />} label="월 비용"
            value={hasMonthExpenses ? `₩${won(p.monthExpenses)}` : '입력 전'} muted={!hasMonthExpenses}
            delta={monthCostRatio !== null ? `매출의 ${monthCostRatio}%` : undefined} />
        </div>

        {/* Row 4 — 마감 상태 + 빠른 입력 (운영 흐름) */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ClosingCard
            hasBaseSales={hasBaseSales} hasBaseExpenses={hasBaseExpenses}
            baseProfit={p.baseSales - p.baseExpenses}
            baseProfitRate={hasBaseSales ? Math.round(((p.baseSales - p.baseExpenses) / p.baseSales) * 1000) / 10 : null}
            lastSameWeekdaySales={p.lastSameWeekdaySales} recent7DayAvgSales={p.recent7DayAvgSales}
            baseDate={p.baseDate} />
          <section className="rounded-[24px] border border-[#E9EAF4] bg-white p-5 lg:col-span-2">
            <h2 className="mb-3 text-[13px] font-semibold text-slate-900">빠른 입력</h2>
            <div className="grid grid-cols-3 gap-2.5">
              <QuickButton href="/sales/new" icon={<Wallet className="h-[18px] w-[18px]" />} label={hasMonthSales ? '매출 추가' : '매출 입력'} />
              <QuickButton href="/expenses/new" icon={<Receipt className="h-[18px] w-[18px]" />} label={hasMonthExpenses ? '비용 추가' : '비용 입력'} />
              <QuickButton href="/attendance" icon={<Users className="h-[18px] w-[18px]" />} label={hasAttendance ? '근무 현황' : '출근 확인'} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── 도넛 게이지 ──────────────────────────────────────────────────────────────
function Donut({ pct, hasTarget }: { pct: number; hasTarget: boolean }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const dash = (clamped / 100) * c;
  return (
    <svg viewBox="0 0 130 130" className="my-2 h-[124px] w-[124px]">
      <defs>
        <linearGradient id="donutG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A5AEF9" />
          <stop offset="1" stopColor="#7177EE" />
        </linearGradient>
      </defs>
      <circle cx="65" cy="65" r={r} fill="none" stroke="#EEF0F8" strokeWidth="13" />
      {hasTarget && (
        <circle cx="65" cy="65" r={r} fill="none" stroke="url(#donutG)" strokeWidth="13"
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`} transform="rotate(-90 65 65)" />
      )}
      <text x="65" y="73" textAnchor="middle" fontSize="29" fontWeight="800" fill="#1E2333">
        {hasTarget ? `${pct}%` : '–'}
      </text>
    </svg>
  );
}

// ── 스탯 카드 ────────────────────────────────────────────────────────────────
function Stat({ icon, label, value, delta, deltaUp, muted }: {
  icon: React.ReactNode; label: string; value: string; delta?: string; deltaUp?: boolean; muted?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-[#E9EAF4] bg-gradient-to-br from-white to-[#F6F6FE] p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-slate-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#EEF0FE] to-[#E7E3FB] text-[#6366F1]">{icon}</span>
        {label}
      </div>
      <p className={'mt-2.5 text-[20px] font-extrabold tabular-nums ' + (muted ? 'text-slate-400' : 'text-slate-900')}>{value}</p>
      {delta && (
        <p className={'mt-1 text-[11px] font-semibold ' + (deltaUp === undefined ? 'text-slate-400' : deltaUp ? 'text-emerald-600' : 'text-red-500')}>{delta}</p>
      )}
    </div>
  );
}

function QuickButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#E9EAF4] bg-white text-[12.5px] font-semibold text-slate-700 transition hover:bg-[#F6F5FE] hover:text-[#5961E6] active:scale-95">
      <span className="text-[#6366F1]">{icon}</span>
      {label}
    </Link>
  );
}

function ClosingCard({ hasBaseSales, hasBaseExpenses, baseProfit, baseProfitRate, lastSameWeekdaySales, recent7DayAvgSales, baseDate }: {
  hasBaseSales: boolean; hasBaseExpenses: boolean; baseProfit: number; baseProfitRate: number | null;
  lastSameWeekdaySales: number | null; recent7DayAvgSales: number | null; baseDate: Date;
}) {
  const completed = hasBaseSales && hasBaseExpenses;
  let title: string, line: string, ctaLabel: string, ctaHref: string;
  if (completed) {
    title = '어제 마감 완료'; line = `순이익 ₩${won(baseProfit)} · 이익률 ${baseProfitRate ?? 0}%`;
    ctaLabel = '어제 리포트'; ctaHref = '/reports';
  } else if (hasBaseSales && !hasBaseExpenses) {
    title = '어제 마감 진행 중'; line = '비용 입력 후 순이익 계산';
    ctaLabel = '비용 입력'; ctaHref = '/expenses/new';
  } else {
    title = '어제 마감 미완료'; line = !hasBaseSales ? '매출 미입력' : '매출 입력 후 순이익 계산';
    ctaLabel = '마감 입력'; ctaHref = '/sales/new';
  }
  const baseline = lastSameWeekdaySales !== null ? `지난 같은 요일 ₩${won(lastSameWeekdaySales)}`
    : recent7DayAvgSales !== null ? `최근 7일 평균 ₩${won(recent7DayAvgSales)}` : null;
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#E9EAF4] bg-white">
      <div className="px-5 pt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold text-slate-900">마감 상태</h2>
          <span className="text-[10.5px] text-slate-400">{formatKoDateShort(baseDate)}</span>
        </div>
        <p className={'mt-2 text-[15px] font-bold ' + (completed ? 'text-emerald-700' : 'text-slate-900')}>{title}</p>
        <p className="mt-0.5 text-[11.5px] text-slate-500">{line}</p>
        {!completed && baseline && <p className="mt-1.5 text-[10.5px] text-slate-400">{baseline}</p>}
      </div>
      <Link href={ctaHref} className="mt-3 flex items-center justify-between border-t border-[#EEF0F8] bg-[#7177EE] px-5 py-3 text-[13px] font-semibold text-white transition active:bg-[#5E64E6]">
        <span>{ctaLabel}</span><ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

// ── AI 한 줄 진단 (데이터 점검 + 이상치 + 가이드. 항상 비지 않음) ─────────────
function pickAIInsight(s: {
  monthSales: number; monthExpenses: number; monthCostRatio: number | null;
  monthSalesChange: number | null; baseChange: number | null;
  goalRate: number | null; expectedPace: number; monthProfitRate: number | null;
  hasBaseSales: boolean; hasBaseExpenses: boolean; totalEmployees: number; hasAttendance: boolean;
}): { text: string; ctaLabel: string; ctaHref: string } {
  const hasAny = s.monthSales > 0 || s.monthExpenses > 0;

  if (!hasAny && s.totalEmployees === 0)
    return { text: '매출·비용·근무 데이터를 입력하면 매장 손익과 목표 달성률이 자동으로 정리돼요.', ctaLabel: '첫 데이터 입력', ctaHref: '/sales/new' };
  if (s.monthSales === 0)
    return { text: '아직 이번 달 매출이 없어요. 입력하면 목표 달성률·순이익 분석이 시작됩니다.', ctaLabel: '매출 입력', ctaHref: '/sales/new' };
  if (s.monthCostRatio === null || s.monthCostRatio < 10)
    return { text: '매출은 확인됐지만 비용 입력이 부족해 순이익 정확도가 낮아요. 원재료비·인건비·임대료부터 입력해보세요.', ctaLabel: '비용 입력', ctaHref: '/expenses/new' };

  if (s.baseChange !== null && s.baseChange <= -25)
    return { text: `어제 매출이 직전일 대비 ${Math.abs(s.baseChange)}% 급감했어요. 요일·날씨·이벤트 등 외부 요인을 점검해보세요.`, ctaLabel: '매출 추이', ctaHref: '/sales' };
  if (s.monthSalesChange !== null && s.monthSalesChange <= -20)
    return { text: `이번 달 매출이 지난달보다 ${Math.abs(s.monthSalesChange)}% 낮아요. 채널 비중과 마케팅을 점검할 시점입니다.`, ctaLabel: '리포트 보기', ctaHref: '/reports' };
  if (s.monthCostRatio !== null && s.monthCostRatio >= 80)
    return { text: `비용률이 매출의 ${s.monthCostRatio}%로 매우 높아요. 영업이익이 거의 남지 않는 수준이라 원재료비·인건비 점검이 필요해요.`, ctaLabel: '비용 분석', ctaHref: '/expenses' };
  if (s.monthCostRatio !== null && s.monthCostRatio >= 60)
    return { text: `비용 비중이 ${s.monthCostRatio}%로 다소 높아요. 카테고리별로 줄일 항목이 있는지 확인해보세요.`, ctaLabel: '비용 분석', ctaHref: '/expenses' };

  if (s.goalRate !== null && s.goalRate - s.expectedPace <= -15)
    return { text: `목표 진행률 ${s.goalRate}%로 정상 추세(${s.expectedPace}%)보다 더뎌요. 남은 기간 매출 전략을 점검해보세요.`, ctaLabel: '리포트 보기', ctaHref: '/reports' };
  if (s.goalRate !== null && s.goalRate - s.expectedPace >= 10)
    return { text: `목표 달성률이 추세보다 ${s.goalRate - s.expectedPace}%p 앞서 있어요. 이대로면 월말 목표 초과 달성이 기대돼요.`, ctaLabel: '리포트 보기', ctaHref: '/reports' };

  if (!s.hasBaseSales || !s.hasBaseExpenses)
    return { text: '어제 마감이 비어 있어요. 입력하면 이번 달 리포트가 더 정확해집니다.', ctaLabel: '마감 입력', ctaHref: '/sales/new' };
  if (s.totalEmployees > 0 && !s.hasAttendance)
    return { text: '오늘 출근 기록이 없어요. 근무자를 확인하면 인건비 계산이 정확해져요.', ctaLabel: '출근 확인', ctaHref: '/attendance' };

  if (s.monthProfitRate !== null && s.monthProfitRate >= 25)
    return { text: `이익률 ${s.monthProfitRate}%로 안정적이에요. 여유 자금을 마케팅·시설 개선에 투자하면 매출 성장으로 이어집니다.`, ctaLabel: '리포트 보기', ctaHref: '/reports' };
  return { text: '이번 달 매장 흐름은 안정적이에요. 채널·요일별 패턴을 분석해 성장 포인트를 찾아보세요.', ctaLabel: '리포트 보기', ctaHref: '/reports' };
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function won(n: number): string { return Math.abs(n).toLocaleString('ko-KR'); }
function formatKoDateShort(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
  const wk: Record<string, string> = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' };
  return `${parseInt(get('month'), 10)}/${parseInt(get('day'), 10)} (${wk[get('weekday')] ?? ''})`;
}
function formatKoDateLong(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
  const wk: Record<string, string> = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' };
  return `${get('year')}. ${get('month')}. ${get('day')} (${wk[get('weekday')] ?? ''})`;
}
