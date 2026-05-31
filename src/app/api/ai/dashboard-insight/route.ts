import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { generateAIInsights } from '@/lib/ai/insight-generator';
import type { InsightInput } from '@/lib/insights/rules';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 대시보드 AI 인사이트 비동기 fetch 엔드포인트.
 *
 * 클라이언트에서 페이지 로드 후 호출 → 서버가 OpenRouter(Claude)로 AI 인사이트 생성 → JSON 반환.
 * 모바일 streaming SSR을 막지 않으면서 AI 기능을 유지하기 위한 패턴.
 */
export async function POST(request: Request) {
  let body: { input?: InsightInput };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }
  if (!body.input) {
    return NextResponse.json({ error: 'input이 필요합니다.' }, { status: 400 });
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

  // generateAIInsights 내부에서 OpenRouter 호출 + 실패 시 룰 기반 fallback
  const { data: storeRow } = await supabase
    .from('stores')
    .select('industry')
    .eq('id', adminStore.storeId)
    .maybeSingle();

  const result = await generateAIInsights(body.input, {
    storeId: adminStore.storeId,
    userId: user.id,
    storeName: adminStore.storeName,
    storeIndustry: storeRow?.industry ?? null,
  });

  return NextResponse.json({
    items: result.items,
    source: result.source,
  });
}
