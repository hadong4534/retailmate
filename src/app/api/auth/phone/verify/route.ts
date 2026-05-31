import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

function hashCode(code: string, phone: string): string {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

export async function POST(request: Request) {
  let body: { phone?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const phone = (body.phone ?? '').replace(/\D/g, '');
  const code = (body.code ?? '').trim();

  if (!/^010\d{7,8}$/.test(phone)) {
    return NextResponse.json({ error: '휴대폰 번호 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: '6자리 인증번호를 입력하세요.' }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 가장 최근 발급된 미검증 코드 조회
  const { data: rows, error: selErr } = await svc
    .from('phone_verifications')
    .select('id, code_hash, expires_at, attempts, verified_at')
    .eq('phone', phone)
    .is('verified_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (selErr) {
    return NextResponse.json({ error: '인증 조회 실패' }, { status: 500 });
  }
  const row = rows?.[0];
  if (!row) {
    return NextResponse.json(
      { error: '발급된 인증번호가 없습니다. 다시 요청해주세요.' },
      { status: 400 },
    );
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: '인증번호가 만료되었습니다. 다시 요청해주세요.' },
      { status: 400 },
    );
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: '시도 횟수 초과. 다시 요청해주세요.' },
      { status: 429 },
    );
  }

  const expectedHash = hashCode(code, phone);
  if (expectedHash !== row.code_hash) {
    await svc
      .from('phone_verifications')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id);
    return NextResponse.json(
      { error: `인증번호가 일치하지 않습니다. (남은 시도 ${MAX_ATTEMPTS - row.attempts - 1}회)` },
      { status: 400 },
    );
  }

  await svc
    .from('phone_verifications')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', row.id);

  return NextResponse.json({ ok: true });
}
