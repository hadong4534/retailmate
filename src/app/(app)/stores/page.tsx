import { Store as StoreIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUserStoreContexts, getCurrentAdminStore } from '@/lib/auth/store-context';
import { formatWon } from '@/lib/utils';
import { StoreEnterButton } from './StoreEnterButton';

export const metadata = { title: '전체 매장 · 리테일메이트' };
export const dynamic = 'force-dynamic';

function monthStartKST(): string {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return ymd.slice(0, 8) + '01';
}

export default async function StoresOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const contexts = await getUserStoreContexts(supabase, user.id);
  const adminStores = contexts.filter((c) => c.isAdmin);
  if (adminStores.length === 0) return null;
  const current = await getCurrentAdminStore(supabase, user.id);
  const ids = adminStores.map((s) => s.storeId);
  const mStart = monthStartKST();

  const [salesRes, expRes, workRes, memRes] = await Promise.all([
    supabase.from('sales').select('store_id, amount').in('store_id', ids).gte('sale_date', mStart),
    supabase.from('expenses').select('store_id, amount').in('store_id', ids).gte('expense_date', mStart),
    supabase.from('attendances').select('store_id').in('store_id', ids).is('check_out_at', null),
    supabase.from('store_members').select('store_id, role, is_active').in('store_id', ids),
  ]);

  const sumBy = (rows: { store_id: string; amount?: number }[] | null) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(r.store_id, (m.get(r.store_id) ?? 0) + Number(r.amount ?? 0)));
    return m;
  };
  const countBy = (rows: { store_id: string }[] | null) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(r.store_id, (m.get(r.store_id) ?? 0) + 1));
    return m;
  };

  const salesMap = sumBy(salesRes.data as { store_id: string; amount: number }[] | null);
  const expMap = sumBy(expRes.data as { store_id: string; amount: number }[] | null);
  const workMap = countBy(workRes.data as { store_id: string }[] | null);
  const memMap = new Map<string, number>();
  (memRes.data ?? []).forEach((r) => {
    if (r.role !== 'owner' && r.is_active) memMap.set(r.store_id, (memMap.get(r.store_id) ?? 0) + 1);
  });

  const rows = adminStores.map((s) => {
    const sales = salesMap.get(s.storeId) ?? 0;
    const exp = expMap.get(s.storeId) ?? 0;
    return {
      ...s, sales, exp, profit: sales - exp,
      working: workMap.get(s.storeId) ?? 0,
      members: memMap.get(s.storeId) ?? 0,
      isCurrent: current?.storeId === s.storeId,
    };
  });
  const total = rows.reduce((a, r) => ({ sales: a.sales + r.sales, exp: a.exp + r.exp, working: a.working + r.working, members: a.members + r.members }), { sales: 0, exp: 0, working: 0, members: 0 });

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF0FE] text-[#6366F1]"><StoreIcon className="h-5 w-5" /></span>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">전체 매장</h1>
            <p className="text-[13px] text-slate-500">{rows.length}개 매장 · 이번 달 합산 현황</p>
          </div>
        </div>

        {/* 합산 요약 */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Sum label="이달 매출 합계" value={`₩${formatWon(total.sales)}`} tone="primary" />
          <Sum label="이달 비용 합계" value={`₩${formatWon(total.exp)}`} />
          <Sum label="이달 순이익 합계" value={`₩${formatWon(total.profit)}`} tone={total.sales - total.exp >= 0 ? 'positive' : 'negative'} />
          <Sum label="근무 중 / 직원" value={`${total.working} / ${total.members}명`} />
        </div>

        {/* 매장 카드 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <section key={r.storeId} className="rounded-[20px] border border-[#E9EAF4] bg-white p-5 shadow-[0_8px_24px_-18px_rgba(99,102,241,0.3)]">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-[16px] font-bold text-slate-900">{r.storeName}</h2>
                <span className={'rounded-full px-2 py-0.5 text-[10.5px] font-semibold ' + (r.role === 'owner' ? 'bg-[#EEEEFD] text-[#5458E6]' : 'bg-emerald-50 text-emerald-600')}>
                  {r.role === 'owner' ? '최고관리자' : '매니저'}
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 text-[13px]">
                <Row k="이달 매출" v={`₩${formatWon(r.sales)}`} />
                <Row k="이달 비용" v={`₩${formatWon(r.exp)}`} />
                <Row k="순이익" v={`₩${formatWon(r.profit)}`} strong tone={r.profit >= 0 ? 'pos' : 'neg'} />
                <Row k="근무 중 / 직원" v={`${r.working} / ${r.members}명`} />
              </dl>
              <StoreEnterButton storeId={r.storeId} isCurrent={r.isCurrent} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sum({ label, value, tone }: { label: string; value: string; tone?: 'primary' | 'positive' | 'negative' }) {
  const c = tone === 'primary' ? 'text-[#5961E6]' : tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-red-500' : 'text-slate-900';
  return (
    <div className="rounded-[18px] border border-[#E9EAF4] bg-white p-4">
      <p className="text-[11.5px] text-slate-500">{label}</p>
      <p className={'mt-1.5 text-[18px] font-extrabold tabular-nums ' + c}>{value}</p>
    </div>
  );
}

function Row({ k, v, strong, tone }: { k: string; v: string; strong?: boolean; tone?: 'pos' | 'neg' }) {
  const c = tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-500' : 'text-slate-900';
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{k}</dt>
      <dd className={'tabular-nums ' + (strong ? 'font-bold ' : 'font-semibold ') + c}>{v}</dd>
    </div>
  );
}
