/**
 * AI 기반 매장 인사이트 생성기.
 *
 * 입력: 룰 기반 컨텍스트 (매출/비용/근태 데이터)
 * 출력: InsightItem 배열 (룰 기반과 동일 인터페이스 — 호환 보장)
 *
 * 호출 실패·비용 한도 초과 시 룰 기반으로 자동 fallback.
 */

import { complete, MODELS } from './openrouter';
import {
  generateRuleBasedInsights,
  type InsightItem,
  type InsightInput,
} from '@/lib/insights/rules';

const SYSTEM_PROMPT = `당신은 한국 자영업자(매장 사장님)를 돕는 AI 운영 분석가입니다.
주어진 매장 데이터를 분석해 사장님에게 실제로 도움이 될 인사이트를 항상 3-4개 JSON 배열로 반환합니다.

응답 규칙:
- 각 인사이트는 {id, tone, title, body, action?} 형식
- tone은 정확히 다음 중 하나: "positive" | "warning" | "tip" | "neutral"
- title은 14자 이내 짧은 한 문장 (이모지 금지)
- body는 1-2문장. 데이터가 있으면 수치를 정확히 인용, 없으면 업종 특성에 맞는 구체적 조언
- action은 선택. {label: 짧은 동사구, href: 경로} 형식
  - href는 다음 중 하나만: /sales/new, /expenses/new, /reports, /contracts/new, /attendance, /employees
- 우선순위: warning > tip > neutral > positive

[중요] 절대 빈 배열을 반환하지 마세요. 데이터가 부족해도 다음을 활용해 항상 3-4개를 채웁니다:
1) 데이터 점검: 입력 누락(매출·비용·목표·직원)이나 이상치(매출 급감/급증, 비용률 과다, 특정 채널 편중, 0원 영업일 등)를 짚어줍니다.
2) 업종 맞춤 조언: 사장님 매장 업종과 계절·요일 흐름에 맞는 운영 팁(메뉴·재고·인력·마케팅)을 제안합니다.
3) 데이터가 충분하면 수치 기반 분석을 우선합니다.

- 친근한 존댓말, 외식업·소매업 자영업자 톤. 추측성 단정은 피하고 "확인해보세요/검토해보세요"처럼 행동을 권합니다.`;

interface AIInsightsResult {
  items: InsightItem[];
  source: 'ai' | 'rule';
  costUsd?: number;
}

export async function generateAIInsights(
  input: InsightInput,
  context: { storeId: string; userId: string; storeName: string; storeIndustry?: string | null },
): Promise<AIInsightsResult> {
  // OPENROUTER_API_KEY 없으면 즉시 룰 기반
  if (!process.env.OPENROUTER_API_KEY) {
    return { items: generateRuleBasedInsights(input), source: 'rule' };
  }

  const userPrompt = buildPrompt(input, context.storeName, context.storeIndustry ?? null);

  try {
    const result = await complete({
      task: 'insight',
      model: MODELS.sonnet,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 900,
      jsonMode: true,
      timeoutMs: 25000,
      storeId: context.storeId,
      userId: context.userId,
      metadata: { source: 'dashboard_insight' },
    });

    const parsed = parseInsights(result.text);
    if (parsed.length === 0) {
      return { items: generateRuleBasedInsights(input), source: 'rule' };
    }

    return {
      items: parsed,
      source: 'ai',
      costUsd: result.costUsd,
    };
  } catch (e) {
    console.error('[AI Insight] 호출 실패, 룰 기반으로 fallback:', e);
    return { items: generateRuleBasedInsights(input), source: 'rule' };
  }
}

function buildPrompt(input: InsightInput, storeName: string, industry: string | null): string {
  const monthProfit = input.monthSales - input.monthExpenses;
  const profitRate = input.monthSales > 0 ? ((monthProfit / input.monthSales) * 100).toFixed(1) : '0';
  const cardPct = input.monthSales > 0
    ? ((input.channelShare.card / input.monthSales) * 100).toFixed(1)
    : '0';
  const deliveryPct = input.monthSales > 0
    ? ((input.channelShare.delivery / input.monthSales) * 100).toFixed(1)
    : '0';

  return `매장 "${storeName}"${industry ? ` (업종: ${industry})` : ''} 의 ${input.daysIntoMonth}일차 데이터:

이번 달 매출: ${input.monthSales.toLocaleString('ko-KR')}원
이번 달 비용: ${input.monthExpenses.toLocaleString('ko-KR')}원
잠정 영업이익: ${monthProfit.toLocaleString('ko-KR')}원 (이익률 ${profitRate}%)
오늘 매출: ${input.todaySales.toLocaleString('ko-KR')}원 (어제 ${input.yesterdaySales.toLocaleString('ko-KR')}원)
월 목표: ${input.monthlyTarget.toLocaleString('ko-KR')}원 (${input.daysIntoMonth}/${input.daysInMonth}일 경과)

채널 비중: 카드 ${cardPct}%, 배달앱 ${deliveryPct}%
직원: 전체 ${input.totalEmployees}명, 현재 근무 중 ${input.workingCount}명, 서명 완료 계약 ${input.signedContractsCount}건

응답 형식:
{
  "insights": [
    {"id": "unique-id-1", "tone": "warning", "title": "...", "body": "...", "action": {"label": "비용 입력", "href": "/expenses/new"}},
    ...
  ]
}

3-4개 인사이트를 우선순위 순으로 반환하세요. 데이터가 부족한 항목은 건너뛰고 의미 있는 것만.`;
}

function parseInsights(text: string): InsightItem[] {
  try {
    // JSON 응답에서 배열 추출
    const trimmed = text.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // 코드 블록 제거 시도
      const m = trimmed.match(/\{[\s\S]*\}/);
      if (!m) return [];
      parsed = JSON.parse(m[0]);
    }

    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed as { insights?: unknown[] }).insights ?? [];

    if (!Array.isArray(arr)) return [];

    const validTones = new Set(['positive', 'warning', 'tip', 'neutral']);
    return arr
      .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
      .map((x, i): InsightItem | null => {
        const tone = String(x.tone);
        if (!validTones.has(tone)) return null;
        const title = String(x.title ?? '').trim();
        const body = String(x.body ?? '').trim();
        if (!title || !body) return null;
        const action =
          x.action && typeof x.action === 'object'
            ? {
                label: String((x.action as Record<string, unknown>).label ?? ''),
                href: String((x.action as Record<string, unknown>).href ?? ''),
              }
            : undefined;
        return {
          id: String(x.id ?? `ai-${i}`),
          tone: tone as InsightItem['tone'],
          title,
          body,
          action: action && action.label && action.href ? action : undefined,
        };
      })
      .filter((x): x is InsightItem => x !== null)
      .slice(0, 4);
  } catch (e) {
    console.error('[AI Insight] JSON 파싱 실패:', e);
    return [];
  }
}
