'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';

export type NoticeTarget = 'all' | 'employees';

export interface CreateNoticeInput {
  title: string;
  body: string;
  target: NoticeTarget;
  is_pinned: boolean;
  expires_at: string | null;
}

export async function createNotice(input: CreateNoticeInput) {
  if (!input.title.trim()) return { error: '제목을 입력해주세요.' };
  if (!input.body.trim()) return { error: '내용을 입력해주세요.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const { error } = await supabase.from('notices').insert({
    store_id: adminStore.storeId,
    author_id: user.id,
    title: input.title.trim(),
    body: input.body.trim(),
    target: input.target,
    is_pinned: input.is_pinned,
    expires_at: input.expires_at,
  });
  if (error) return { error: error.message };

  revalidatePath('/notices');
  revalidatePath('/dashboard');
  revalidatePath('/employee/me');
  redirect('/notices');
}

export async function deleteNotice(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장 권한이 없습니다.' };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from('notices')
    .select('id, store_id')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { error: '공지를 찾을 수 없습니다.' };
  if (row.store_id !== adminStore.storeId) return { error: '이 매장의 공지가 아닙니다.' };

  const { error } = await admin.from('notices').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/notices');
  revalidatePath('/dashboard');
  revalidatePath('/employee/me');
  return { ok: true };
}

export async function markNoticeRead(noticeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  // upsert (이미 읽었으면 무시)
  const { error } = await supabase
    .from('notice_reads')
    .upsert(
      { notice_id: noticeId, user_id: user.id },
      { onConflict: 'notice_id,user_id' },
    );
  if (error) return { error: error.message };

  return { ok: true };
}
