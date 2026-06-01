'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X, Clock, Trash2 } from 'lucide-react';
import { saveShift, clearShift } from './schedule-actions';
import { toast } from '@/components/ui/Toaster';

export interface SchedEmployee { userId: string; name: string }
export interface Shift { user_id: string; schedule_date: string; start_time: string; end_time: string }

interface Props {
  month: string;                  // YYYY-MM
  employees: SchedEmployee[];
  shifts: Shift[];
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const hm = (t: string) => (t || '').slice(0, 5);
function shiftMonth(m: string, d: number) {
  const [y, mo] = m.split('-').map(Number);
  const dt = new Date(y, mo - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function durationH(s: string, e: string) {
  const [sh, sm] = s.split(':').map(Number); const [eh, em] = e.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm); if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export function ScheduleBoard({ month, employees, shifts }: Props) {
  const router = useRouter();
  const [openDate, setOpenDate] = useState<string | null>(null);

  const [y, mo] = month.split('-').map(Number);
  const first = new Date(y, mo - 1, 1);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const leadBlanks = first.getDay(); // 0=일

  // 날짜별 시프트 매핑
  const byDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    shifts.forEach((s) => {
      const k = s.schedule_date.slice(0, 10);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    });
    return map;
  }, [shifts]);

  const nameOf = (uid: string) => employees.find((e) => e.userId === uid)?.name ?? '직원';
  const totalHours = shifts.reduce((acc, s) => acc + durationH(hm(s.start_time), hm(s.end_time)), 0);

  const cells: (number | null)[] = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const dateStr = (d: number) => `${month}-${String(d).padStart(2, '0')}`;
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

  return (
    <section className="rounded-2xl border border-[#EAECF5] bg-white p-4 lg:p-5">
      {/* 월 네비 + 합계 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href={`/attendance?view=schedule&month=${shiftMonth(month, -1)}`} aria-label="이전 달"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E9EAF4] bg-white text-slate-500 active:scale-95"><ChevronLeft className="h-5 w-5" /></Link>
          <span className="min-w-[96px] text-center text-[15px] font-bold text-slate-900">{y}년 {mo}월</span>
          <Link href={`/attendance?view=schedule&month=${shiftMonth(month, 1)}`} aria-label="다음 달"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E9EAF4] bg-white text-slate-500 active:scale-95"><ChevronRight className="h-5 w-5" /></Link>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">이달 예정 근무</p>
          <p className="text-[15px] font-extrabold tabular-nums text-[#5961E6]">{Math.round(totalHours)}시간</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-[#E3E5F0] px-4 py-8 text-center text-[13px] text-slate-500">
          재직 중인 직원이 없어요. 근로계약서를 작성하면 직원이 등록됩니다.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[11.5px] text-slate-400">날짜를 누르면 그날 일하는 직원과 시간을 정할 수 있어요.</p>
          {/* 요일 헤더 */}
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
            {DOW.map((d, i) => <div key={d} className={i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : ''}>{d}</div>)}
          </div>
          {/* 날짜 셀 */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, idx) => {
              if (d === null) return <div key={`b${idx}`} />;
              const ds = dateStr(d);
              const list = byDate.get(ds) ?? [];
              const isToday = ds === todayStr;
              return (
                <button key={ds} type="button" onClick={() => setOpenDate(ds)}
                  className={'flex min-h-[58px] flex-col rounded-xl border p-1.5 text-left transition active:scale-95 ' +
                    (isToday ? 'border-[#C9CCF7] bg-[#F6F7FF]' : 'border-[#EEF0F6] bg-white hover:bg-[#FAFAFE]')}>
                  <span className={'text-[11px] font-bold ' + (isToday ? 'text-[#5961E6]' : 'text-slate-500')}>{d}</span>
                  <span className="mt-0.5 flex flex-wrap gap-0.5">
                    {list.slice(0, 3).map((s, i) => (
                      <span key={i} className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#EEF0FE] text-[8.5px] font-bold text-[#5961E6]">
                        {nameOf(s.user_id).charAt(0)}
                      </span>
                    ))}
                    {list.length > 3 && <span className="text-[8.5px] font-semibold text-slate-400">+{list.length - 3}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {openDate && (
        <DaySheet date={openDate} employees={employees} shifts={byDate.get(openDate) ?? []}
          onClose={() => setOpenDate(null)} onChanged={() => router.refresh()} />
      )}
    </section>
  );
}

function DaySheet({ date, employees, shifts, onClose, onChanged }: {
  date: string; employees: SchedEmployee[]; shifts: Shift[];
  onClose: () => void; onChanged: () => void;
}) {
  const cur = new Map(shifts.map((s) => [s.user_id, { start: hm(s.start_time), end: hm(s.end_time) }]));
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const d = new Date(date + 'T00:00:00');
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;

  function setShift(uid: string, start: string, end: string) {
    setErr(null);
    startTransition(async () => {
      const r = await saveShift({ memberUserId: uid, date, start, end });
      if ('error' in r) { setErr(r.error); return; }
      toast('근무 일정이 저장됐어요'); onChanged();
    });
  }
  function remove(uid: string) {
    setErr(null);
    startTransition(async () => {
      const r = await clearShift({ memberUserId: uid, date });
      if ('error' in r) { setErr(r.error); return; }
      toast('일정을 지웠어요'); onChanged();
    });
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-[#EAECF5] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-slate-900">{label} 근무</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{err}</p>}
        <ul className="mt-3 space-y-2">
          {employees.map((e) => (
            <DayRow key={e.userId} emp={e} init={cur.get(e.userId)} pending={pending}
              onSave={(s, en) => setShift(e.userId, s, en)} onRemove={() => remove(e.userId)} />
          ))}
        </ul>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100">닫기</button>
      </div>
    </div>
  );
}

function DayRow({ emp, init, pending, onSave, onRemove }: {
  emp: SchedEmployee; init?: { start: string; end: string }; pending: boolean;
  onSave: (s: string, e: string) => void; onRemove: () => void;
}) {
  const [start, setStart] = useState(init?.start ?? '09:00');
  const [end, setEnd] = useState(init?.end ?? '18:00');
  const has = !!init;
  return (
    <li className="rounded-xl border border-[#EEF0F6] bg-[#FBFBFE] p-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF0FE] text-[12px] font-bold text-[#5961E6]">{emp.name.charAt(0)}</span>
        <span className="flex-1 truncate text-[13.5px] font-semibold text-slate-800">{emp.name}</span>
        {has && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">근무</span>}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Clock className="h-4 w-4 shrink-0 text-slate-400" />
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#E3E5F0] px-2 text-[13px] focus:border-[#7177EE] focus:outline-none" />
        <span className="text-slate-400">~</span>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#E3E5F0] px-2 text-[13px] focus:border-[#7177EE] focus:outline-none" />
        <button type="button" disabled={pending} onClick={() => onSave(start, end)}
          className="h-9 shrink-0 rounded-lg bg-[#6366F1] px-3 text-[12.5px] font-semibold text-white active:scale-95 disabled:opacity-50">저장</button>
        {has && (
          <button type="button" disabled={pending} onClick={onRemove} aria-label="삭제"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#EAECF5] text-slate-400 active:scale-95 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
    </li>
  );
}
