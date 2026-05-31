import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { loadStoreChatContext, buildSystemPrompt } from '@/lib/ai/chat-context';
import { MODELS } from '@/lib/ai/openrouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI 기능이 설정되지 않았습니다.' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return NextResponse.json({ error: '매장이 없습니다.' }, { status: 400 });

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: '메시지가 비어있습니다.' }, { status: 400 });
  }

  // 매장 컨텍스트 로드
  const ctx = await loadStoreChatContext(supabase, adminStore.storeId, adminStore.storeName);
  const systemPrompt = buildSystemPrompt(ctx);

  // OpenRouter 스트리밍 요청
  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'RetailMate Chat',
    },
    body: JSON.stringify({
      model: MODELS.sonnet,
      messages: [
        { role: 'system', content: systemPrompt },
        ...body.messages,
      ],
      temperature: 0.7,
      // 사용자 요청: 한도 완전 해제. max_tokens 미지정 → 모델 default(Claude Sonnet 4.6 = 64K)까지 응답 가능.
      // 비용 통제는 ai_usage_logs 사후 모니터링으로만 관리.
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text();
    return NextResponse.json(
      { error: `AI 호출 실패 (${upstream.status})`, detail: errText.slice(0, 200) },
      { status: 502 },
    );
  }

  // SSE 응답을 클라이언트에 패스스루 + 토큰 누적해서 사용량 기록
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let usageInputTokens = 0;
  let usageOutputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = '';
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // SSE 라인 파싱 — usage 정보 추출용
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
                usage?: { prompt_tokens: number; completion_tokens: number };
              };
              if (parsed.usage) {
                usageInputTokens = parsed.usage.prompt_tokens;
                usageOutputTokens = parsed.usage.completion_tokens;
              }
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // 무시 (중간 청크일 수 있음)
            }
          }
        }
      } catch (e) {
        console.error('[ai/chat] 스트림 오류:', e);
      } finally {
        controller.close();
        // 사용량 비동기 기록
        void logChatUsage({
          storeId: adminStore.storeId,
          userId: user.id,
          inputTokens: usageInputTokens,
          outputTokens: usageOutputTokens,
        }).catch((e) => console.error('[ai_usage_logs] chat 기록 실패:', e));
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function logChatUsage(input: {
  storeId: string;
  userId: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  // Sonnet 4.6 기준 단가
  const cost = input.inputTokens * 0.000003 + input.outputTokens * 0.000015;
  const admin = createAdminClient();
  await admin.from('ai_usage_logs').insert({
    store_id: input.storeId,
    user_id: input.userId,
    provider: 'openrouter',
    model: MODELS.sonnet,
    task: 'chat',
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    total_cost_usd: cost,
  });
}
