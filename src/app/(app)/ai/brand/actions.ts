'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';

interface UpdateBrandInput {
  brand_color: string;
  brand_slogan: string;
  brand_description: string;
}

type Result = { ok: true } | { ok?: undefined; error: string };

export async function updateBrandSettings(input: UpdateBrandInput): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const { error } = await supabase
    .from('stores')
    .update({
      brand_color: input.brand_color || '#7177EE',
      brand_slogan: input.brand_slogan.trim() || null,
      brand_description: input.brand_description.trim() || null,
    })
    .eq('id', adminStore.storeId);

  if (error) return { error: error.message };

  revalidatePath('/ai/brand');
  revalidatePath('/ai', 'layout');
  return { ok: true };
}

export async function uploadLogo(formData: FormData): Promise<Result | { ok: true; path: string }> {
  const file = formData.get('logo');
  if (!(file instanceof File)) return { error: '파일이 없습니다.' };
  if (file.size === 0) return { error: '빈 파일입니다.' };
  if (file.size > 5 * 1024 * 1024) return { error: '파일은 5MB 이하만 가능합니다.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
  const allowedExt = ['png', 'jpg', 'jpeg', 'webp'];
  if (!allowedExt.includes(ext)) {
    return { error: 'PNG, JPG, WEBP 형식만 업로드 가능합니다.' };
  }

  const path = `${adminStore.storeId}/_brand/logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage
    .from('ai-images')
    .upload(path, buffer, {
      contentType: file.type || `image/${ext}`,
      upsert: true,
    });
  if (uploadErr) return { error: uploadErr.message };

  // stores.logo_path 갱신
  const { error: updateErr } = await admin
    .from('stores')
    .update({ logo_path: path })
    .eq('id', adminStore.storeId);
  if (updateErr) return { error: updateErr.message };

  revalidatePath('/ai/brand');
  revalidatePath('/ai', 'layout');
  return { ok: true, path };
}

export async function removeLogo(): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const admin = createAdminClient();
  const { data: store } = await admin
    .from('stores')
    .select('logo_path')
    .eq('id', adminStore.storeId)
    .maybeSingle();
  if (store?.logo_path) {
    await admin.storage.from('ai-images').remove([store.logo_path]);
  }
  await admin.from('stores').update({ logo_path: null }).eq('id', adminStore.storeId);

  revalidatePath('/ai/brand');
  return { ok: true };
}
