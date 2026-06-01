import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { SALE_CHANNELS, type SaleChannel } from '@/lib/constants';
import { formatKoDate } from '@/lib/utils';
import { EditDayForm } from './EditDayForm';

export const metadata = {
  title: '매출 수정 · 리테일메이트',
};

interface SaleRow {
  id: string;
  channel: SaleChannel;
  amount: number;
  memo: string | null;
}

export default async function EditDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  // 날짜 형식 가드 (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  const { data } = await supabase
    .from('sales')
    .select('id, channel, amount, memo')
    .eq('store_id', adminStore.storeId)
    .eq('sale_date', date);

  const rows = (data ?? []) as SaleRow[];

  const initialAmounts: Record<SaleChannel, number> = SALE_CHANNELS.reduce(
    (acc, c) => ({ ...acc, [c]: 0 }),
    {} as Record<SaleChannel, number>,
  );
  rows.forEach((r) => {
    if (r.channel in initialAmounts) {
      initialAmounts[r.channel] += Number(r.amount);
    }
  });
  const initialMemo = rows[0]?.memo ?? '';

  // 월 파라미터 (목록으로 돌아가기용)
  const month = date.slice(0, 7);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">매출 수정</h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatKoDate(date)} · 결제수단별 금액을 자유롭게 수정하세요.
            </p>
          </div>
          <Link
            href={`/sales?month=${month}`}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            ← 목록
          </Link>
        </div>

        <EditDayForm
          saleDate={date}
          initialAmounts={initialAmounts}
          initialMemo={initialMemo}
          hadAnyData={rows.length > 0}
        />
      </div>
    </div>
  );
}
