import Link from 'next/link';
import { Wallet, Users, AlertTriangle, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { StaffHubCards } from '@/components/layout/StaffHubCards';
import { PageHeader } from '@/components/app';
import { formatWon, currentYearMonth } from '@/lib/utils';
import { getStorePayroll, formatHM, type MemberPayrollRow } from '@/lib/payroll/store-payroll';
import { PayrollModeSelect } from './PayrollModeSelect';
import { ReflectPayrollButton } from './ReflectPayrollButton';

export const metadata = {
  title: '급여 계산 · 리테일메이트',
};

const TYPE_LABEL: Record<string, string> = {
  fulltime: '정규직',
  parttime: '파트타임',
  daily: '일용직',
};

const WAGE_LABEL: Record<string, string> = {
  hourly: '시급',
  monthly: '월급',
  daily: '일급',
};

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? currentYearMonth();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  const payroll = await getStorePayroll(supabase, adminStore.storeId, month);
  const hasAnyContract = payroll.rows.some((r) => r.contract !== null);

  return (
    <div className="rm-page px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <StaffHubCards activeHref="/employees/payroll" />

        <PageHeader
          Icon={Wallet}
          tone="blue"
          title="급여 계산"
          description="근로계약서·출퇴근 기록을 토대로 월 급여를 자동 계산합니다."
          right={<MonthPicker value={month} />}
          className="mb-5"
        />

        {/* 요약 KPI 4종 */}
        <div className="rm-stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
          <KpiCard
            Icon={Users}
            label="재직 직원"
            value={`${payroll.totals.employees}명`}
            sub={`정규직 ${payroll.totals.fulltime} · 파트타임 ${payroll.totals.parttime}`}
            tone="slate"
          />
          <KpiCard
            Icon={Wallet}
            label="총 급여(세전)"
            value={formatWon(payroll.totals.grossPay)}
            sub={`공제 합계 ${formatWon(payroll.totals.insurance)}`}
            tone="blue"
          />
          <KpiCard
            Icon={Wallet}
            label="세후 지급액 합계"
            value={formatWon(payroll.totals.netPay)}
            sub="세전 − 공제"
            tone="emerald"
          />
        </div>

        {/* 가이드/면책 안내 */}
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={2.2} />
          <div>
            <p className="font-semibold">참고용 추정 금액입니다</p>
            <p className="mt-0.5 text-amber-800">
              공제(4대보험·3.3% 사업소득·일용 소득세)는 직원별 '처리방식' 설정과 2026년 고시 요율 기준 추정입니다.
              실제 신고·지급액은 노무사·세무사 검토 후 확정하세요.
            </p>
          </div>
        </div>

        {payroll.rows.length > 0 && hasAnyContract && (
          <ReflectPayrollButton month={month} grossPay={payroll.totals.grossPay} />
        )}

        {/* 직원이 없는 경우 */}
        {payroll.rows.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#E3E5F0] bg-white px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Users className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <p className="mt-3 text-[15px] font-medium text-slate-900">등록된 직원이 없습니다</p>
            <p className="mt-1 text-[12px] text-slate-500">
              근로계약서를 작성·서명 받으면 자동으로 직원이 등록됩니다.
            </p>
            <Link
              href="/contracts/new"
              className="mt-4 inline-flex items-center rounded-md bg-[#7177EE] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#5E64E6]"
            >
              + 계약서 작성하기
            </Link>
          </div>
        )}

        {/* 계약서 없는 직원만 있는 경우 */}
        {payroll.rows.length > 0 && !hasAnyContract && (
          <div className="mt-6 flex items-start gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[12px] text-indigo-900">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
            <span>
              직원은 등록되어 있지만 서명된 계약서가 없어 급여 계산이 불가능합니다.
              <Link href="/contracts/new" className="ml-1 font-semibold underline">계약서를 작성</Link>해주세요.
            </span>
          </div>
        )}

        {/* 직원별 명세 — 모바일 카드 / PC 테이블 */}
        {payroll.rows.length > 0 && (
          <section className="mt-6 rounded-2xl border border-[#EAECF5] bg-white">
            <h2 className="border-b border-[#EAECF5] px-5 py-3 text-sm font-semibold text-slate-900">
              직원별 명세
            </h2>

            {/* 모바일 카드 */}
            <ul className="divide-y divide-slate-100 lg:hidden">
              {payroll.rows.map((r) => <MobilePayrollCard key={r.memberId} row={r} />)}
            </ul>

            {/* PC 테이블 */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">이름</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">계약</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">근무</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">단가</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">세전</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">처리방식</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">공제</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">실지급</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payroll.rows.map((r) => <PcPayrollRow key={r.memberId} row={r} />)}
                </tbody>
                <tfoot className="border-t-2 border-[#EAECF5] bg-slate-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-[12px] font-semibold text-slate-700">합계</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold tabular-nums text-indigo-600">
                      {formatWon(payroll.totals.grossPay)}
                    </td>
                    <td />
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-red-500">
                      − {formatWon(payroll.totals.insurance)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold tabular-nums text-emerald-600">
                      {formatWon(payroll.totals.netPay)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── KPI 카드 (간이) ───────────────────────── */
function KpiCard({
  Icon, label, value, sub, tone,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub: string;
  tone: 'blue' | 'emerald' | 'slate';
}) {
  const tint = {
    blue: { bg: 'bg-indigo-50', text: 'text-indigo-600', accent: 'linear-gradient(90deg, #7177EE, #60A5FA)' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', accent: 'linear-gradient(90deg, #10B981, #34D399)' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', accent: 'linear-gradient(90deg, #475569, #94A3B8)' },
  }[tone];
  return (
    <div
      className="rm-card-data rm-card-data-accent flex h-full min-h-[124px] flex-col p-4 lg:p-5"
      style={{ '--accent': tint.accent } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-slate-500">{label}</p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tint.bg} ${tint.text}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
      </div>
      <p className={`mt-1 truncate text-[20px] font-extrabold tabular-nums leading-tight lg:text-[24px] ${tint.text}`}>
        {value}
      </p>
      <p className="mt-auto truncate pt-2 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

/* ───────────────────────── 모바일 카드 ───────────────────────── */
function MobilePayrollCard({ row }: { row: MemberPayrollRow }) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold text-slate-900">{row.name}</p>
            {!row.isActive && (
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                퇴사
              </span>
            )}
            {row.role === 'manager' && (
              <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                매니저
              </span>
            )}
          </div>
          {row.contract ? (
            <p className="mt-0.5 text-[12px] text-slate-500">
              {TYPE_LABEL[row.contract.contract_type]} · {WAGE_LABEL[row.contract.wage_type]} {formatWon(row.contract.wage_amount)}
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] text-amber-700">계약서 미서명 — 급여 계산 불가</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <p className="rm-tnum text-[15px] font-bold text-emerald-600">{formatWon(row.netPay)}</p>
          <p className="rm-tnum text-[10px] text-slate-400">실지급</p>
        </div>
      </div>

      {row.contract && (
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2 text-center">
          <div>
            <p className="text-[10px] text-slate-500">근무</p>
            <p className="mt-0.5 rm-tnum text-[12px] font-semibold text-slate-700">{formatHM(row.workMinutes)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">세전</p>
            <p className="mt-0.5 rm-tnum text-[12px] font-semibold text-indigo-600">{formatWon(row.grossPay)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">{row.deductionLabel === '공제 없음' ? '공제' : row.deductionLabel}</p>
            <p className="mt-0.5 rm-tnum text-[12px] font-semibold text-red-500">
              {row.insurance.total > 0 ? `− ${formatWon(row.insurance.total)}` : '-'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">급여 처리방식</span>
        <PayrollModeSelect memberId={row.memberId} value={row.payrollMode} compact />
      </div>
    </li>
  );
}

/* ───────────────────────── PC 테이블 행 ───────────────────────── */
function PcPayrollRow({ row }: { row: MemberPayrollRow }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            <p className="text-[10px] text-slate-500">
              {row.role === 'manager' ? '매니저' : '직원'}
              {!row.isActive && ' · 퇴사'}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        {row.contract ? (
          <>
            <p className="text-[13px]">{TYPE_LABEL[row.contract.contract_type]}</p>
            <p className="text-[10px] text-slate-500">{WAGE_LABEL[row.contract.wage_type]}</p>
          </>
        ) : (
          <span className="text-xs text-amber-700">미서명</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-slate-700">
        {row.contract ? (
          row.contract.wage_type === 'daily' ? (
            <>
              <p>{row.workDays}일</p>
              <p className="text-[10px] text-slate-400">{formatHM(row.workMinutes)}</p>
            </>
          ) : (
            formatHM(row.workMinutes)
          )
        ) : '-'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-slate-600">
        {row.contract ? formatWon(row.contract.wage_amount) : '-'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums text-indigo-600">
        {row.contract ? formatWon(row.grossPay) : '-'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-left">
        <PayrollModeSelect memberId={row.memberId} value={row.payrollMode} compact />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-red-500">
        {row.insurance.total > 0 ? `− ${formatWon(row.insurance.total)}` : '-'}
        {row.insurance.total > 0 && (
          <span className="block text-[9px] font-sans text-slate-400">{row.deductionLabel}</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold tabular-nums text-emerald-600">
        {row.contract ? formatWon(row.netPay) : '-'}
      </td>
    </tr>
  );
}
