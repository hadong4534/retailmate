'use client';

import { useState, useTransition } from 'react';
import { Clock } from 'lucide-react';
import { submitOvertime } from '@/lib/overtime/actions';

interface StoreOpt { storeId: string; storeName: string }

function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function OvertimeRequest({ stores }: { stores: StoreOpt[] }) {
  const [open, setOpen] = useState(false);
  const [storeId, setStoreId] = useState(stores[0]?.storeId ?? '');
  const [date, setDate] = useState(todayKST());
  const [hours, setHours] = useState(0);
  const [mins, setMins] = useState(30);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (stores.length === 0) return null;
  const totalMin = hours * 60 + mins;

  function submit() {
    setMsg(null);
    if (totalMin <= 0) { setMsg({ ok: false, text: '연장 시간을 입력해주세요.' }); return; }
    startTransition(async () => {
      const res = await submitOvertime({ storeId, workDate: date, minutes: totalMin, reason });
      if ('error' in res) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: '연장근무를 신청했습니다. 사장님 승인 후 급여에 반영됩니다.' });
        setReason(''); setHours(0); setMins(30);
      }
    });
  }

  return (
    <div className="rounded-xl border border-[#EAECF5] bg-white p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Clock className="h-4 w-4 text-indigo-500" /> 연장근무 신청
        </span>
        <span className="text-xs text-slate-400">{open ? '닫기' : '열기'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {stores.length > 1 && (
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {stores.map((s) => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2">
            <label className="w-16 text-xs text-slate-500">근무일</label>
            <input
              type="date"
              value={date}
              max={todayKST()}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-16 text-xs text-slate-500">연장시간</label>
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {Array.from({ length: 13 }, (_, i) => <option key={i} value={i}>{i}시간</option>)}
            </select>
            <select value={mins} onChange={(e) => setMins(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {[0, 10, 20, 30, 40, 50].map((m) => <option key={m} value={m}>{m}분</option>)}
            </select>
          </div>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="사유 (선택)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {msg && (
            <p className={`rounded-md px-3 py-2 text-xs ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </p>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? '신청 중…' : '신청하기'}
          </button>
        </div>
      )}
    </div>
  );
}
