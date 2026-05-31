import type { ExpenseCategory } from '@/lib/constants';

export interface ExpenseInsightInput {
  monthExpenses: number;
  prevMonthExpenses: number;
  monthSales: number;
  categoryTotals: Record<ExpenseCategory, number>;
  topCategory: { category: ExpenseCategory; amount: number; label: string } | null;
}

export interface ExpenseInsight {
  title: string;
  body: string;
  tip?: { text: string };
}

export function generateExpenseInsight(input: ExpenseInsightInput): ExpenseInsight {
  if (input.monthExpenses === 0) {
    return {
      title: '아직 입력된 비용이 없어요',
      body: '비용을 입력해야 정확한 영업이익이 계산됩니다.',
      tip: { text: '원재료비·인건비·임대료부터 우선 입력해보세요.' },
    };
  }

  const expenseRatio = input.monthSales > 0
    ? (input.monthExpenses / input.monthSales) * 100
    : 0;

  // 전월 대비
  if (input.prevMonthExpenses > 0) {
    const delta = ((input.monthExpenses - input.prevMonthExpenses) / input.prevMonthExpenses) * 100;
    if (delta <= -5) {
      const cuts: string[] = [];
      if (input.categoryTotals.labor < (input.prevMonthExpenses * 0.3)) cuts.push('인건비');
      if (input.categoryTotals.utility < (input.prevMonthExpenses * 0.1)) cuts.push('공과금');
      const cutText = cuts.length > 0 ? `특히 ${cuts.join('·')} 절감이 효과적이에요.` : '';
      return {
        title: '전월 대비 비용이 감소했어요!',
        body: `이번 달 비용은 전월 대비 ${Math.abs(delta).toFixed(1)}% 감소했어요.\n${cutText}`,
        tip: { text: '식자재 발주량을 최적화하면 원재료비를 추가로 절감할 수 있어요.' },
      };
    }
    if (delta >= 10) {
      return {
        title: `전월 대비 비용이 ${delta.toFixed(1)}% 늘었어요.`,
        body: '카테고리별 변동을 확인하고 비용 폭증의 원인을 점검해보세요.',
        tip: { text: '도넛 차트에서 가장 큰 카테고리부터 분해해보세요.' },
      };
    }
  }

  // 인건비 비중 점검
  const laborPct = input.monthExpenses > 0
    ? (input.categoryTotals.labor / input.monthExpenses) * 100
    : 0;
  if (laborPct >= 40) {
    return {
      title: '인건비 비중이 높습니다',
      body: `이번 달 비용 중 인건비가 ${laborPct.toFixed(1)}%를 차지해요. 외식업 평균(28%) 대비 다소 높은 편입니다.`,
      tip: { text: '근무 스케줄 최적화로 인건비를 조절할 수 있어요.' },
    };
  }

  // 매출 대비 비용
  if (expenseRatio > 0) {
    if (expenseRatio >= 90) {
      return {
        title: '비용률이 매우 높아요',
        body: `매출 대비 비용 ${expenseRatio.toFixed(1)}%. 영업이익이 거의 남지 않는 수준입니다.`,
        tip: { text: '카테고리별로 줄일 수 있는 항목을 찾아 우선순위를 정해보세요.' },
      };
    }
    if (expenseRatio <= 50) {
      return {
        title: '안정적인 비용 구조입니다',
        body: `매출 대비 비용 ${expenseRatio.toFixed(1)}%. 건전한 운영 상태예요.`,
        tip: { text: '여유 자금을 마케팅·시설 개선에 투자하면 매출 성장으로 이어집니다.' },
      };
    }
  }

  if (input.topCategory) {
    return {
      title: `최대 지출은 ${input.topCategory.label}입니다`,
      body: `이번 달 ${input.topCategory.label}에 ₩${input.topCategory.amount.toLocaleString('ko-KR')} 사용. 전체 비용의 큰 비중을 차지합니다.`,
      tip: { text: '해당 카테고리의 거래처별 지출을 분석해보세요.' },
    };
  }

  return {
    title: '비용 분석',
    body: `이번 달 비용 합계 ₩${input.monthExpenses.toLocaleString('ko-KR')}.`,
  };
}
