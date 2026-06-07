'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { updateAttendanceTimes } from './actions';
import { appAlert } from '@/components/ui/appDialog';

interface Props {
  attendanceId: string;
  name: string;
  checkInHM: string;          // 'HH:MM'
  checkOutHM: string | null;  // null = 근무 중
}

/**
 * 출퇴근 시각 수정 버튼 + 미니 모달 — 근태 현황(사장/매니저 화면) 전용.
 * 퇴근을 늦게 찍는 등 실제와 다른 기록을 바로잡으면 급여가 수정된 시간으로 재계산된다.
 */
export function EditAttendanceButton({ attendanceId, name, checkInHM, checkOutHM }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cin, setCin] = useState(checkInHM);
  const [cout, setCout] = useState(checkOutHM ?? '');
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateAttendanceTimes({
        attendanceId,
        checkInHM: cin,
        checkOutHM: cout ? cout : null,
      });
      if ('error' in r) {
        void appAlert(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="출퇴근 시간 수정"
        className="flex h-6 w-6 items-center justify-center rounded border border-[#EAECF5] bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      >
        <Pencil className="h-3 w-3" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
          />
          <div className="relative w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-sm font-bold text-slate-900">{name} · 출퇴근 시간 수정</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              실제 근무와 다르게 찍힌 기록을 바로잡습니다. 급여·인건비는 수정된 시간으로 다시 계산돼요.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">출근</label>
                <input
                  type="time"
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-[#E3E5F0] px-3 text-sm text-slate-900 focus:border-[#7177EE] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  퇴근 <span className="font-normal text-slate-400">(비우면 ‘근무 중’으로)</span>
                </label>
                <input
                  type="time"
                  value={cout}
                  onChange={(e) => setCout(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-[#E3E5F0] px-3 text-sm text-slate-900 focus:border-[#7177EE] focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="h-10 flex-1 rounded-lg border border-[#EAECF5] bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="h-10 flex-1 rounded-lg bg-[#6366F1] text-sm font-semibold text-white hover:bg-[#5458E6] disabled:opacity-50"
              >
                {pending ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
