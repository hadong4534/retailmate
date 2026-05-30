'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import type { SaleChannel } from '@/lib/constants';

type ChannelAmounts = Partial<Record<SaleChannel, number>>;

export async function createSales(input: {
  saleDate: string;
  amounts: ChannelAmounts;
  memo: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const rows = Object.entries(input.amounts)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([channel, amount]) => ({
      store_id: adminStore.storeId,
      sale_date: input.saleDate,
      channel: channel as SaleChannel,
      amount,
      memo: input.memo || null,
      created_by: user.id,
    }));

  if (rows.length === 0) {
    return { error: '하나 이상의 채널에 금액을 입력해주세요.' };
  }

  const { error } = await supabase.from('sales').insert(rows);
  if (error) return { error: error.message };

  revalidatePath('/sales');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  redirect('/sales');
}

/**
 * 특정 날짜의 매출을 결제수단별로 수정.
 * 단순화 전략: 그 날짜의 row를 모두 삭제 후 새로 insert (memo는 row 단위로 동일).
 *
 * RLS는 sales 테이블에 대해 매장 admin만 INSERT/DELETE 허용해야 함 — 기존 정책이 적용됨.
 */
export async function updateDailySales(input: {
  saleDate: string;
  amounts: ChannelAmounts;
  memo: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const rows = Object.entries(input.amounts)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([channel, amount]) => ({
      store_id: adminStore.storeId,
      sale_date: input.saleDate,
      channel: channel as SaleChannel,
      amount,
      memo: input.memo || null,
      created_by: user.id,
    }));

  if (rows.length === 0) {
    return { error: '하나 이상의 채널에 금액을 입력해주세요. 전체 삭제는 별도 버튼을 사용하세요.' };
  }

  // 기존 row 삭제 → 새로 insert — admin client로 RLS 우회
  const admin = createAdminClient();
  const { error: delErr } = await admin
    .from('sales')
    .delete()
    .eq('store_id', adminStore.storeId)
    .eq('sale_date', input.saleDate);
  if (delErr) return { error: delErr.message };

  const { error: insErr } = await admin.from('sales').insert(rows);
  if (insErr) return { error: insErr.message };

  revalidatePath('/sales');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { ok: true };
}

/**
 * 특정 날짜의 모든 매출 row 삭제.
 */
export async function deleteDailySales(input: { saleDate: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return { error: '매장을 찾을 수 없습니다.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('sales')
    .delete()
    .eq('store_id', adminStore.storeId)
    .eq('sale_date', input.saleDate);
  if (error) return { error: error.message };

  revalidatePath('/sales');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { ok: true };
}
