'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { switchStore } from '@/lib/auth/actions';
import type { StoreRole } from '@/lib/auth/store-context';

export interface StoreOption {
  storeId: string;
  storeName: string;
  role: StoreRole;
}

export function StoreSwitcher({
  current,
  options,
  onDark = false,
}: {
  current: StoreOption;
  options: StoreOption[];
  onDark?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSelect(storeId: string) {
    if (storeId === current.storeId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await switchStore(storeId);
      setOpen(false);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      // 사용자 요청: 매장 전환 시 현재 탭 유지가 아니라 홈으로 이동.
      //   - replace() — 뒤로가기로 이전 매장의 페이지로 돌아가지 않게.
      //   - refresh() — 서버 컴포넌트가 새 매장 컨텍스트로 다시 렌더되도록.
      router.replace('/dashboard');
      router.refresh();
    });
  }

  const containerCls = onDark
    ? 'border-slate-700 bg-slate-800'
    : 'border-[#EAECF5] bg-white';
  const titleCls = onDark ? 'text-white' : 'text-slate-900';
  const subCls = onDark ? 'text-slate-400' : 'text-slate-400';
  const arrowCls = onDark ? 'text-slate-400' : 'text-slate-400';
  const hoverCls = onDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className={`flex w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${containerCls} ${hoverCls}`}
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${titleCls}`}>
            {current.storeName}
          </span>
          <span className={`block text-[10px] ${subCls}`}>
            {current.role === 'owner' ? '최고관리자' : '매니저'} · {options.length}개 매장
          </span>
        </span>
        <span className={`ml-2 ${arrowCls}`}>▾</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 right-0 z-20 mt-1 rounded-md border border-[#EAECF5] bg-white shadow-lg">
            <ul className="max-h-60 overflow-y-auto py-1">
              {options.map((o) => {
                const active = o.storeId === current.storeId;
                return (
                  <li key={o.storeId}>
                    <button
                      type="button"
                      onClick={() => handleSelect(o.storeId)}
                      className={
                        'flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 active:bg-slate-100 ' +
                        (active ? 'bg-indigo-50' : '')
                      }
                    >
                      <span className="min-w-0 flex-1">
                        <span className={'block truncate ' + (active ? 'font-semibold text-indigo-700' : 'text-slate-900')}>
                          {o.storeName}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {o.role === 'owner' ? '최고관리자' : '매니저'}
                        </span>
                      </span>
                      {active && <span className="ml-2 text-xs text-indigo-600">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-[#EAECF5] p-1">
              <Link
                href="/stores/new"
                onClick={() => setOpen(false)}
                className="block cursor-pointer rounded px-3 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 active:bg-indigo-100"
              >
                + 새 매장 추가
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
