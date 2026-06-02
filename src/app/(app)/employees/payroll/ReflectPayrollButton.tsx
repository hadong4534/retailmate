'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Check } from 'lucide-react';
import { reflectPayrollToExpense } from './actions';

/** 이번 달 총급여를 지출(인건비)로 한 번에 반영 — 중복 시 금액 갱신. */
export function ReflectPayrollButton({ month, grossPay }: { month: string; grossPay: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  function onClick() {
    if (grossPay <= 0) { setMsg({ kind: 'err', text: '반영할 급여 금액이 없어요.' }); return; }
    const ok = window.confirm(`${month} 총급여 ₩${grossPay.toLocaleString('ko-KR')}을(를) 지출의 '인건비'로 반영할까요?\n(같은 달 인건비가 이미 있으면 금액이 갱신됩니다)`);
    if (!ok) return;
    setMsg(null);
    startTransition(async () => {
      const res = await reflectPayrollToExpense(month);
      if ('error' in res) { setMsg({ kind: 'err', text: res.error }); return; }
      setMsg({ kind: 'ok', text: `${res.updated ? '갱신' : '반영'} 완료 — 지출 인건비 ₩${res.amount.toLocaleString('ko-KR')}` });
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#7177EE] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-[#5E64E6] disabled:opacity-60"
      >
        <Wallet className="h-4 w-4" strokeWidth={2.2} />
        {pending ? '반영 중…' : '이번 달 급여를 지출(인건비)로 반영'}
      </button>
      {msg && (
        <p className={'mt-2 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] ' + (msg.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
          {msg.kind === 'ok' && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}{msg.text}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-slate-400">지출에 급여를 따로 또 입력할 필요 없이, 계산된 총급여가 인건비로 자동 기록돼요.</p>
    </div>
  );
}
