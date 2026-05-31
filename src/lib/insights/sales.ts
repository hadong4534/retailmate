import type { SaleChannel } from '@/lib/constants';

export interface SalesInsightInput {
  monthSales: number;
  prevMonthSales: number;
  channelTotals: Record<SaleChannel, number>;
  bestDay: { date: string; amount: number } | null;
  dailyAverage: number;
}

export interface SalesInsight {
  title: string;
  body: string;
  tip?: { text: string };
}

export function generateSalesInsight(input: SalesInsightInput): SalesInsight {
  const total = input.monthSales;
  if (total === 0) {
    return {
      title: '아직 입력된 매출이 없어요',
      body: '오늘부터 매출을 입력하면 채널별 비중·추이·추천을 자동으로 분석합니다.',
      tip: { text: '오른쪽 상단의 [+ 매출 입력] 버튼으로 빠르게 등록할 수 있습니다.' },
    };
  }

  const cardPct = (input.channelTotals.card / total) * 100;
  const cashPct = (input.channelTotals.cash / total) * 100;
  const deliveryPct = (input.channelTotals.delivery / total) * 100;

  // 우선순위: 카드 비중 매우 높음 > 배달 비중 매우 높음 > 전월 대비 변화 > 평균 일매출 안내
  if (cardPct >= 90) {
    return {
      title: '카드 매출 비중이 매우 높아요.',
      body: `전체 매출의 ${cardPct.toFixed(1)}%가 카드 결제예요.\n현금 결제 비중은 ${cashPct.toFixed(1)}%로 낮은 편이에요.`,
      tip: { text: '카드 결제 수수료를 주기적으로 확인해 비용을 최적화해보세요.' },
    };
  }

  if (deliveryPct >= 30) {
    return {
      title: '배달앱 의존도가 높습니다.',
      body: `이달 배달앱 비중 ${deliveryPct.toFixed(1)}%. 배달 매출은 수수료·프로모션 비용이 함께 발생해 실수익이 낮아질 수 있어요.`,
      tip: { text: '비용 페이지에 배달앱 수수료를 따로 기록하면 채널별 손익을 정확히 볼 수 있습니다.' },
    };
  }

  if (input.prevMonthSales > 0) {
    const delta = ((total - input.prevMonthSales) / input.prevMonthSales) * 100;
    if (delta >= 10) {
      return {
        title: `전월 대비 매출이 ${delta.toFixed(1)}% 증가했어요.`,
        body: `이번 달 합계 ₩${total.toLocaleString('ko-KR')}. 작년 동월·전년 추이를 함께 비교하면 성장 패턴이 명확해집니다.`,
        tip: { text: '리포트 페이지에서 채널별·카테고리별 변화를 확인해보세요.' },
      };
    }
    if (delta <= -10) {
      return {
        title: `전월 대비 매출이 ${Math.abs(delta).toFixed(1)}% 감소했어요.`,
        body: '날씨·이벤트·요일 분포 등 외부 요인을 점검하고 마케팅 전략을 조정할 시점입니다.',
        tip: { text: '카드·현금·배달 비중을 비교해 매출 채널 다변화를 검토해보세요.' },
      };
    }
  }

  if (input.bestDay) {
    return {
      title: `이번 달 최고 매출일은 ${input.bestDay.date}였어요.`,
      body: `최고 매출 ₩${input.bestDay.amount.toLocaleString('ko-KR')}, 일평균 ₩${input.dailyAverage.toLocaleString('ko-KR')}. 최고 매출일의 요일·이벤트 패턴을 분석해 재현해보세요.`,
      tip: { text: '운영 알림에서 영업일별 패턴을 확인할 수 있습니다.' },
    };
  }

  return {
    title: '안정적인 매출 추세입니다.',
    body: `이번 달 합계 ₩${total.toLocaleString('ko-KR')}, 일평균 ₩${input.dailyAverage.toLocaleString('ko-KR')}.`,
    tip: { text: '비용 입력을 함께 진행하면 영업이익이 자동 계산됩니다.' },
  };
}
