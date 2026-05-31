'use client';

import Link from 'next/link';
import { Pencil, UserPlus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WageEditor } from './WageEditor';
import { MemberActions } from './MemberActions';

interface MemberView {
  id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'employee';
  hourly_wage: number | null;
  hire_date: string | null;
  resign_date: string | null;
  is_active: boolean;
  name: string | null;
  phone: string | null;
  contract: {
    contract_type: 'fulltime' | 'parttime' | 'daily';
    status: 'draft' | 'sent' | 'signed' | 'terminated' | 'cancelled';
  } | null;
}

interface Props {
  members: MemberView[];
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  draft:      { text: '작성 중',   color: 'bg-slate-100 text-slate-700' },
  sent:       { text: '서명 대기', color: 'bg-amber-100 text-amber-700' },
  signed:     { text: '서명 완료', color: 'bg-emerald-100 text-emerald-700' },
  terminated: { text: '종료',      color: 'bg-slate-100 text-slate-500' },
  cancelled:  { text: '취소됨',    color: 'bg-slate-100 text-slate-500' },
};

const TYPE_LABEL: Record<string, string> = {
  fulltime: '정규직',
  parttime: '아르바이트',
  daily: '일용직',
};

/**
 * 직원 목록 — 재직/퇴사 탭으로 분리.
 * - 이름 미입력 직원은 카드 상단에 강조 + "이름 등록" 빠른 CTA.
 * - 입사일·퇴사일은 항상 노출 (퇴사자는 "재직: 입사일 ~ 퇴사일" 형태로).
 * - 모바일: 카드 / PC: 테이블.
 */
export function MemberList({ members }: Props) {
  // 퇴사는 hard delete 정책이므로 members는 모두 재직 중.
  // 행이 떠 있는 한 그 직원은 활성으로 본다.
  const visible = members;

  return (
    <section className="mt-6 rounded-2xl border border-[#EAECF5] bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 border-b border-[#EAECF5] px-4 py-3 lg:px-5">
        <h2 className="text-[15px] font-bold text-slate-900">
          직원 목록 <span className="ml-1.5 tabular-nums text-slate-400">{visible.length}</span>
        </h2>
      </div>

      {/* 빈 상태 */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <UserPlus className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-[15px] font-medium text-slate-900">아직 등록된 직원이 없습니다</p>
          <p className="mt-1 text-[12px] text-slate-500">근로계약서를 작성하면 직원이 자동 등록됩니다.</p>
          <Link href="/contracts/new" className="mt-4 inline-block">
            <Button size="sm">+ 새 직원 계약 시작</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* 모바일 카드 */}
          <ul className="divide-y divide-slate-100 lg:hidden">
            {visible.map((m) => <MobileCard key={m.id} member={m} />)}
          </ul>

          {/* PC 테이블 */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">이름</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">역할/계약</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">시급</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">재직 기간</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">연락처</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((m) => <PcRow key={m.id} member={m} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* ───────────────────────── 모바일 카드 ───────────────────────── */
function MobileCard({ member }: { member: MemberView }) {
  const isNameMissing = !member.name;
  const roleBadge = roleBadgeFor(member);
  const status = member.contract ? STATUS_LABEL[member.contract.status] : null;

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ' +
            (isNameMissing ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}
          >
            {member.name?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={'truncate text-[14px] font-semibold ' + (isNameMissing ? 'text-amber-700' : 'text-slate-900')}>
                {member.name ?? '이름 미입력'}
              </p>
              {isNameMissing && (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2.4} />
              )}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-slate-500">
              {member.phone ?? '연락처 없음'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${roleBadge.color}`}>
            {roleBadge.text}
          </span>
          {status && (
            <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
              {status.text}
            </span>
          )}
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <div>
          <p className="text-[10px] text-slate-500">시급</p>
          <div className="mt-0.5">
            <WageEditor memberId={member.id} initialWage={member.hourly_wage} />
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">재직 기간</p>
          <p className="mt-0.5 text-[13px] font-medium text-slate-700">
            {formatPeriod(member.hire_date, member.resign_date)}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5">
        {isNameMissing && (
          <span className="mr-auto inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <Pencil className="h-3 w-3" strokeWidth={2.4} />
            이름 등록 필요
          </span>
        )}
        <MemberActions
          memberId={member.id}
          role={member.role}
          isActive={member.is_active && !member.resign_date}
          initialName={member.name ?? ''}
          initialPhone={member.phone ?? ''}
        />
      </div>
    </li>
  );
}

/* ───────────────────────── PC 테이블 행 ───────────────────────── */
function PcRow({ member }: { member: MemberView }) {
  const isNameMissing = !member.name;
  const roleBadge = roleBadgeFor(member);
  const status = member.contract ? STATUS_LABEL[member.contract.status] : null;
  return (
    <tr className="hover:bg-slate-50">
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ' +
            (isNameMissing ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}
          >
            {member.name?.charAt(0) ?? '?'}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className={'font-medium ' + (isNameMissing ? 'text-amber-700' : 'text-slate-900')}>
                {member.name ?? '이름 미입력'}
              </span>
              {isNameMissing && <AlertCircle className="h-3.5 w-3.5 text-amber-500" strokeWidth={2.4} />}
            </div>
            {isNameMissing && (
              <p className="text-[10px] text-amber-600">⋯ 더보기 → 이름 등록</p>
            )}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${roleBadge.color}`}>
          {roleBadge.text}
        </span>
        {status && (
          <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${status.color}`}>
            {status.text}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <WageEditor memberId={member.id} initialWage={member.hourly_wage} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        {formatPeriod(member.hire_date, member.resign_date)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
        {member.phone ?? '-'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <div className="inline-flex">
          <MemberActions
            memberId={member.id}
            role={member.role}
            isActive={member.is_active && !member.resign_date}
            initialName={member.name ?? ''}
            initialPhone={member.phone ?? ''}
          />
        </div>
      </td>
    </tr>
  );
}

/* ───────────────────────── 헬퍼 ───────────────────────── */
function roleBadgeFor(m: MemberView): { text: string; color: string } {
  if (m.role === 'manager') return { text: '매니저', color: 'bg-emerald-100 text-emerald-700' };
  if (m.contract && m.contract.contract_type !== 'fulltime') {
    return {
      text: m.contract.contract_type === 'parttime' ? '아르바이트' : '일용직',
      color: 'bg-amber-100 text-amber-700',
    };
  }
  return { text: '직원', color: 'bg-slate-100 text-slate-700' };
}

function formatPeriod(hire: string | null, resign: string | null): string {
  if (!hire && !resign) return '-';
  if (hire && !resign) return `${hire} ~`;
  if (hire && resign) return `${hire} ~ ${resign}`;
  return resign ? `~ ${resign}` : '-';
}
