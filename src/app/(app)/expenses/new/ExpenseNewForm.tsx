'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { createClient } from '@/lib/supabase/client';
import { todayInKST } from '@/lib/utils';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LUCIDE,
  EXPENSE_CATEGORY_LABEL,
  type ExpenseCategory,
} from '@/lib/constants';
import { createExpense, deleteExpenseTemplate } from '../actions';

const QUICK = [10000, 50000, 100000];

export interface ExpenseTemplate {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  payment_method: string | null;
  vendor: string | null;
  memo: string | null;
}

export function ExpenseNewForm({
  defaultDate,
  storeId,
  templates,
}: {
  defaultDate?: string;
  storeId: string;
  templates: ExpenseTemplate[];
}) {
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
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // 영수증
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // 템플릿 관리(삭제)
  const [tplList, setTplList] = useState<ExpenseTemplate[]>(templates);

  function applyTemplate(t: ExpenseTemplate) {
    setCategory(t.category);
    setAmount(t.amount);
    setItemName(t.name);
    setVendor(t.vendor ?? '');
    setMemo(t.memo ?? '');
    if (t.payment_method) setPaymentMethod(t.payment_method);
  }

  async function handleReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('영수증 이미지는 10MB 이하만 가능합니다.'); return; }
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${storeId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, file, {
        upsert: false, contentType: file.type || 'image/jpeg',
      });
      if (upErr) { setError('영수증 업로드 실패: ' + upErr.message); setUploading(false); return; }
      setReceiptPath(path);
      setReceiptPreview(URL.createObjectURL(file));
    } catch {
      setError('영수증 업로드 중 오류가 발생했습니다.');
    }
    setUploading(false);
  }

  async function removeReceipt() {
    if (receiptPath) {
      try { await createClient().storage.from('receipts').remove([receiptPath]); } catch { /* best effort */ }
    }
    setReceiptPath(null);
    setReceiptPreview(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createExpense({
        expenseDate, category, amount, vendor, memo, itemName, paymentMethod,
        receiptPath: receiptPath ?? undefined,
        saveAsTemplate,
      });
      if (result?.error) setError(result.error);
    });
  }

  function handleDeleteTemplate(id: string) {
    setTplList((l) => l.filter((t) => t.id !== id));
    startTransition(async () => { await deleteExpenseTemplate(id); });
  }

  const tile = (active: boolean) =>
    'rounded-xl border px-2 py-3 text-[12px] font-semibold transition active:scale-95 ' +
    (active ? 'border-[#C9CCF7] bg-[#EEF0FE] text-[#5961E6]' : 'border-[#EAECF5] bg-white text-slate-600 hover:bg-[#F8F8FE]');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 반복 지출 템플릿 — 불러오기 */}
      {tplList.length > 0 && (
        <div className="rounded-[20px] border border-[#E9EAF4] bg-white p-4">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
            <Repeat className="h-4 w-4 text-[#6366F1]" strokeWidth={2.2} /> 반복 지출 불러오기
          </div>
          <p className="mt-1 text-[11.5px] text-slate-400">자주 쓰는 지출(임대료·정기 식자재 등)을 한 번에 채워요.</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {tplList.map((t) => {
              const Icon = EXPENSE_CATEGORY_LUCIDE[t.category];
              return (
                <span key={t.id} className="inline-flex items-center gap-1 rounded-xl border border-[#E1E0F8] bg-[#F7F7FE] py-1 pl-1 pr-1">
                  <button type="button" onClick={() => applyTemplate(t)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#5961E6] transition active:scale-95 hover:bg-[#EEF0FE]">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {t.name} · ₩{t.amount.toLocaleString('ko-KR')}
                  </button>
                  <button type="button" aria-label="템플릿 삭제" onClick={() => handleDeleteTemplate(t.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

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

      {/* 영수증 첨부 */}
      <div className="rounded-[20px] border border-[#E9EAF4] bg-white p-4">
        <label className="block text-[13px] font-semibold text-slate-700">영수증 첨부 (선택)</label>
        {receiptPreview ? (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptPreview} alt="영수증 미리보기" className="h-20 w-20 rounded-xl border border-[#EAECF5] object-cover" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-emerald-700">첨부됨</p>
              <button type="button" onClick={removeReceipt} className="mt-1 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 active:scale-95">
                <X className="h-3.5 w-3.5" /> 삭제
              </button>
            </div>
          </div>
        ) : (
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#C9CCF7] bg-[#F8F8FE] px-4 py-6 text-center transition active:scale-[0.99] hover:bg-[#F1F1FB]">
            <Camera className="h-6 w-6 text-[#6366F1]" strokeWidth={1.9} />
            <span className="mt-1.5 text-[13px] font-semibold text-[#5961E6]">{uploading ? '업로드 중…' : '사진 촬영 / 이미지 선택'}</span>
            <span className="mt-0.5 text-[11px] text-slate-400">카메라로 영수증을 바로 찍어 첨부할 수 있어요 (10MB 이하)</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceipt} disabled={uploading} />
          </label>
        )}
      </div>

      {/* 반복 지출로 저장 */}
      <label className="flex cursor-pointer items-center gap-2 rounded-[20px] border border-[#E9EAF4] bg-white px-4 py-3.5 text-[13px] text-slate-700">
        <input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)}
          className="h-4 w-4 rounded border-[#E3E5F0] text-indigo-600 focus:ring-2 focus:ring-[#E4E6FB]" />
        <span className="flex items-center gap-1.5"><Repeat className="h-4 w-4 text-[#6366F1]" strokeWidth={2.2} /> 이 내용을 반복 지출로 저장</span>
      </label>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()} disabled={pending}>취소</Button>
        <Button type="submit" size="lg" className="flex-[2]" disabled={pending || amount === 0 || uploading}>{pending ? '저장 중…' : '저장'}</Button>
      </div>
    </form>
  );
}
