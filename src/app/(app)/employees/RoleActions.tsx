'use client';

import { useTransition } from 'react';
import { promoteToManager, demoteToEmployee } from './actions';

interface Props {
  memberId: string;
  role: 'owner' | 'manager' | 'employee';
}

export function RoleActions({ memberId, role }: Props) {
  const [pending, startTransition] = useTransition();

  function handlePromote() {
    if (!confirm('이 직원을 매니저로 임명하시겠습니까?\n매니저는 사장님과 동일한 관리 권한을 가집니다.')) return;
    startTransition(async () => {
      const result = await promoteToManager(memberId);
      if ('error' in result) alert(result.error);
    });
  }

  function handleDemote() {
    if (!confirm('이 매니저를 일반 직원으로 강등하시겠습니까?')) return;
    startTransition(async () => {
      const result = await demoteToEmployee(memberId);
      if ('error' in result) alert(result.error);
    });
  }

  if (role === 'owner') return null;

  return (
    <div className="flex gap-2 text-xs">
      {role === 'employee' && (
        <button
          type="button"
          onClick={handlePromote}
          disabled={pending}
          className="rounded border border-emerald-300 bg-white px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          {pending ? '처리 중…' : '매니저로 승격'}
        </button>
      )}
      {role === 'manager' && (
        <button
          type="button"
          onClick={handleDemote}
          disabled={pending}
          className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? '처리 중…' : '직원으로 강등'}
        </button>
      )}
    </div>
  );
}
