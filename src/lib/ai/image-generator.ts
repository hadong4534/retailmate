/**
 * AI 이미지 생성기 — OpenRouter `openai/gpt-5.4-image-2` 사용.
 *
 * 두 단계로 분리:
 *  1. createImageRow(input): pending row 생성 → imageId 즉시 반환
 *  2. runImageGeneration(imageId, input): OpenRouter 호출 + Storage 업로드 + row 업데이트
 *
 * 이렇게 분리하면 API route가 Step 1 후 즉시 응답하고
 * Step 2를 background로 실행할 수 있다.
 *
 * Storage 업로드: `ai-images/{store_id}/{image_id}.png`
 */

import { createAdminClient } from '@/lib/supabase/admin';

export const IMAGE_MODELS = {
  /** 메인 — 한글 텍스트 강함, 최고 품질 */
  primary: 'openai/gpt-5.4-image-2',
  /** 저렴 옵션 — 1/16 가격, 반복 생성·테스트용 */
  cheap: 'google/gemini-3.1-flash-image-preview',
  /** 사실적 사진 — 음식·상품 사진 */
  photo: 'google/gemini-3-pro-image-preview',
} as const;

export type ImageMode = 'brand' | 'free' | 'photo';
export type ImageKind = 'poster' | 'sns' | 'card_news' | 'free';

export interface BrandContext {
  storeName: string;
  industry: string | null;
  brandColor: string;
  brandSlogan: string | null;
  brandDescription: string | null;
  logoUrl: string | null;
}

export interface GenerateImageInput {
  userPrompt: string;
  mode: ImageMode;
  kind: ImageKind;
  brand?: BrandContext;
  pageNo?: number;
  setId?: string;
  storeId: string;
  userId: string;
}

export interface CreatedImageRow {
  imageId: string;
  finalPrompt: string;
  model: string;
}

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function buildPrompt(input: GenerateImageInput): string {
  if (input.mode === 'brand' && input.brand) {
    const b = input.brand;
    const parts: string[] = [];
    parts.push(`[매장 브랜드물 — ${b.storeName}]`);
    if (b.industry) parts.push(`업종: ${b.industry}`);
    if (b.brandSlogan) parts.push(`슬로건: "${b.brandSlogan}"`);
    if (b.brandDescription) parts.push(`매장 소개: ${b.brandDescription}`);
    parts.push(`메인 컬러: ${b.brandColor}`);
    parts.push('');
    parts.push(`요청 사항: ${input.userPrompt}`);
    parts.push('');

    if (input.kind === 'poster') {
      parts.push('포스터 형식으로 만들어주세요. 세로 비율 4:5 또는 3:4 권장.');
    } else if (input.kind === 'sns') {
      parts.push('SNS 정사각 1:1 비율로 만들어주세요. 가독성 높은 한글 텍스트.');
    } else if (input.kind === 'card_news') {
      parts.push(`카드뉴스 ${input.pageNo}/N 페이지. 1:1 정사각 비율, 큰 한글 제목 + 짧은 본문.`);
    }
    parts.push('한글 텍스트 정확하게 표기. 매장 슬로건이 있다면 자연스럽게 포함.');
    return parts.join('\n');
  }

  return input.userPrompt;
}

/**
 * Step 1) ai_images row 생성 (status=pending). 즉시 반환.
 */
export async function createImageRow(input: GenerateImageInput): Promise<CreatedImageRow> {
  const finalPrompt = buildPrompt(input);
  const model = input.mode === 'photo' ? IMAGE_MODELS.photo : IMAGE_MODELS.primary;

  const admin = createAdminClient();
  const { data: imageRow, error: insertErr } = await admin
    .from('ai_images')
    .insert({
      store_id: input.storeId,
      user_id: input.userId,
      kind: input.kind,
      user_prompt: input.userPrompt,
      final_prompt: finalPrompt,
      model,
      page_no: input.pageNo ?? 1,
      set_id: input.setId ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !imageRow) throw new Error(insertErr?.message ?? '이미지 row 생성 실패');

  return { imageId: imageRow.id, finalPrompt, model };
}

/**
 * Step 2) 백그라운드 실행 가능. OpenRouter 호출 → Storage 업로드 → row update.
 * 실패 시 row.status='failed' + error_message 기록 (예외 throw 안 함 — 호출자가 fire-and-forget).
 */
export async function runImageGeneration(
  row: CreatedImageRow,
  input: GenerateImageInput,
): Promise<void> {
  const admin = createAdminClient();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    await admin
      .from('ai_images')
      .update({ status: 'failed', error_message: 'OPENROUTER_API_KEY 미설정' })
      .eq('id', row.imageId);
    return;
  }

  try {
    const userMessageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: row.finalPrompt },
    ];

    if (input.mode === 'brand' && input.brand?.logoUrl) {
      userMessageContent.push({
        type: 'image_url',
        image_url: { url: input.brand.logoUrl },
      });
    }

    // 안전장치: 280초 내 미응답이면 abort → '생성 중' 무한 멈춤 방지(함수 timeout 전에 실패로 기록)
    const ac = new AbortController();
    const abortTimer = setTimeout(() => ac.abort(), 280_000);
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'RetailMate Image',
        },
        body: JSON.stringify({
          model: row.model,
          messages: [{ role: 'user', content: userMessageContent }],
          modalities: ['image', 'text'],
        }),
        signal: ac.signal,
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        throw new Error('이미지 생성이 지연되어 중단됐습니다. 잠시 후 다시 시도해주세요.');
      }
      throw e;
    } finally {
      clearTimeout(abortTimer);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter 실패 (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      id: string;
      choices?: Array<{
        message?: {
          content?: string;
          images?: Array<{ image_url?: { url?: string }; type?: string }>;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const images = data.choices?.[0]?.message?.images ?? [];
    let dataUrl = '';
    if (images.length > 0 && images[0].image_url?.url) {
      dataUrl = images[0].image_url.url;
    } else {
      const content = data.choices?.[0]?.message?.content ?? '';
      const m = content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);
      if (m) dataUrl = m[0];
    }

    if (!dataUrl) {
      throw new Error('응답에서 이미지를 찾을 수 없습니다.');
    }

    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const bytes = Buffer.from(base64, 'base64');

    const storagePath = `${input.storeId}/${row.imageId}.png`;
    const { error: uploadErr } = await admin.storage
      .from('ai-images')
      .upload(storagePath, bytes, {
        contentType: 'image/png',
        upsert: true,
      });
    if (uploadErr) throw uploadErr;

    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;
    const costUsd = row.model.includes('image-2') ? 0.04 : 0.01;

    await admin.from('ai_usage_logs').insert({
      store_id: input.storeId,
      user_id: input.userId,
      provider: 'openrouter',
      model: row.model,
      task: 'image',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_cost_usd: costUsd,
      request_id: data.id,
      metadata: { kind: input.kind, mode: input.mode },
    });

    await admin
      .from('ai_images')
      .update({
        status: 'done',
        image_path: storagePath,
        cost_usd: costUsd,
      })
      .eq('id', row.imageId);
  } catch (e) {
    console.error('[runImageGeneration] failed', e);
    await admin
      .from('ai_images')
      .update({
        status: 'failed',
        error_message: (e as Error).message ?? 'unknown',
      })
      .eq('id', row.imageId);
  }
}

/**
 * 매장 브랜드 컨텍스트 로드 (Server-side).
 * Storage logo_path가 있으면 signed URL 1시간 유효로 변환.
 */
export async function loadBrandContext(storeId: string): Promise<BrandContext | null> {
  const admin = createAdminClient();
  const { data: store } = await admin
    .from('stores')
    .select('name, industry, logo_path, brand_color, brand_slogan, brand_description')
    .eq('id', storeId)
    .maybeSingle();
  if (!store) return null;

  let logoUrl: string | null = null;
  if (store.logo_path) {
    const { data } = await admin.storage
      .from('ai-images')
      .createSignedUrl(store.logo_path, 60 * 60);
    logoUrl = data?.signedUrl ?? null;
  }

  return {
    storeName: store.name,
    industry: store.industry,
    brandColor: store.brand_color ?? '#7177EE',
    brandSlogan: store.brand_slogan,
    brandDescription: store.brand_description,
    logoUrl,
  };
}
