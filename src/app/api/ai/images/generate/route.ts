import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import {
  createImageRow,
  runImageGeneration,
  loadBrandContext,
  type ImageKind,
  type ImageMode,
} from '@/lib/ai/image-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  prompt: string;
  kind: ImageKind;
  mode: ImageMode; // brand | free | photo
}

export async function POST(request: Request) {
  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) {
    return NextResponse.json({ error: '프롬프트를 입력해주세요.' }, { status: 400 });
  }
  if (prompt.length > 500) {
    return NextResponse.json({ error: '프롬프트는 500자 이내여야 합니다.' }, { status: 400 });
  }

  const validKinds: ImageKind[] = ['poster', 'sns', 'card_news', 'free'];
  const validModes: ImageMode[] = ['brand', 'free', 'photo'];
  if (!validKinds.includes(body.kind)) {
    return NextResponse.json({ error: '유효하지 않은 kind입니다.' }, { status: 400 });
  }
  if (!validModes.includes(body.mode)) {
    return NextResponse.json({ error: '유효하지 않은 mode입니다.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) {
    return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 });
  }

  // brand 모드는 매장 컨텍스트 로드
  let brand;
  if (body.mode === 'brand') {
    brand = await loadBrandContext(adminStore.storeId);
    if (!brand) {
      return NextResponse.json({ error: '매장 정보를 불러올 수 없습니다.' }, { status: 500 });
    }
  }

  const input = {
    userPrompt: prompt,
    kind: body.kind,
    mode: body.mode,
    brand,
    storeId: adminStore.storeId,
    userId: user.id,
  };

  // Step 1) pending row 즉시 생성 (await)
  let row;
  try {
    row = await createImageRow(input);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? '이미지 row 생성 실패' },
      { status: 500 },
    );
  }

  // Step 2) 백그라운드로 OpenRouter 호출 (await 안 함)
  //  - 성공/실패 모두 row 상태로 기록되므로 클라이언트는 폴링으로 추적
  //  - dev/Node 런타임에서는 fire-and-forget이 안전하게 동작
  //  - 프로덕션 Vercel에서는 함수 종료가 일찍 끊길 수 있어 추후 queue 도입 필요
  void runImageGeneration(row, input).catch((err) => {
    console.error('[generate] background run failed', err);
  });

  return NextResponse.json(
    {
      imageId: row.imageId,
      kind: body.kind,
      status: 'pending',
    },
    { status: 202 },
  );
}
