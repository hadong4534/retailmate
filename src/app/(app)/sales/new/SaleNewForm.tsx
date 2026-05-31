'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { formatWon, todayInKST } from '@/lib/utils';
import {
  SALE_CHANNELS,
  SALE_CHANNEL_ICON,
  SALE_CHANNEL_LABEL,
  type SaleChannel,
} from '@/lib/constants';
import { createSales } from '../actions';

const QUICK = [10000, 50000, 100000];

export function SaleNewForm({ defaultDate }: { defaultDate?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [saleDate, setSaleDate] = useState(defaultDate ?? todayInKST());
  const [amounts, setAmounts] = useState<Record<SaleChannel, number>>(
    () => SALE_CHANNELS.reduce((acc, c) => ({ ...acc, [c]: 0 }), {} as Record<SaleChannel, number>),
  );
  const [memo, setMemo] = useState('');

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
    startTransition(async () => {
      const result = await createSales({ saleDate, amounts, memo });
      if (result?.error) setError(result.error);
    });
  }

  const today = todayInKST();
  const yesterday = (() => {
    const d = new Date(today + 'T00:00:00+09:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 날짜 + 빠른 칩 */}
      <div className="rounded-[20px] border border-[#E9EAF4] bg-white p-4">
        <label className="block text-[13px] font-semibold text-slate-700">날짜</label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={saleDate}
            max={today}
            onChange={(e) => setSaleDate(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          />
          <button type="button" onClick={() => setSaleDate(yesterday)}
            className={'rounded-xl px-3 py-2 text-[13px] font-semibold transition ' + (saleDate === yesterday ? 'bg-[#EEF0FE] text-[#5961E6]' : 'bg-[#F5F5FB] text-slate-500')}>어제</button>
          <button type="button" onClick={() => setSaleDate(today)}
            className={'rounded-xl px-3 py-2 text-[13px] font-semibold transition ' + (saleDate === today ? 'bg-[#EEF0FE] text-[#5961E6]' : 'bg-[#F5F5FB] text-slate-500')}>오늘</button>
        </div>
      </div>

      {/* 결제수단별 입력 + 빠른금액 */}
      <div className="rounded-[20px] border border-[#E9EAF4] bg-white p-4">
        <p className="mb-3 text-[12px] text-slate-500">결제수단별로 입력하세요. 비워둔 채널은 저장되지 않아요.</p>
        <div className="space-y-3">
          {SALE_CHANNELS.map((c) => (
            <div key={c} className="rounded-2xl border border-[#EEF0F6] bg-[#FBFBFE] p-3">
              <div className="flex items-center gap-2">
                <span className="text-[15px]" aria-hidden>{SALE_CHANNEL_ICON[c]}</span>
                <span className="flex-1 text-[13.5px] font-semibold text-slate-700">{SALE_CHANNEL_LABEL[c]}</span>
                <div className="w-[44%] sm:w-[200px]">
                  <MoneyInput label="" value={amounts[c]} onChange={(n) => setChannel(c, n)} size="md" />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7">
                {QUICK.map((q) => (
                  <button key={q} type="button" onClick={() => bump(c, q)}
                    className="rounded-lg bg-[#F1F1FB] px-2.5 py-1 text-[11.5px] font-bold text-[#6366F1] transition active:scale-95 hover:bg-[#EAEBFB]">
                    +{q >= 10000 ? `${q / 10000}만` : q.toLocaleString()}
                  </button>
                ))}
                {amounts[c] > 0 && (
                  <button type="button" onClick={() => setChannel(c, 0)}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-500 active:scale-95">지우기</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 메모 */}
      <div className="rounded-[20px] border border-[#E9EAF4] bg-white p-4">
        <label className="block text-[13px] font-semibold text-slate-700">메모 (선택)</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="단체 손님, 비 오는 날 등"
          className="mt-2 w-full rounded-xl border border-[#E3E5F0] px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
        />
      </div>

      {/* 합계 */}
      <div className="rounded-[20px] border border-[#E4E6FB] bg-[#EEF0FE] px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-semibold text-[#5961E6]">합계</span>
          <span className="text-[26px] font-extrabold tabular-nums text-[#4F54D8]">{formatWon(total)}</span>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()} disabled={pending}>취소</Button>
        <Button type="submit" size="lg" className="flex-[2]" disabled={pending || total === 0}>{pending ? '저장 중…' : '저장'}</Button>
      </div>

      <p className="text-center text-xs text-slate-400">
        상품별 상세 입력은 추후 지원됩니다.{' '}
        <Link href="/sales" className="font-semibold text-[#6366F1] hover:underline">매출 목록으로</Link>
      </p>
    </form>
  );
}
