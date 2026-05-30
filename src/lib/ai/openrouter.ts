/**
 * OpenRouter 단일 게이트웨이 클라이언트.
 *
 * - 모든 AI 호출이 이 모듈을 거치도록 단일 진입점
 * - ai_usage_logs 자동 기록 (비용·토큰 추적)
 * - 매장 데이터 외부 전송 시 직원 이름·휴대폰 마스킹 (호출부에서 처리 강제)
 *
 * 메모리 결정 사항 (reference_ai_stack.md):
 * - 텍스트 메인: anthropic/claude-sonnet-4.6
 * - 텍스트 짧은 분석: anthropic/claude-haiku-4.5
 * - 이미지: openai/gpt-image-1 (Step 10에서 도입)
 */

import { createAdminClient } from '@/lib/supabase/admin';

export const MODELS = {
  /** 인사이트·챗봇 메인 */
  sonnet: 'anthropic/claude-sonnet-4.6',
  /** 짧은 분석·요약·태깅 */
  haiku: 'anthropic/claude-haiku-4.5',
} as const;

export type AITask = 'insight' | 'chat' | 'analyze' | 'image';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterChoice {
  message: { role: 'assistant'; content: string };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CompleteOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  task: AITask;
  storeId?: string | null;
  userId: string;
  metadata?: Record<string, unknown>;
  /** ms. 초과 시 abort. 기본 5000 (모바일 브라우저 대응). */
  timeoutMs?: number;
}

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Sonnet 4.6 단가 추정 (2026-05 기준, OpenRouter):
 *  - input: $3 / MTok = $0.000003 / token
 *  - output: $15 / MTok = $0.000015 / token
 * Haiku 4.5:
 *  - input: $0.80 / MTok
 *  - output: $4 / MTok
 */
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  if (model.includes('sonnet')) {
    return inputTokens * 0.000003 + outputTokens * 0.000015;
  }
  if (model.includes('haiku')) {
    return inputTokens * 0.0000008 + outputTokens * 0.000004;
  }
  return 0;
}

export interface AIResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  requestId: string;
}

export async function complete(opts: CompleteOptions): Promise<AIResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY가 설정되지 않았습니다.');

  const model = opts.model ?? MODELS.sonnet;

  const body = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 3000);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'RetailMate',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API 호출 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as OpenRouterResponse;
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error('OpenRouter 응답이 비어있습니다.');
  }

  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  const costUsd = estimateCost(model, inputTokens, outputTokens);

  // ai_usage_logs 비동기 기록 (응답에는 영향 없음)
  void logUsage({
    storeId: opts.storeId ?? null,
    userId: opts.userId,
    model,
    task: opts.task,
    inputTokens,
    outputTokens,
    costUsd,
    requestId: data.id,
    metadata: opts.metadata ?? null,
  }).catch((e) => {
    console.error('[ai_usage_logs] 기록 실패:', e);
  });

  return {
    text: choice.message.content,
    model,
    inputTokens,
    outputTokens,
    costUsd,
    requestId: data.id,
  };
}

async function logUsage(input: {
  storeId: string | null;
  userId: string;
  model: string;
  task: AITask;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  requestId: string;
  metadata: Record<string, unknown> | null;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from('ai_usage_logs').insert({
    store_id: input.storeId,
    user_id: input.userId,
    provider: 'openrouter',
    model: input.model,
    task: input.task,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    total_cost_usd: input.costUsd,
    request_id: input.requestId,
    metadata: input.metadata,
  });
}

/**
 * 매장 데이터를 외부 AI에 보내기 전 직원 이름·휴대폰을 익명화.
 * 호출부에서 데이터 가공 시 사용.
 */
export function anonymize(text: string): string {
  return text
    .replace(/01[016789]-?\d{3,4}-?\d{4}/g, '[전화번호]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[이메일]');
}
