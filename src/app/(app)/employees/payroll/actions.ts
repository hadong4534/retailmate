'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { getStorePayroll } from '@/lib/payroll/store-payroll';

/**
 * 해당 월의 총급여(세전 합계)를 지출의 '인건비' 1건으로 반영.
 * - 같은 달 '인건비(YYYY-MM 급여)' 항목이 이미 있으면 금액만 갱신 → 중복 방지.
 * - 급여를 지출에 따로 또 입력하는 이중 작업을 없앤다.
 */
export async function reflectPayrollToExpense(month: string): Promise<
  { ok: true; amount: number; updated: boolean } | { error: string }
> {
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: '월 형식이 올바르지 않습니다.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };
  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장 권한이 없습니다.' };

  const payroll = await getStorePayroll(supabase, adminStore.storeId, month);
  const amount = payroll.totals.grossPay;
  if (!amount || amount <= 0) return { error: '이 달에 반영할 급여 금액이 없습니다.' };

  // 그 달 말일을 지출일로
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const expenseDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  const itemName = `${month} 급여`;

  // 중복 방지: 같은 달 인건비 항목 조회
  const { data: existing } = await supabase
    .from('expenses')
    .select('id')
    .eq('store_id', adminStore.storeId)
    .eq('category', 'labor')
    .eq('item_name', itemName)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('expenses')
      .update({ amount, expense_date: expenseDate, payment_method: '계좌이체' })
      .eq('id', existing.id);
    if (error) return { error: error.message };
    revalidatePath('/expenses'); revalidatePath('/dashboard'); revalidatePath('/reports');
    return { ok: true, amount, updated: true };
  }

  const { error } = await supabase.from('expenses').insert({
    store_id: adminStore.storeId,
    expense_date: expenseDate,
    category: 'labor',
    amount,
    item_name: itemName,
    payment_method: '계좌이체',
    memo: '급여 계산에서 자동 반영',
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/expenses'); revalidatePath('/dashboard'); revalidatePath('/reports');
  return { ok: true, amount, updated: false };
}
