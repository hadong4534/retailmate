'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CURRENT_STORE_COOKIE, getUserStoreContexts } from './store-context';
import { cookieDomainFor } from './cookie-domain';

export async function switchStore(storeId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const contexts = await getUserStoreContexts(supabase, user.id);
  const target = contexts.find((c) => c.storeId === storeId && c.isAdmin);
  if (!target) return { error: '해당 매장 관리 권한이 없습니다.' };

  const cookieStore = await cookies();
  const headersList = await headers();
  const domain = cookieDomainFor(headersList.get('host'));
  cookieStore.set(CURRENT_STORE_COOKIE, storeId, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    ...(domain ? { domain } : {}),
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}
