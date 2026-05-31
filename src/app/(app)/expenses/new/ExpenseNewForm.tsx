'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { todayInKST } from '@/lib/utils';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LUCIDE,
  EXPENSE_CATEGORY_LABEL,
  type ExpenseCategory,
} from '@/lib/constants';
import { createExpense } from '../actions';

const QUICK = [10000, 50000, 100000];

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
      const result = await createExpense({ expenseDate, category, amount, vendor, memo, itemName, paymentMethod });
      if (result?.error) setError(result.error);
    });
  }

  const tile = (active: boolean) =>
    'rounded-xl border px-2 py-3 text-[12px] font-semibold transition active:scale-95 ' +
    (active ? 'border-[#C9CCF7] bg-[#EEF0FE] text-[#5961E6]' : 'border-[#EAECF5] bg-white text-slate-600 hover:bg-[#F8F8FE]');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[20px] border border-[#E9EAF4] bg-white p-4">
        <label className="block text-[13px] font-semibold text-slate-700">날짜</label>
        <input type="date" value={expenseDate} max={todayInKST()} onChange={(e) => setExpenseDate(e.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]" />
      </div>

      <div className="rounded-[20px] border border-[#E9EAF4] bg-white p-4">
        <label className="block text-[13px] font-semibold text-slate-700">카테고리</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const CatIcon = EXPENSE_CATEGORY_LUCIDE[c];
            return (
            <button key={c} type="button" onClick={() => setCategory(c)} className={'flex flex-col items-center gap-1 ' + tile(category === c)}>
              <CatIcon className="h-[18px] w-[18px]" aria-hidden />
              <span>{EXPENSE_CATEGORY_LABEL[c]}</span>
            </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[20px] border border-[#E9EAF4] bg-white p-4 space-y-4">
        <Input label="항목명" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="예: 식자재 구입, 5월 직원 급여" maxLength={50} />
        <div>
          <MoneyInput label="금액" value={amount} onChange={setAmount} size="lg" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => setAmount((a) => Math.max(0, a + q))}
                className="rounded-lg bg-[#F1F1FB] px-2.5 py-1 text-[11.5px] font-bold text-[#6366F1] transition active:scale-95 hover:bg-[#EAEBFB]">
                +{q / 10000}만
              </button>
            ))}
            {amount > 0 && (
              <button type="button" onClick={() => setAmount(0)} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-500 active:scale-95">지우기</button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-700">결제수단</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {['현금', '카드', '계좌이체', '기타'].map((m) => (
              <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={tile(paymentMethod === m)}>{m}</button>
            ))}
          </div>
        </div>
        <Input label="거래처 (선택)" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="예: 한솔식자재" maxLength={50} />
        <div>
          <label className="block text-[13px] font-semibold text-slate-700">메모 (선택)</label>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} maxLength={200}
            className="mt-2 w-full rounded-xl border border-[#E3E5F0] px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]" />
        </div>
      </div>

      <div className="rounded-[20px] border border-dashed border-[#D8DAEC] bg-[#F8F8FE] px-4 py-6 text-center">
        <p className="text-sm font-medium text-slate-500">영수증 첨부 — 곧 지원</p>
        <p className="mt-1 text-xs text-slate-400">영수증 사진 업로드는 다음 업데이트에서 추가됩니다.</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()} disabled={pending}>취소</Button>
        <Button type="submit" size="lg" className="flex-[2]" disabled={pending || amount === 0}>{pending ? '저장 중…' : '저장'}</Button>
      </div>
    </form>
  );
}
