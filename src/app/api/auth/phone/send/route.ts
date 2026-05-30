import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createHash, randomInt } from 'node:crypto';
import { sendSms } from '@/lib/sms/solapi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 6자리 인증코드. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashCode(code: string, phone: string): string {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

function isValidKrPhone(digits: string) {
  return /^010\d{7,8}$/.test(digits);
}

export async function POST(request: Request) {
  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const raw = (body.phone ?? '').replace(/\D/g, '');
  if (!isValidKrPhone(raw)) {
    return NextResponse.json({ error: '휴대폰 번호 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 1분 내 동일 번호 발송 제한 (스팸·도용 방지)
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: recent } = await svc
    .from('phone_verifications')
    .select('id, created_at')
    .eq('phone', raw)
    .gte('created_at', oneMinAgo)
    .order('created_at', { ascending: false })
    .limit(1);
  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: '인증번호는 1분에 한 번 발송할 수 있습니다.' },
      { status: 429 },
    );
  }

  // 발급
  const code = generateCode();
  const codeHash = hashCode(code, raw);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const xff = request.headers.get('x-forwarded-for') ?? '';
  const clientIp = xff.split(',')[0]?.trim() || null;

  const { error: insertErr } = await svc.from('phone_verifications').insert({
    phone: raw,
    code_hash: codeHash,
    expires_at: expiresAt,
    client_ip: clientIp,
  });
  if (insertErr) {
    return NextResponse.json({ error: '인증번호 저장에 실패했습니다.' }, { status: 500 });
  }

  const result = await sendSms({
    to: raw,
    message: `[리테일메이트] 인증번호 ${code} (5분 이내 입력)`,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: `SMS 발송 실패: ${result.message || result.resultCode}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, expiresInSec: 300 });
}
