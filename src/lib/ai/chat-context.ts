import type { SupabaseClient } from '@supabase/supabase-js';
import { getMonthRange, currentYearMonth } from '@/lib/utils';
import {
  SALE_CHANNELS,
  SALE_CHANNEL_LABEL,
  type SaleChannel,
} from '@/lib/constants';

/**
 * 챗봇 시스템 프롬프트에 주입할 매장 컨텍스트 빌더.
 *
 * 핵심 데이터(매출/지출/직원/계약서)를 요약해 시스템 프롬프트에 추가.
 * 직원 이름·휴대폰은 마스킹 (개인정보 외부 전송 최소화).
 */

export interface DailySalesPoint {
  date: string;          // YYYY-MM-DD
  total: number;
}

export interface MonthlySalesPoint {
  month: string;         // YYYY-MM
  total: number;
}

export interface StoreChatContext {
  storeName: string;
  monthSales: number;
  monthExpenses: number;
  monthProfit: number;
  channelTotals: Record<SaleChannel, number>;
  topExpenseCategory: { name: string; amount: number } | null;
  workingNow: number;
  totalEmployees: number;
  signedContracts: number;
  daysIntoMonth: number;
  daysInMonth: number;
  monthlyTarget: number;
  // 일별·월별 매출 (AI가 추세 질문에 답변 가능)
  recentDailySales: DailySalesPoint[];   // 이번 달 일별 매출 (최대 31개)
  recentMonthlySales: MonthlySalesPoint[]; // 최근 6개월 월별 매출
  bestDay: { date: string; total: number } | null;
}

function emptyChannelMap(): Record<SaleChannel, number> {
  return SALE_CHANNELS.reduce(
    (acc, c) => ({ ...acc, [c]: 0 }),
    {} as Record<SaleChannel, number>,
  );
}

export async function loadStoreChatContext(
  supabase: SupabaseClient,
  storeId: string,
  storeName: string,
): Promise<StoreChatContext> {
  const month = currentYearMonth();
  const { start, end } = getMonthRange(month);

  const today = new Date();
  const daysIntoMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // 6개월 범위 (월별 추이용)
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

  const [sales, expenses, working, employees, contracts, store, sixMonthsSales] = await Promise.all([
    supabase.from('sales').select('sale_date, amount, channel').eq('store_id', storeId).gte('sale_date', start).lte('sale_date', end),
    supabase.from('expenses').select('amount, category').eq('store_id', storeId).gte('expense_date', start).lte('expense_date', end),
    supabase.from('attendances').select('id').eq('store_id', storeId).is('check_out_at', null),
    supabase.from('store_members').select('id', { count: 'exact', head: true }).eq('store_id', storeId).neq('role', 'owner').eq('is_active', true),
    supabase.from('labor_contracts').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('status', 'signed'),
    supabase.from('stores').select('monthly_target').eq('id', storeId).maybeSingle(),
    supabase.from('sales').select('sale_date, amount').eq('store_id', storeId).gte('sale_date', sixMonthsAgoStr).lte('sale_date', end),
  ]);

  const channelTotals = emptyChannelMap();
  let monthSales = 0;
  const dailyMap = new Map<string, number>();
  (sales.data ?? []).forEach((r) => {
    const amt = Number(r.amount);
    monthSales += amt;
    const c = r.channel as SaleChannel;
    if (c in channelTotals) channelTotals[c] += amt;
    dailyMap.set(r.sale_date, (dailyMap.get(r.sale_date) ?? 0) + amt);
  });

  const recentDailySales: DailySalesPoint[] = Array.from(dailyMap.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const bestDay = recentDailySales.length > 0
    ? recentDailySales.reduce((max, cur) => (cur.total > max.total ? cur : max))
    : null;

  // 월별 6개월
  const monthlyMap = new Map<string, number>();
  (sixMonthsSales.data ?? []).forEach((r) => {
    const ym = (r.sale_date as string).slice(0, 7);
    monthlyMap.set(ym, (monthlyMap.get(ym) ?? 0) + Number(r.amount));
  });
  const recentMonthlySales: MonthlySalesPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    recentMonthlySales.push({ month: ym, total: monthlyMap.get(ym) ?? 0 });
  }

  const categoryTotals = new Map<string, number>();
  let monthExpenses = 0;
  (expenses.data ?? []).forEach((r) => {
    monthExpenses += Number(r.amount);
    categoryTotals.set(r.category, (categoryTotals.get(r.category) ?? 0) + Number(r.amount));
  });

  const topExpenseEntry = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];
  const topExpenseCategory = topExpenseEntry
    ? {
        name: koCategoryName(topExpenseEntry[0]),
        amount: topExpenseEntry[1],
      }
    : null;

  return {
    storeName,
    monthSales,
    monthExpenses,
    monthProfit: monthSales - monthExpenses,
    channelTotals,
    topExpenseCategory,
    workingNow: working.data?.length ?? 0,
    totalEmployees: employees.count ?? 0,
    signedContracts: contracts.count ?? 0,
    daysIntoMonth,
    daysInMonth,
    monthlyTarget: Number(store.data?.monthly_target ?? 0),
    recentDailySales,
    recentMonthlySales,
    bestDay: bestDay ? { date: bestDay.date, total: bestDay.total } : null,
  };
}

function koCategoryName(en: string): string {
  const map: Record<string, string> = {
    material: '원재료비',
    labor: '인건비',
    rent: '임대료',
    utility: '공과금',
    communication: '통신비',
    marketing: '마케팅비',
    tax: '세금',
    etc: '기타',
  };
  return map[en] ?? en;
}

export function buildSystemPrompt(ctx: StoreChatContext): string {
  const profitRate = ctx.monthSales > 0
    ? ((ctx.monthProfit / ctx.monthSales) * 100).toFixed(1)
    : '0';

  // 결제수단별 전체 6채널 라인
  const channelLines = SALE_CHANNELS
    .map((c) => {
      const amt = ctx.channelTotals[c];
      const pct = ctx.monthSales > 0 ? ((amt / ctx.monthSales) * 100).toFixed(1) : '0';
      return `  · ${SALE_CHANNEL_LABEL[c]}: ${amt.toLocaleString('ko-KR')}원 (${pct}%)`;
    })
    .join('\n');

  // 일별 매출 (이번 달, 최근 14일만 - 토큰 절약)
  const recentDays = ctx.recentDailySales.slice(-14);
  const dailyLines = recentDays.length > 0
    ? recentDays
        .map((d) => `  · ${d.date}: ${d.total.toLocaleString('ko-KR')}원`)
        .join('\n')
    : '  · (입력된 일별 매출 없음)';

  // 월별 매출 (최근 6개월)
  const monthlyLines = ctx.recentMonthlySales
    .map((m) => `  · ${m.month}: ${m.total.toLocaleString('ko-KR')}원`)
    .join('\n');

  const bestDayLine = ctx.bestDay
    ? `${ctx.bestDay.date} (${ctx.bestDay.total.toLocaleString('ko-KR')}원)`
    : '데이터 없음';

  return `당신은 한국 자영업자(매장 사장님)를 돕는 AI 운영 비서입니다.
사장님과 친근한 존댓말로 대화하며, 매장 데이터를 인용할 수 있을 땐 정확히 인용해 답변합니다.

매장 운영뿐 아니라 사장님이 묻는 모든 주제 — 일반 지식, 세무·법률 기초 안내, 마케팅 카피 작성,
계산·분석, 글쓰기, 코드, 학습, 일상 대화 등 — 에 ChatGPT/Claude처럼 자유롭게 응답하세요.
답변 길이도 제한 없이 사장님이 필요한 만큼 충분히 설명해주세요.

[매장 컨텍스트 — 필요할 때 참고]
- 매장명: ${ctx.storeName}
- 이번 달 진행: ${ctx.daysIntoMonth}/${ctx.daysInMonth}일
- 월 매출 목표: ${ctx.monthlyTarget.toLocaleString('ko-KR')}원

[이번 달 손익 요약]
- 매출 합계: ${ctx.monthSales.toLocaleString('ko-KR')}원
- 지출 합계: ${ctx.monthExpenses.toLocaleString('ko-KR')}원
- 잠정 영업이익: ${ctx.monthProfit.toLocaleString('ko-KR')}원 (이익률 ${profitRate}%)
- 가장 큰 지출 카테고리: ${ctx.topExpenseCategory?.name ?? '데이터 없음'} ${ctx.topExpenseCategory?.amount.toLocaleString() ?? 0}원

[결제수단별 매출 — 이번 달]
${channelLines}

[일별 매출 — 최근 14일]
${dailyLines}
- 최고 매출일: ${bestDayLine}

[월별 매출 — 최근 6개월]
${monthlyLines}

[직원·계약]
- 전체 직원 ${ctx.totalEmployees}명 · 현재 근무 중 ${ctx.workingNow}명
- 서명 완료 계약서: ${ctx.signedContracts}건

[답변 가이드]
- 매장 데이터 관련 질문은 위 컨텍스트를 정확히 인용해 답변.
- 데이터로 알 수 없는 매장 정보는 "데이터가 없어서 답변이 어려워요" + 어떤 페이지에서 입력하면 되는지 안내.
- 그 외 주제는 일반 AI 어시스턴트처럼 자유롭고 충실하게 답변하세요. 답변 길이·형식 제한 없음.
- 한국어 마크다운(제목·목록·표·강조·코드 블록 등) 적극 활용 가능.`;
}
