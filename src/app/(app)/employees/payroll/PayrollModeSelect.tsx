'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePayrollMode } from '../actions';

type Mode = 'four_major' | 'freelance_3_3' | 'daily' | 'none';

const OPTIONS: { value: Mode; label: string }[] = [
  { value: 'four_major', label: '4대보험' },
  { value: 'freelance_3_3', label: '3.3% 사업소득' },
  { value: 'daily', label: '일용직' },
  { value: 'none', label: '미적용(공제없음)' },
];

/**
 * 직원별 급여 처리방식 즉시 변경 셀렉터. 변경 즉시 서버 반영 + 화면 새로고침.
 * "입력만 하면" 철학 — 사장님이 드롭다운 하나만 바꾸면 급여 계산이 즉시 갱신됨.
 */
export function PayrollModeSelect({
  memberId,
  value,
  compact = false,
}: {
  memberId: string;
  value: Mode;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const mode = e.target.value as Mode;
    setErr(null);
    startTransition(async () => {
      const r = await updatePayrollMode(memberId, mode);
      if ('error' in r) { setErr(r.error); return; }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <select
        value={value}
        onChange={onChange}
        disabled={pending}
        aria-label="급여 처리방식"
        className={
          'rounded-lg border border-[#E3E5F0] bg-white font-medium text-slate-700 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB] disabled:opacity-50 ' +
          (compact ? 'px-2 py-1 text-[12px]' : 'px-2.5 py-1.5 text-[13px]')
        }
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {err && <span className="text-[10px] text-red-600">{err}</span>}
    </span>
  );
}
