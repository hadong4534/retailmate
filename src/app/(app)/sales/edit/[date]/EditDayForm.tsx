'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { formatWon } from '@/lib/utils';
import {
  SALE_CHANNELS,
  SALE_CHANNEL_LUCIDE,
  SALE_CHANNEL_LABEL,
  type SaleChannel,
} from '@/lib/constants';

const QUICK = [10000, 50000, 100000];
import { updateDailySales, deleteDailySales } from '../../actions';

interface Props {
  saleDate: string;
  initialAmounts: Record<SaleChannel, number>;
  initialMemo: string;
  hadAnyData: boolean;
}

export function EditDayForm({ saleDate, initialAmounts, initialMemo, hadAnyData }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [amounts, setAmounts] = useState<Record<SaleChannel, number>>(initialAmounts);
  const [memo, setMemo] = useState(initialMemo);

  const total = SALE_CHANNELS.reduce((acc, c) => acc + (amounts[c] || 0), 0);

  function setChannel(c: SaleChannel, n: number) {
    setAmounts((a) => ({ ...a, [c]: Math.max(0, n) }));
  }
  function bump(c: SaleChannel, delta: number) {
    setAmounts((a) => ({ ...a, [c]: Math.max(0, (a[c] || 0) + delta) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (total === 0) {
      setError('하나 이상의 채널에 금액을 입력하거나, 전체 삭제를 사용해주세요.');
      return;
    }
    startTransition(async () => {
      const result = await updateDailySales({ saleDate, amounts, memo });
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push(`/sales?month=${saleDate.slice(0, 7)}`);
      router.refresh();
    });
  }

  function handleDelete() {
    setConfirmDelete(false);
    startDelete(async () => {
      const result = await deleteDailySales({ saleDate });
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push(`/sales?month=${saleDate.slice(0, 7)}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-[#EAECF5] bg-white p-5">
        <p className="mb-3 text-xs text-slate-500">
          금액을 0원으로 두면 해당 채널은 저장되지 않습니다.
        </p>
        <div className="space-y-3">
          {SALE_CHANNELS.map((c) => {
            const ChannelIcon = SALE_CHANNEL_LUCIDE[c];
            return (
            <div key={c} className="rounded-2xl border border-[#EEF0F6] bg-[#FBFBFE] p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FE] text-[#6366F1]" aria-hidden>
                  <ChannelIcon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-[13.5px] font-semibold text-slate-700">{SALE_CHANNEL_LABEL[c]}</span>
                <div className="w-[44%] sm:w-[200px]">
                  <MoneyInput label="" value={amounts[c]} onChange={(n) => setChannel(c, n)} size="md" />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-9">
                {QUICK.map((q) => (
                  <button key={q} type="button" onClick={() => bump(c, q)}
                    className="rounded-lg bg-[#F1F1FB] px-2.5 py-1 text-[11.5px] font-bold text-[#6366F1] transition active:scale-95 hover:bg-[#EAEBFB]">
                    +{q / 10000}만
                  </button>
                ))}
                {amounts[c] > 0 && (
                  <button type="button" onClick={() => setChannel(c, 0)}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-500 active:scale-95">지우기</button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">메모 (선택)</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="단체 손님, 비 오는 날 등"
          className="mt-1 w-full rounded-md border border-[#E3E5F0] px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
        />
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-indigo-700">합계</span>
          <span className="text-2xl font-bold text-indigo-700">{formatWon(total)}</span>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => router.back()}
          disabled={pending || deleting}
        >
          취소
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-[2]"
          disabled={pending || deleting}
        >
          {pending ? '저장 중…' : '변경 저장'}
        </Button>
      </div>

      {hadAnyData && (
        <div className="border-t border-[#EAECF5] pt-4 text-center">
          {confirmDelete ? (
            <div className="flex flex-col items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              <p className="font-medium">이 날의 모든 매출 기록을 삭제할까요?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md border border-[#E3E5F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  disabled={deleting}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? '삭제 중…' : '확인 — 삭제'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              이 날 매출 전체 삭제
            </button>
          )}
        </div>
      )}
    </form>
  );
}
