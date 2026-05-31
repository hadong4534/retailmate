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

export function SaleNewForm({ defaultDate }: { defaultDate?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [saleDate, setSaleDate] = useState(defaultDate ?? todayInKST());
  const [amounts, setAmounts] = useState<Record<SaleChannel, number>>(
    () => SALE_CHANNELS.reduce(
      (acc, c) => ({ ...acc, [c]: 0 }),
      {} as Record<SaleChannel, number>,
    ),
  );
  const [memo, setMemo] = useState('');

  const total = SALE_CHANNELS.reduce((acc, c) => acc + (amounts[c] || 0), 0);

  function setChannel(c: SaleChannel, n: number) {
    setAmounts((a) => ({ ...a, [c]: n }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSales({ saleDate, amounts, memo });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700">날짜</label>
        <input
          type="date"
          value={saleDate}
          max={todayInKST()}
          onChange={(e) => setSaleDate(e.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-xs text-slate-500">
          결제수단별로 입력하세요. 0원이거나 비워둔 채널은 저장되지 않습니다.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SALE_CHANNELS.map((c) => (
            <MoneyInput
              key={c}
              label={`${SALE_CHANNEL_LABEL[c]} 매출`}
              icon={SALE_CHANNEL_ICON[c]}
              value={amounts[c]}
              onChange={(n) => setChannel(c, n)}
              size="md"
            />
          ))}
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
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => router.back()}
          disabled={pending}
        >
          취소
        </Button>
        <Button type="submit" size="lg" className="flex-[2]" disabled={pending || total === 0}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>

      <p className="text-center text-xs text-slate-500">
        상품별 상세 입력은 추후 지원됩니다.{' '}
        <Link href="/sales" className="text-indigo-600 hover:underline">
          매출 목록으로
        </Link>
      </p>
    </form>
  );
}
