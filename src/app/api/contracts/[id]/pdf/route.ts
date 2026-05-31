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

  // RLS 적용 client로 권한 확인 (사장 또는 본인 직원만 조회 가능)
  const { data: contract } = await supabase
    .from('labor_contracts')
    .select('id, store_id, pdf_url, status')
    .eq('id', id)
    .maybeSingle();
  if (!contract) {
    return NextResponse.json({ error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!contract.pdf_url) {
    return NextResponse.json(
      { error: 'PDF가 아직 생성되지 않았습니다. 보기 페이지에서 [PDF 재생성]을 눌러주세요.' },
      { status: 404 },
    );
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage
    .from('contracts')
    .download(contract.pdf_url);
  if (error || !blob) {
    return NextResponse.json(
      { error: error?.message ?? 'PDF 다운로드 실패' },
      { status: 500 },
    );
  }

  const buffer = await blob.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="contract-${id}.pdf"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
