import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { ContractWizard } from './Wizard';
import type { ContractType } from '../actions';

export const metadata = {
  title: '근로계약서 작성 · 리테일메이트',
};

const VALID_TYPES: ContractType[] = ['fulltime', 'parttime', 'daily'];

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const initialType: ContractType | undefined =
    typeParam && VALID_TYPES.includes(typeParam as ContractType)
      ? (typeParam as ContractType)
      : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, address, detail_address')
    .eq('id', adminStore.storeId)
    .maybeSingle();
  if (!store) return null;

  const defaultAddress = [store.address, store.detail_address].filter(Boolean).join(' ');

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/contracts"
            className="text-sm text-slate-500 hover:text-slate-700"
            aria-label="뒤로"
          >
            ←
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">근로계약서 작성</h1>
        </div>

        <ContractWizard
          defaultWorkplaceAddress={defaultAddress}
          initialContractType={initialType}
        />
      </div>
    </div>
  );
}
