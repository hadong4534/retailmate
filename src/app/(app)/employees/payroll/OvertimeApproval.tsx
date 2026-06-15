'use client';

import { useState, useTransition } from 'react';
import { Clock, Check, X } from 'lucide-react';
import { decideOvertime } from '@/lib/overtime/actions';
import type { PendingOvertime } from '@/lib/overtime/queries';

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`;
}

export function OvertimeApproval({ requests }: { requests: PendingOvertime[] }) {
  const [items, setItems] = useState(requests);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (items.length === 0) return null;

  function decide(id: string, decision: 'approved' | 'rejected') {
    setErr(null);
    startTransition(async () => {
      const res = await decideOvertime({ id, decision });
      if ('error' in res) setErr(res.error);
      else setItems((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600" />
        <h2 className="text-sm font-bold text-amber-900">연장근무 승인 대기 ({items.length})</h2>
      </div>
      {err && <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{err}</p>}
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {r.name} · <span className="text-indigo-600">{fmt(r.minutes)}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                {r.workDate}{r.reason ? ` · ${r.reason}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => decide(r.id, 'approved')}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> 승인
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => decide(r.id, 'rejected')}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" /> 거절
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
