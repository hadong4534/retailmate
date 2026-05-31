'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import type { ExpenseCategory } from '@/lib/constants';

export async function createExpense(input: {
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string;
  memo: string;
  itemName?: string;
  paymentMethod?: string;
}) {
  if (!input.amount || input.amount <= 0) {
    return { error: '금액을 입력해주세요.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const { error } = await supabase.from('expenses').insert({
    store_id: adminStore.storeId,
    expense_date: input.expenseDate,
    category: input.category,
    amount: input.amount,
    item_name: input.itemName?.trim() || null,
    payment_method: input.paymentMethod?.trim() || null,
    vendor: input.vendor || null,
    memo: input.memo || null,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  redirect('/expenses');
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장 권한이 없습니다.' };

  // 권한 검증: 이 비용이 현재 매장 소속인지 admin client로 확인 후 삭제 (RLS 우회)
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('expenses')
    .select('id, store_id')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { error: '비용을 찾을 수 없습니다.' };
  if (row.store_id !== adminStore.storeId) return { error: '이 매장의 비용이 아닙니다.' };

  const { error } = await admin.from('expenses').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { ok: true };
}
