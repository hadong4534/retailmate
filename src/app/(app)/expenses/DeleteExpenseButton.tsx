'use client';

import { useTransition } from 'react';
import { deleteExpense } from './actions';

export function DeleteExpenseButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('이 비용 기록을 삭제하시겠습니까?')) return;
    startTransition(async () => {
      const result = await deleteExpense(id);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? '삭제 중…' : '삭제'}
    </button>
  );
}
