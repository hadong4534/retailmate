import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// SMS 인증된 phone이 가입에 사용 가능한 최대 시간 (10분)
const VERIFICATION_VALID_MS = 10 * 60 * 1000;

interface SignupBody {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  /** 'owner' (사장님) | 'employee' (직원, 계약서 서명 흐름) — 기본 'owner' */
  accountType?: 'owner' | 'employee';
}

export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const name = (body.name ?? '').trim();
  const phone = (body.phone ?? '').replace(/\D/g, '');
  const accountType: 'owner' | 'employee' = body.accountType === 'employee' ? 'employee' : 'owner';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '이메일 형식을 확인하세요.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 });
  }
  if (!/^010\d{7,8}$/.test(phone)) {
    return NextResponse.json({ error: '휴대폰 번호 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // SMS 인증 영수증 확인 — 최근 10분 내 검증되고 아직 미사용
  const validAfter = new Date(Date.now() - VERIFICATION_VALID_MS).toISOString();
  const { data: rcpt, error: rcptErr } = await svc
    .from('phone_verifications')
    .select('id, verified_at, consumed_at')
    .eq('phone', phone)
    .not('verified_at', 'is', null)
    .is('consumed_at', null)
    .gte('verified_at', validAfter)
    .order('verified_at', { ascending: false })
    .limit(1);
  if (rcptErr) {
    return NextResponse.json({ error: '인증 확인 중 오류가 발생했습니다.' }, { status: 500 });
  }
  const receipt = rcpt?.[0];
  if (!receipt) {
    return NextResponse.json(
      { error: '휴대폰 인증이 만료되었거나 일치하지 않습니다. 다시 인증해주세요.' },
      { status: 400 },
    );
  }

  // 같은 phone으로 이미 가입한 계정 차단
  // ⚠ profiles.phone은 normalize_phone() 기반 partial UNIQUE 인덱스가 걸려 있음 (migration 008).
  //    raw .eq()는 dash 표기 차이("010-4534-6000" vs "01045346000")를 못 잡으므로
  //    가능한 두 표기형을 .in()으로 모두 검사해 한 단계 앞당겨 안내한다.
  const phoneDashed =
    phone.length === 11
      ? `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
      : `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  const { data: existingProfiles } = await svc
    .from('profiles')
    .select('id, name, email')
    .in('phone', [phone, phoneDashed])
    .limit(1);
  if (existingProfiles && existingProfiles.length > 0) {
    const owner = existingProfiles[0];
    return NextResponse.json(
      {
        error: `이 번호(${phoneDashed})는 이미 ${owner.name ?? '다른 계정'}님 명의로 가입되어 있습니다. 기존 계정(${owner.email ?? '이메일 미상'})으로 로그인해주세요.`,
      },
      { status: 409 },
    );
  }

  // 1) auth.users 생성 (email_confirm=true 로 이메일 검증 단계 스킵)
  //    role 메타데이터는 단순 표식이며 실제 권한은 store_members.role로 결정됨.
  //    직원은 이후 계약서 서명 단계에서 store_members에 'employee'로 등록됨.
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone, role: accountType },
  });
  if (createErr || !created.user) {
    const m = createErr?.message ?? '';
    if (/duplicate|already/i.test(m)) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 });
    }
    return NextResponse.json(
      { error: '가입 처리에 실패했습니다.' },
      { status: 500 },
    );
  }

  // 2) profiles 업데이트 (트리거 handle_new_user가 (id, email, name)을 미리 채워둠).
  //    email도 페이로드에 함께 명시 — 트리거가 어떤 사유로 row를 못 만든 케이스에서 NOT NULL 안전망 역할.
  const { error: profileErr } = await svc
    .from('profiles')
    .upsert({
      id: created.user.id,
      email,
      name,
      phone,
      phone_verified: true,
    });
  if (profileErr) {
    // 가입 직후 profile 저장 실패 → auth.users에 orphan row가 남으므로 즉시 롤백.
    await svc.auth.admin.deleteUser(created.user.id).catch(() => {});

    // Postgres 23505 = unique_violation. uniq_profiles_phone 위반이면 phone 중복으로 정확히 안내.
    const errMsg = profileErr.message ?? '';
    const errCode = (profileErr as { code?: string }).code ?? '';
    if (errCode === '23505' || /uniq_profiles_phone|duplicate key/i.test(errMsg)) {
      return NextResponse.json(
        {
          error: `이 번호(${phoneDashed})는 이미 다른 계정에 등록되어 있습니다. 같은 번호로는 추가 가입할 수 없습니다 — 기존 계정으로 로그인해주세요.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: `프로필 저장 실패: ${errMsg || '알 수 없는 오류'}. 다시 시도해주세요.` },
      { status: 500 },
    );
  }

  // 3) 영수증 소비 처리
  await svc
    .from('phone_verifications')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', receipt.id);

  return NextResponse.json({ ok: true });
}
