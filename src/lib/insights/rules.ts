/**
 * 룰 기반 매장 인사이트 생성기.
 *
 * Step 7.5에서는 데이터 기반 단순 룰로 동작하지만, Step 9에서 OpenRouter(Claude)
 * 호출로 교체될 자리. UI 측은 동일한 InsightItem 인터페이스를 사용한다.
 */

import type { SaleChannel } from '@/lib/constants';

export type InsightTone = 'positive' | 'warning' | 'tip' | 'neutral';

export interface InsightItem {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  action?: { label: string; href: string };
}

export interface InsightInput {
  monthSales: number;
  monthExpenses: number;
  todaySales: number;
  yesterdaySales: number;
  channelShare: Record<SaleChannel, number>;
  monthlyTarget: number;
  daysIntoMonth: number;
  daysInMonth: number;
  workingCount: number;
  totalEmployees: number;
  signedContractsCount: number;
}

const TONE_RANK: Record<InsightTone, number> = {
  warning: 0,
  tip: 1,
  neutral: 2,
  positive: 3,
};

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

export function generateRuleBasedInsights(input: InsightInput): InsightItem[] {
  const items: InsightItem[] = [];

  const monthProfit = input.monthSales - input.monthExpenses;
  const profitRate = input.monthSales > 0 ? (monthProfit / input.monthSales) * 100 : 0;
  const dailyDelta = input.yesterdaySales > 0
    ? ((input.todaySales - input.yesterdaySales) / input.yesterdaySales) * 100
    : null;
  const targetProgress = input.monthlyTarget > 0
    ? (input.monthSales / input.monthlyTarget) * 100
    : null;
  const expectedProgress = input.daysInMonth > 0
    ? (input.daysIntoMonth / input.daysInMonth) * 100
    : 0;

  // 1. 매출 입력 미진행
  if (input.monthSales === 0) {
    items.push({
      id: 'no-sales',
      tone: 'tip',
      title: '이번 달 매출 입력을 시작해보세요',
      body: '오늘부터 매출을 입력하면 손익 분석과 AI 추천이 자동으로 작동합니다.',
      action: { label: '매출 입력', href: '/sales/new' },
    });
  }

  // 2. 비용 입력 미진행
  if (input.monthSales > 0 && input.monthExpenses === 0) {
    items.push({
      id: 'no-expenses',
      tone: 'warning',
      title: '비용 입력이 아직 없어요',
      body: '원재료·인건비·임대료를 입력해야 정확한 영업이익을 알 수 있어요.',
      action: { label: '비용 입력', href: '/expenses/new' },
    });
  }

  // 3. 매출 추이 (어제 대비)
  if (dailyDelta != null) {
    if (dailyDelta >= 10) {
      items.push({
        id: 'sales-up',
        tone: 'positive',
        title: `어제 대비 매출이 ${dailyDelta.toFixed(0)}% 늘었어요`,
        body: '오늘의 흐름을 매출 페이지에서 채널별로 확인해보세요.',
        action: { label: '매출 추이 보기', href: '/sales' },
      });
    } else if (dailyDelta <= -15) {
      items.push({
        id: 'sales-down',
        tone: 'warning',
        title: `어제 대비 매출이 ${Math.abs(dailyDelta).toFixed(0)}% 줄었어요`,
        body: '날씨·요일·이벤트 등 외부 요인을 확인하고 채널 비중을 점검해보세요.',
        action: { label: '매출 페이지', href: '/sales' },
      });
    }
  }

  // 4. 채널 편중
  const cardPct = pct(input.channelShare.card, input.monthSales);
  if (cardPct >= 95) {
    items.push({
      id: 'card-heavy',
      tone: 'neutral',
      title: '카드 결제 비중이 매우 높아요',
      body: `이번 달 매출의 ${cardPct.toFixed(1)}%가 카드입니다. 카드 수수료 정기 점검을 권장합니다.`,
    });
  }
  const deliveryPct = pct(input.channelShare.delivery, input.monthSales);
  if (deliveryPct >= 30) {
    items.push({
      id: 'delivery-heavy',
      tone: 'neutral',
      title: '배달앱 의존도가 높아요',
      body: `배달 비중 ${deliveryPct.toFixed(1)}%. 수수료·프로모션 비용을 비용 페이지에 분리 기록해두면 손익 정확도가 올라갑니다.`,
      action: { label: '비용 입력', href: '/expenses/new' },
    });
  }

  // 5. 이익률
  if (input.monthSales > 0 && input.monthExpenses > 0) {
    if (profitRate < 5) {
      items.push({
        id: 'low-margin',
        tone: 'warning',
        title: `이익률이 ${profitRate.toFixed(1)}%로 낮아요`,
        body: '원재료비·인건비 비중을 확인하고 메뉴별 가격을 점검할 시점입니다.',
        action: { label: '리포트 열기', href: '/reports' },
      });
    } else if (profitRate >= 25) {
      items.push({
        id: 'healthy-margin',
        tone: 'positive',
        title: `이익률 ${profitRate.toFixed(1)}% — 안정적이에요`,
        body: '현재 흐름을 유지하면 월말 영업이익을 충분히 확보할 수 있습니다.',
      });
    }
  }

  // 6. 목표 달성 추이
  if (targetProgress != null) {
    const gap = targetProgress - expectedProgress;
    if (gap <= -15) {
      items.push({
        id: 'behind-target',
        tone: 'warning',
        title: `이번 달 목표 진행률이 더딥니다`,
        body: `현재 ${targetProgress.toFixed(0)}% (정상 추세 ${expectedProgress.toFixed(0)}%). 마케팅·이벤트 검토가 필요합니다.`,
      });
    } else if (gap >= 10) {
      items.push({
        id: 'ahead-target',
        tone: 'positive',
        title: `목표 달성률이 추세보다 ${gap.toFixed(0)}%p 앞서 있어요`,
        body: '이대로면 월말까지 목표를 초과 달성할 가능성이 높습니다.',
      });
    }
  }

  // 7. 직원/계약
  if (input.totalEmployees === 0) {
    items.push({
      id: 'no-employees',
      tone: 'tip',
      title: '아직 등록된 직원이 없어요',
      body: '근로계약서를 작성하면 직원이 자동 등록되고 GPS 출퇴근까지 한 번에 사용할 수 있습니다.',
      action: { label: '계약서 작성', href: '/contracts/new' },
    });
  }

  // 8. 목표 미설정 (데이터는 있는데 비교 기준이 없을 때)
  if (input.monthlyTarget === 0 && input.monthSales > 0) {
    items.push({
      id: 'no-target',
      tone: 'tip',
      title: '월 매출 목표를 설정해보세요',
      body: '목표를 정하면 진행률과 달성 추세를 자동으로 분석해드려요.',
      action: { label: '목표 설정', href: '/reports' },
    });
  }

  // 9. 항상 1개 이상 보장 — 위 룰에 걸린 게 없으면 일반 운영 가이드를 채운다.
  if (items.length === 0) {
    if (input.monthSales > 0 && input.monthExpenses > 0) {
      items.push({
        id: 'steady',
        tone: 'positive',
        title: '매장 흐름이 안정적이에요',
        body: '매출·비용이 꾸준히 기록되고 있어요. 리포트에서 채널·요일별 패턴을 확인해 성장 포인트를 찾아보세요.',
        action: { label: '리포트 보기', href: '/reports' },
      });
    } else {
      items.push({
        id: 'getting-started',
        tone: 'tip',
        title: '데이터를 쌓을수록 분석이 정확해져요',
        body: '매출·비용을 꾸준히 입력하면 손익·목표 달성·인건비 비중까지 자동으로 분석해드려요.',
        action: { label: '매출 입력', href: '/sales/new' },
      });
    }
  }

  return items
    .sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone])
    .slice(0, 4);
}

export const TONE_STYLE: Record<InsightTone, { bar: string; chip: string; chipText: string; label: string }> = {
  warning:  { bar: 'bg-amber-500', chip: 'bg-amber-100', chipText: 'text-amber-700', label: '주의' },
  tip:      { bar: 'bg-blue-500', chip: 'bg-blue-100', chipText: 'text-blue-700', label: '제안' },
  neutral:  { bar: 'bg-slate-400', chip: 'bg-slate-100', chipText: 'text-slate-700', label: '확인' },
  positive: { bar: 'bg-emerald-500', chip: 'bg-emerald-100', chipText: 'text-emerald-700', label: '양호' },
};
