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
  receiptPath?: string;
  saveAsTemplate?: boolean;
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
    receipt_url: input.receiptPath || null,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  // 반복 지출 템플릿으로도 저장 (선택)
  if (input.saveAsTemplate) {
    await supabase.from('expense_templates').insert({
      store_id: adminStore.storeId,
      name: input.itemName?.trim() || EXP_CAT_FALLBACK,
      category: input.category,
      amount: input.amount,
      payment_method: input.paymentMethod?.trim() || null,
      vendor: input.vendor || null,
      memo: input.memo || null,
      created_by: user.id,
    });
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  redirect('/expenses?saved=expense');
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장 권한이 없습니다.' };

  // 권한 검증: 이 지출이 현재 매장 소속인지 admin client로 확인 후 삭제 (RLS 우회)
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('expenses')
    .select('id, store_id')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { error: '지출을 찾을 수 없습니다.' };
  if (row.store_id !== adminStore.storeId) return { error: '이 매장의 지출이 아닙니다.' };

  const { error } = await admin.from('expenses').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { ok: true };
}


const EXP_CAT_FALLBACK = '반복 지출';

/** 반복 지출 템플릿 저장 (지출 입력과 별개로 직접 저장할 때) */
export async function createExpenseTemplate(input: {
  name: string;
  category: ExpenseCategory;
  amount: number;
  vendor?: string;
  memo?: string;
  paymentMethod?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };
  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };
  if (!input.name.trim()) return { error: '템플릿 이름을 입력해주세요.' };

  const { error } = await supabase.from('expense_templates').insert({
    store_id: adminStore.storeId,
    name: input.name.trim(),
    category: input.category,
    amount: input.amount,
    payment_method: input.paymentMethod?.trim() || null,
    vendor: input.vendor || null,
    memo: input.memo || null,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/expenses/new');
  return { ok: true };
}

/** 반복 지출 템플릿 삭제 */
export async function deleteExpenseTemplate(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };
  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장 권한이 없습니다.' };

  const { error } = await supabase
    .from('expense_templates')
    .delete()
    .eq('id', id)
    .eq('store_id', adminStore.storeId);
  if (error) return { error: error.message };
  revalidatePath('/expenses/new');
  return { ok: true };
}
