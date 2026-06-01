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
  redirect('/sales?saved=sale');
}

/**
 * 특정 날짜의 매출을 결제수단별로 수정 (비파괴 방식).
 *
 * 기존엔 그날 row를 전부 삭제 후 재삽입했으나(감사이력 소실 + 중간 실패 시 매출 증발 위험),
 * 채널별로 기존 row를 in-place 수정 / 신규 추가 / 0원이 된 채널만 삭제하도록 변경.
 * → created_at·created_by·row id가 보존되고, 부분 실패에도 그날 매출이 통째로 사라지지 않는다.
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

  const anyPositive = Object.values(input.amounts).some((a) => (a ?? 0) > 0);
  if (!anyPositive) {
    return { error: '하나 이상의 채널에 금액을 입력해주세요. 전체 삭제는 별도 버튼을 사용하세요.' };
  }

  const memo = input.memo || null;
  const admin = createAdminClient();

  const { data: existing, error: selErr } = await admin
    .from('sales')
    .select('id, channel, amount')
    .eq('store_id', adminStore.storeId)
    .eq('sale_date', input.saleDate);
  if (selErr) return { error: selErr.message };

  const byChannel = new Map<string, string[]>();
  (existing ?? []).forEach((r) => {
    const arr = byChannel.get(r.channel as string) ?? [];
    arr.push(r.id as string);
    byChannel.set(r.channel as string, arr);
  });

  for (const [channel, amtRaw] of Object.entries(input.amounts)) {
    const amount = amtRaw ?? 0;
    const ch = channel as SaleChannel;
    const ids = byChannel.get(ch) ?? [];
    if (amount > 0) {
      if (ids.length > 0) {
        const { error } = await admin.from('sales').update({ amount, memo }).eq('id', ids[0]);
        if (error) return { error: error.message };
        for (let i = 1; i < ids.length; i++) {
          const { error: dErr } = await admin.from('sales').delete().eq('id', ids[i]);
          if (dErr) return { error: dErr.message };
        }
      } else {
        const { error } = await admin.from('sales').insert({
          store_id: adminStore.storeId,
          sale_date: input.saleDate,
          channel: ch,
          amount,
          memo,
          created_by: user.id,
        });
        if (error) return { error: error.message };
      }
      byChannel.delete(ch);
    }
  }

  for (const ids of byChannel.values()) {
    for (const id of ids) {
      const { error } = await admin.from('sales').delete().eq('id', id);
      if (error) return { error: error.message };
    }
  }

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
