import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // RLS 적용 client로 권한 확인 (매장 멤버만)
  const { data: image } = await supabase
    .from('ai_images')
    .select('id, image_path, status, kind')
    .eq('id', id)
    .maybeSingle();
  if (!image || !image.image_path) {
    return NextResponse.json({ error: '이미지를 찾을 수 없습니다.' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage
    .from('ai-images')
    .download(image.image_path);
  if (error || !blob) {
    return NextResponse.json(
      { error: error?.message ?? '다운로드 실패' },
      { status: 500 },
    );
  }

  const buffer = await blob.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="retailmate-${image.kind}-${id}.png"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 1) RLS 통과해야 권한 OK — 매장 admin 멤버만 row 접근 가능
  const { data: image, error: selectErr } = await supabase
    .from('ai_images')
    .select('id, image_path, store_id')
    .eq('id', id)
    .maybeSingle();
  if (selectErr) {
    return NextResponse.json({ error: selectErr.message }, { status: 500 });
  }
  if (!image) {
    return NextResponse.json({ error: '이미지를 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
  }

  const admin = createAdminClient();

  // 2) Storage 파일 삭제 (존재하지 않으면 무시)
  if (image.image_path) {
    const { error: storageErr } = await admin.storage
      .from('ai-images')
      .remove([image.image_path]);
    if (storageErr) {
      console.warn('[delete image] storage 삭제 경고:', storageErr.message);
      // storage 삭제 실패해도 row 삭제는 진행 — 고아 row 방지
    }
  }

  // 3) DB row 삭제
  const { error: deleteErr } = await admin
    .from('ai_images')
    .delete()
    .eq('id', id);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
