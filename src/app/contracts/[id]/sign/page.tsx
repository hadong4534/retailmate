import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/ui/Logo';
import { SignFlow } from './SignFlow';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '근로계약서 서명 · 리테일메이트',
};

export default async function SignContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: token } = await params;
  const admin = createAdminClient();

  const { data: contract } = await admin
    .from('labor_contracts')
    .select(
      'id, store_id, contract_type, status, sign_token_expires_at, invite_name, invite_phone, work_start_date, work_end_date, workplace_address, job_description, work_days, work_start_time, work_end_time, break_minutes, wage_type, wage_amount, weekly_holiday_allowance, social_insurance, pay_day, pay_method, annual_leave_policy, additional_terms',
    )
    .eq('sign_token', token)
    .maybeSingle();

  let store: { name: string; address: string; business_no: string | null } | null = null;
  let ownerName = '사장님';
  if (contract) {
    const { data: storeData } = await admin
      .from('stores')
      .select('name, address, owner_id, business_no')
      .eq('id', contract.store_id)
      .maybeSingle();
    if (storeData) {
      store = { name: storeData.name, address: storeData.address, business_no: storeData.business_no };
      const { data: ownerProfile } = await admin
        .from('profiles')
        .select('name')
        .eq('id', storeData.owner_id)
        .maybeSingle();
      if (ownerProfile) ownerName = ownerProfile.name;
    }
  }

  // 현재 로그인 상태(직원 본인 여부 판단용)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isExpired =
    !!contract?.sign_token_expires_at &&
    new Date(contract.sign_token_expires_at) < new Date();
  const isSigned = contract?.status === 'signed';
  const isCancelled = contract?.status === 'cancelled';

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="border-b border-slate-200 bg-white"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link href="/" aria-label="리테일메이트 홈">
            <Logo size="md" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {!contract || !store ? (
          <ErrorCard
            title="유효하지 않은 링크"
            message="서명 링크가 잘못되었거나 만료되었습니다. 사장님께 재발급을 요청해주세요."
          />
        ) : isCancelled ? (
          <ErrorCard
            title="취소된 계약서"
            message="이 계약서는 사장님이 취소했습니다. 새 계약서가 필요하면 사장님께 다시 요청해주세요."
          />
        ) : isExpired ? (
          <ErrorCard
            title="만료된 링크"
            message="이 서명 링크는 만료되었습니다. 사장님께 재발급을 요청해주세요."
          />
        ) : isSigned ? (
          <ErrorCard
            title="이미 서명 완료"
            message="이 계약서는 이미 서명이 완료되었습니다."
            tone="success"
          />
        ) : (
          <SignFlow
            token={token}
            contract={contract}
            store={store}
            ownerName={ownerName}
            currentUserEmail={user?.email ?? null}
          />
        )}
      </main>
    </div>
  );
}

function ErrorCard({
  title,
  message,
  tone = 'error',
}: {
  title: string;
  message: string;
  tone?: 'error' | 'success';
}) {
  const colorClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-red-200 bg-red-50 text-red-900';
  const iconWrap =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-600'
      : 'bg-red-100 text-red-600';
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`rounded-2xl border ${colorClass} px-6 py-10 text-center`}>
      <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${iconWrap}`}>
        <Icon className="h-6 w-6" strokeWidth={2.2} />
      </span>
      <h1 className="mt-3 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

