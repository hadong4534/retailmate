'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CURRENT_STORE_COOKIE } from '@/lib/auth/store-context';
import { cookieDomainFor } from '@/lib/auth/cookie-domain';

export interface CreateStoreInput {
  name: string;
  industry: string;
  business_no: string;
  address: string;
  postcode: string;
  detail_address: string;
  monthly_target: number;
}

export async function createStore(
  input: CreateStoreInput,
): Promise<{ ok: true; storeId: string } | { error: string }> {
  if (!input.name.trim()) return { error: '매장명을 입력해주세요.' };
  if (!input.address.trim()) return { error: '매장 주소를 입력해주세요.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { data: store, error } = await supabase
    .from('stores')
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      industry: input.industry || null,
      business_no: input.business_no || null,
      address: input.address.trim(),
      postcode: input.postcode || null,
      detail_address: input.detail_address || null,
      monthly_target: input.monthly_target || 0,
    })
    .select('id')
    .single();

  if (error || !store) return { error: error?.message ?? '매장 등록에 실패했습니다.' };

  // 새 매장으로 자동 전환
  const cookieStore = await cookies();
  const headersList = await headers();
  const domain = cookieDomainFor(headersList.get('host'));
  cookieStore.set(CURRENT_STORE_COOKIE, store.id, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    ...(domain ? { domain } : {}),
  });

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
