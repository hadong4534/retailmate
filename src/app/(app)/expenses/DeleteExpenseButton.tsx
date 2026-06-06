'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteExpense } from './actions';

/**
 * 지출 삭제 버튼 — confirm()/alert() 미사용.
 * 모바일 PWA(홈 화면 앱)에서는 confirm/alert 팝업이 조용히 무시되어
 * 삭제가 동작하지 않는 문제가 있어, 인라인 2단계 확인으로 처리한다.
 */
export function DeleteExpenseButton({ id }: { id: string }) {
  const router = useRouter();
  const [arm, setArm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteExpense(id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setArm(false);
      router.refresh();
    });
  }

  if (!arm) {
    return (
      <button
        type="button"
        onClick={() => setArm(true)}
        className="text-xs text-slate-400 hover:text-red-600"
      >
        삭제
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {error && <span className="text-[10px] text-red-600">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? '삭제 중…' : '삭제 확정'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => { setArm(false); setError(null); }}
        className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
      >
        취소
      </button>
    </span>
  );
}
