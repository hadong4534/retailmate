'use client';

import { useState, useTransition } from 'react';
import { updateMemberWage } from './actions';
import { formatWon, parseMoney } from '@/lib/utils';

interface Props {
  memberId: string;
  initialWage: number | null;
}

export function WageEditor({ memberId, initialWage }: Props) {
  const [editing, setEditing] = useState(false);
  const [wage, setWage] = useState<number>(initialWage ?? 0);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateMemberWage(memberId, wage);
      if ('error' in result) alert(result.error);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          value={wage === 0 ? '' : wage.toLocaleString('ko-KR')}
          onChange={(e) => setWage(parseMoney(e.target.value))}
          className="h-7 w-24 rounded border border-[#E3E5F0] px-2 text-right text-xs tabular-nums focus:border-[#7177EE] focus:outline-none"
          autoFocus
          placeholder="0"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded bg-[#7177EE] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#5E64E6] disabled:opacity-50"
        >
          {pending ? '저장…' : '저장'}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setWage(initialWage ?? 0); }}
          disabled={pending}
          className="rounded border border-[#E3E5F0] px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50"
        >
          취소
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group inline-flex items-center gap-1 text-xs text-slate-700 hover:text-indigo-600"
    >
      <span className="font-mono tabular-nums">{initialWage ? formatWon(initialWage) : '미설정'}</span>
      <span className="text-slate-300 group-hover:text-indigo-500">✎</span>
    </button>
  );
}
