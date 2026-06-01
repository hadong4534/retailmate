import Link from 'next/link';
import { FileText, FilePlus, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPageContext } from '@/lib/auth/page-context';
import { Button } from '@/components/ui/Button';
import { StaffHubCards } from '@/components/layout/StaffHubCards';
import { ChannelDonut } from '@/components/charts/ChannelDonut';
import { PageHeader } from '@/components/app';
import { EmptyDocument } from '@/components/app/EmptyIllustration';
import { todayInKST } from '@/lib/utils';
import { CopySignLinkButton } from './CopySignLinkButton';
import { CancelContractButton } from './CancelContractButton';
import { ContractCardActions } from './ContractCardActions';
import { DeleteContractButton } from './DeleteContractButton';

interface ContractRow {
  id: string;
  employee_id: string | null;
  invite_name: string | null;
  invite_phone: string | null;
  contract_type: 'fulltime' | 'parttime' | 'daily' | 'nda';
  status: 'draft' | 'sent' | 'signed' | 'terminated' | 'cancelled';
  work_start_date: string;
  work_end_date: string | null;
  wage_type: 'hourly' | 'monthly' | 'daily';
  wage_amount: number;
  pdf_url: string | null;
  sign_token: string | null;
  sign_token_expires_at: string | null;
  owner_signed_at: string | null;
  employee_signed_at: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  name: string;
  phone: string | null;
}

interface TemplateRow {
  id: string;
  name: string;
  template_kind: string;
  description: string | null;
}

const TYPE_LABEL: Record<ContractRow['contract_type'], string> = {
  fulltime: '정규직',
  parttime: '파트타임',
  daily: '계약직',
  nda: '비밀유지',
};

const STATUS_META: Record<
  ContractRow['status'],
  { text: string; chip: string; chipText: string }
> = {
  draft: { text: '작성 중', chip: 'bg-slate-100', chipText: 'text-slate-700' },
  sent: { text: '대기중', chip: 'bg-amber-100', chipText: 'text-amber-700' },
  signed: { text: '서명 완료', chip: 'bg-emerald-100', chipText: 'text-emerald-700' },
  terminated: { text: '종료', chip: 'bg-slate-100', chipText: 'text-slate-500' },
  cancelled: { text: '취소됨', chip: 'bg-red-100', chipText: 'text-red-700' },
};

const KIND_ICON: Record<string, string> = {
  fulltime: '정규',
  parttime: '단시',
  daily: '계약',
  nda: 'NDA',
  custom: '기타',
};

export const metadata = {
  title: '계약서 · 리테일메이트',
};

export default async function ContractsPage() {
  const supabase = await createClient();
  const ctx = await getPageContext(supabase);
  if (!ctx) return null;
  const store = { id: ctx.adminStore.storeId };

  // 실제 매장 사장의 user_id — 사장 본인이 잘못 employee로 서명한 계약 row를 목록에서 제외하기 위함.
  // 사장은 본인 매장의 직원이 될 수 없으므로 employee_id === owner_id 인 row는 항상 잘못된 데이터로 간주.
  const { data: storeRow } = await supabase
    .from('stores')
    .select('owner_id')
    .eq('id', store.id)
    .maybeSingle();
  const ownerUserId = storeRow?.owner_id ?? null;

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const expireSoon = new Date(today);
  expireSoon.setDate(expireSoon.getDate() + 30);
  const expireSoonStr = expireSoon.toISOString().slice(0, 10);
  // KST 기준 — 만료 임박 D-day가 KST 자정 직후 1일 어긋나는 것 방지.
  const todayStr = todayInKST();

  const [{ data: contractsData }, { data: templatesData }] = await Promise.all([
    supabase
      .from('labor_contracts')
      .select(
        'id, employee_id, invite_name, invite_phone, contract_type, status, work_start_date, work_end_date, wage_type, wage_amount, pdf_url, sign_token, sign_token_expires_at, owner_signed_at, employee_signed_at, created_at',
      )
      .eq('store_id', store.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_templates')
      .select('id, name, template_kind, description')
      .or(`store_id.is.null,store_id.eq.${store.id}`)
      .eq('is_active', true)
      .order('template_kind', { ascending: true }),
  ]);

  // 사장 본인이 서명자로 잡힌 row는 자동 숨김 (잘못된 데이터 방어).
  const contracts = ((contractsData ?? []) as ContractRow[]).filter(
    (c) => !ownerUserId || c.employee_id !== ownerUserId,
  );
  const templates = (templatesData ?? []) as TemplateRow[];

  // 직원 profile 조회
  const employeeIds = Array.from(
    new Set(contracts.map((c) => c.employee_id).filter((id): id is string => !!id)),
  );
  const profileMap = new Map<string, ProfileRow>();
  if (employeeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, phone')
      .in('id', employeeIds);
    (profiles ?? []).forEach((p) => profileMap.set(p.id, p as ProfileRow));
  }

  // 카운트 집계
  const totalCount = contracts.length;
  const signedCount = contracts.filter((c) => c.status === 'signed').length;
  const pendingCount = contracts.filter((c) => c.status === 'sent').length;
  const draftCount = contracts.filter((c) => c.status === 'draft').length;
  const expiringSoon = contracts.filter(
    (c) =>
      c.status === 'signed' &&
      c.work_end_date &&
      c.work_end_date <= expireSoonStr &&
      c.work_end_date >= todayStr,
  );
  const newThisMonth = contracts.filter((c) => c.created_at >= monthStart).length;

  // 평균 처리일
  const signedWithDates = contracts.filter((c) => c.status === 'signed' && c.employee_signed_at);
  const avgProcessDays = signedWithDates.length > 0
    ? Math.round(
        (signedWithDates.reduce((acc, c) => {
          const created = new Date(c.created_at).getTime();
          const signed = new Date(c.employee_signed_at!).getTime();
          return acc + (signed - created) / (1000 * 60 * 60 * 24);
        }, 0) /
          signedWithDates.length) * 10,
      ) / 10
    : 0;

  // 도넛 데이터
  const donutData = [
    { name: '서명 완료', value: signedCount, color: '#10b981' },
    { name: '서명 대기', value: pendingCount, color: '#f59e0b' },
    { name: '만료 예정', value: expiringSoon.length, color: '#ef4444' },
    { name: '작성 중', value: draftCount, color: '#94a3b8' },
  ].filter((d) => d.value > 0);

  // 최근 서명 요청 5건
  const recentRequests = contracts
    .filter((c) => c.status === 'sent' || c.status === 'signed')
    .slice(0, 5);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <StaffHubCards activeHref="/contracts" />

        <PageHeader
          Icon={FileText}
          tone="emerald"
          title="계약서"
          description="직원 계약서 작성·서명·만료 일정을 한눈에 관리하세요."
          right={
            <Link href="/contracts/new">
              <Button size="sm">+ 계약서 작성</Button>
            </Link>
          }
          className="mb-5"
        />

        {/* 상단 현황 */}
        <div className="rm-stagger grid grid-cols-1 gap-4 lg:grid-cols-4">
          <section className="rounded-xl border border-[#EAECF5] bg-white p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">전체 계약서 현황</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatusCard count={totalCount} label="전체" tone="blue" />
              <StatusCard count={signedCount} label="서명 완료" tone="emerald" />
              <StatusCard count={pendingCount} label="서명 대기" tone="amber" />
              <StatusCard count={expiringSoon.length} label="만료 예정" tone="red" />
            </div>
          </section>

          <KpiCard
            Icon={FilePlus}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            label="이번 달 신규 계약"
            value={`${newThisMonth}건`}
            sub={newThisMonth > 0 ? '활발한 채용' : '신규 없음'}
          />
          <KpiCard
            Icon={Clock}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            label="평균 처리일"
            value={avgProcessDays > 0 ? `${avgProcessDays}일` : '-'}
            sub="작성→서명 완료 평균"
          />
        </div>

        {/* 최근 서명 요청 + 템플릿 + 도넛 */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-[#EAECF5] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">최근 서명 요청</h2>
              <span className="text-[10px] text-slate-400">최근 5건</span>
            </div>
            <ul className="mt-3 space-y-2">
              {recentRequests.length === 0 ? (
                <p className="rounded-md bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
                  최근 서명 요청이 없습니다.
                </p>
              ) : (
                recentRequests.map((c) => {
                  const profile = c.employee_id ? profileMap.get(c.employee_id) : null;
                  const name = profile?.name ?? c.invite_name ?? '(직원 미등록)';
                  const meta = STATUS_META[c.status];
                  return (
                    <li key={c.id} className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                        <p className="text-[11px] text-slate-500">
                          {TYPE_LABEL[c.contract_type]} · {c.created_at.slice(0, 10)}
                        </p>
                      </div>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.chip} ${meta.chipText}`}>
                        {meta.text}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-[#EAECF5] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">계약서 템플릿</h2>
              <span className="text-[10px] text-slate-400">{templates.length}개</span>
            </div>
            <ul className="mt-3 space-y-2">
              {templates.map((t) => {
                // NDA는 별도 라우트, 근로계약 3종은 같은 Wizard에서 종류 prefill
                const href =
                  t.template_kind === 'nda'
                    ? '/contracts/new/nda'
                    : `/contracts/new?type=${t.template_kind}`;
                return (
                  <li key={t.id}>
                    <Link
                      href={href}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md border border-[#EAECF5] p-2.5 transition-colors hover:bg-slate-50 active:bg-slate-100"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-base text-indigo-600">
                        {KIND_ICON[t.template_kind] ?? '문서'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{t.name}</p>
                        {t.description && (
                          <p className="truncate text-[10px] text-slate-500">{t.description}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-[#EAECF5] bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">문서 상태 분포</h2>
            {donutData.length === 0 ? (
              <p className="mt-3 rounded-md bg-slate-50 px-3 py-12 text-center text-xs text-slate-500">
                계약서 데이터가 없습니다.
              </p>
            ) : (
              <div className="mt-3">
                <ChannelDonut
                  data={donutData}
                  centerLabel="전체"
                  centerValue={`${totalCount}건`}
                  height={220}
                />
              </div>
            )}
          </section>
        </div>

        {/* 계약서 목록 — 모바일 카드 list / PC 테이블 */}
        <section className="mt-6 rounded-2xl border border-[#EAECF5] bg-white">
          <h2 className="border-b border-[#EAECF5] px-5 py-3 text-sm font-semibold text-slate-900">
            계약서 목록
          </h2>
          {contracts.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <EmptyDocument className="text-slate-400" />
              <p className="mt-3 text-[15px] font-medium text-slate-900">아직 작성된 계약서가 없습니다</p>
              <p className="mt-1 text-[12px] text-slate-500">4단계 마법사로 5분 만에 작성 가능합니다.</p>
              <Link href="/contracts/new" className="mt-4 inline-block">
                <Button size="sm">+ 첫 계약 작성하기</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* 모바일 카드 (lg 미만) */}
              <ul className="divide-y divide-slate-100 lg:hidden">
                {contracts.map((c) => {
                  const profile = c.employee_id ? profileMap.get(c.employee_id) : null;
                  const name = profile?.name ?? c.invite_name ?? '(직원 미등록)';
                  const meta = STATUS_META[c.status];
                  return (
                    <li key={c.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                            {name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-slate-900">{name}</p>
                            <p className="mt-0.5 truncate text-[12px] text-slate-500">
                              {TYPE_LABEL[c.contract_type]} · {c.work_start_date}
                            </p>
                          </div>
                        </div>
                        <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${meta.chip} ${meta.chipText}`}>
                          {meta.text}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <ContractCardActions
                          contractId={c.id}
                          status={c.status}
                          signToken={c.sign_token}
                          inviteName={c.invite_name}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* PC 테이블 (lg+) */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">직원</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">계약 종류</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">시작일</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">종료일</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">서명 상태</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">상태</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contracts.map((c) => {
                      const profile = c.employee_id ? profileMap.get(c.employee_id) : null;
                      const name = profile?.name ?? c.invite_name ?? '(직원 미등록)';
                      const meta = STATUS_META[c.status];
                      let dDay: string | null = null;
                      if (c.status === 'signed' && c.work_end_date) {
                        const days = Math.ceil(
                          (new Date(c.work_end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                        );
                        if (days >= 0 && days <= 30) dDay = `D-${days}`;
                      }
                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                {name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{name}</p>
                                <p className="text-[10px] text-slate-500">
                                  {profile?.phone ?? c.invite_phone ?? '-'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            근로계약서 ({TYPE_LABEL[c.contract_type]})
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{c.work_start_date}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {c.work_end_date ?? <span className="text-slate-400">정규</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.chip} ${meta.chipText}`}>
                              {meta.text}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {dDay ? (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                                {dDay} 만료 임박
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">정상</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {c.status === 'sent' && c.sign_token && (
                                <CopySignLinkButton signToken={c.sign_token} />
                              )}
                              {(c.status === 'sent' || c.status === 'signed') && (
                                <Link
                                  href={`/contracts/${c.id}/view`}
                                  className="rounded border border-[#E3E5F0] bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  보기
                                </Link>
                              )}
                              {c.status === 'sent' && (
                                <CancelContractButton contractId={c.id} inviteName={c.invite_name} />
                              )}
                              <DeleteContractButton contractId={c.id} label={c.invite_name} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-xs text-amber-900">
          ⚠ 표준 양식 기반의 자동 작성본입니다. 실제 운영 전 노무사 검토를 권장합니다.
        </p>
      </div>
    </div>
  );
}

function StatusCard({
  count, label, tone,
}: {
  count: number;
  label: string;
  tone: 'blue' | 'emerald' | 'amber' | 'red';
}) {
  const colorMap = {
    blue: 'text-indigo-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-500',
  };
  const borderMap = {
    blue: 'border-l-indigo-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    red: 'border-l-red-500',
  };
  return (
    <div className={`rounded-xl bg-white border border-[#EAECF5] border-l-4 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${borderMap[tone]}`}>
      <p className="text-[12px] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-[22px] font-extrabold tabular-nums ${colorMap[tone]}`}>
        {count}<span className="ml-0.5 text-[12px] font-normal text-slate-500">건</span>
      </p>
    </div>
  );
}

function KpiCard({
  Icon, iconBg, iconColor, label, value, sub,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconBg: string; iconColor: string;
  label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-xl border border-[#EAECF5] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}
