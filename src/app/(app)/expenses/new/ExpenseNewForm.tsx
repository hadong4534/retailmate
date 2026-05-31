'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { todayInKST } from '@/lib/utils';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_ICON,
  EXPENSE_CATEGORY_LABEL,
  type ExpenseCategory,
} from '@/lib/constants';
import { createExpense } from '../actions';

export function ExpenseNewForm({ defaultDate }: { defaultDate?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [expenseDate, setExpenseDate] = useState(defaultDate ?? todayInKST());
  const [category, setCategory] = useState<ExpenseCategory>('material');
  const [amount, setAmount] = useState(0);
  const [vendor, setVendor] = useState('');
  const [memo, setMemo] = useState('');
  const [itemName, setItemName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('카드');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createExpense({
        expenseDate,
        category,
        amount,
        vendor,
        memo,
        itemName,
        paymentMethod,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700">날짜</label>
        <input
          type="date"
          value={expenseDate}
          max={todayInKST()}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">카테고리</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  'flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition ' +
                  (active
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')
                }
              >
                <span className="text-lg">{EXPENSE_CATEGORY_ICON[c]}</span>
                <span>{EXPENSE_CATEGORY_LABEL[c]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Input
        label="항목명"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="예: 식자재 구입, 5월 직원 급여"
        maxLength={50}
      />

      <MoneyInput label="금액" value={amount} onChange={setAmount} size="lg" />

      <div>
        <label className="block text-sm font-medium text-slate-700">결제수단</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {['현금', '카드', '계좌이체', '기타'].map((m) => {
            const active = paymentMethod === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={
                  'rounded-md border px-3 py-2 text-sm font-medium transition ' +
                  (active
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')
                }
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <Input
        label="거래처 (선택)"
        value={vendor}
        onChange={(e) => setVendor(e.target.value)}
        placeholder="예: 한솔식자재"
        maxLength={50}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700">메모 (선택)</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          maxLength={200}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400">영수증 첨부</label>
        <div className="mt-1 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm text-slate-500">곧 지원됩니다</p>
          <p className="mt-1 text-xs text-slate-400">
            영수증 사진 업로드는 다음 업데이트에서 추가됩니다.
          </p>
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
        <Button
          type="submit"
          size="lg"
          className="flex-[2]"
          disabled={pending || amount === 0}
        >
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </form>
  );
}
