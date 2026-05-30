import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 폴링용 상태 조회 — 여러 imageId를 한 번에 조회.
 * GET /api/ai/images/status?ids=id1,id2,id3
 *
 * 응답: { items: [{id, status, kind, user_prompt, error_message}] }
 * RLS로 자동 필터되어 본인 매장 이미지만 반환.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get('ids');
  if (!idsParam) {
    return NextResponse.json({ items: [] });
  }

  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('ai_images')
    .select('id, status, kind, user_prompt, error_message')
    .in('id', ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
