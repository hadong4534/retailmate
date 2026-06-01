'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { switchStore } from '@/lib/auth/actions';

export function StoreEnterButton({ storeId, isCurrent }: { storeId: string; isCurrent: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function enter() {
    start(async () => {
      if (!isCurrent) {
        const r = await switchStore(storeId);
        if ('error' in r) { alert(r.error); return; }
      }
      router.replace('/dashboard');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={enter}
      disabled={pending}
      className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#6366F1] px-4 py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.98] hover:bg-[#5458E6] disabled:opacity-50"
    >
      {pending ? '여는 중…' : isCurrent ? '현재 매장 · 대시보드' : '이 매장 관리하기'}
    </button>
  );
}
