import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 아이디(이메일) 찾기 — 휴대폰 인증을 마친 번호로 가입된 계정을 알려준다.
 *
 * 보안: 직전 10분 내 verified_at이 찍힌 phone_verifications 행이 있어야 조회 가능
 * (인증번호 발송/검증은 기존 /api/auth/phone/send·verify를 그대로 사용).
 */
export async function POST(request: Request) {
  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const phone = (body.phone ?? '').replace(/\D/g, '');
  if (!/^010\d{7,8}$/.test(phone)) {
    return NextResponse.json({ error: '휴대폰 번호 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 1) 최근 10분 내 본인인증 완료 여부 확인
  const { data: vers } = await svc
    .from('phone_verifications')
    .select('verified_at')
    .eq('phone', phone)
    .not('verified_at', 'is', null)
    .order('verified_at', { ascending: false })
    .limit(1);
  const v = vers?.[0];
  if (!v || Date.now() - new Date(v.verified_at as string).getTime() > 10 * 60 * 1000) {
    return NextResponse.json({ error: '휴대폰 인증을 먼저 완료해주세요.' }, { status: 401 });
  }

  // 2) 해당 번호로 등록된 프로필 → 계정(이메일·가입방식) 조회
  const { data: profs } = await svc
    .from('profiles')
    .select('id, name')
    .eq('phone', phone)
    .limit(5);

  const accounts: { email: string | null; provider: 'kakao' | 'email'; name: string | null }[] = [];
  for (const p of profs ?? []) {
    const { data: ures } = await svc.auth.admin.getUserById(p.id as string);
    const u = ures?.user;
    if (!u) continue;
    const providers = (u.app_metadata?.providers as string[] | undefined) ?? [];
    const provider =
      providers.includes('kakao') || u.app_metadata?.provider === 'kakao' ? 'kakao' : 'email';
    accounts.push({
      email: u.email ?? null,
      provider,
      name: (p as { name?: string | null }).name ?? null,
    });
  }

  return NextResponse.json({ accounts });
}
