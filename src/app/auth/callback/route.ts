import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Supabase OAuth(카카오 등) 콜백 처리.
 * Supabase → 우리 도메인으로 `?code=...&next=...` 형태로 리다이렉트되면,
 * 여기서 코드를 세션으로 교환한 뒤 next로 보낸다.
 *
 * 가입 직후(=processed=false)면 매장 등록 온보딩으로,
 * 이미 매장이 있으면 next 또는 대시보드로 이동.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth_no_code', url.origin));
  }

  const supabase = await createClient();
  const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !exchanged.user) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', url.origin));
  }

  // 신규 가입자(=매장 없음)는 매장 등록 단계로 보낸다.
  const userId = exchanged.user.id;
  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', userId)
    .limit(1);

  if (!stores || stores.length === 0) {
    return NextResponse.redirect(new URL('/onboarding/store', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
