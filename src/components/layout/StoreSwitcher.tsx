'use client';

import { useState, useTransition } from 'react';
import { appAlert } from '@/components/ui/appDialog';
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
        void appAlert(result.error);
        return;
      }
      // 매장 전환 시 홈으로 이동. switchStore가 이미 revalidatePath('/', 'layout')로
      // 서버 캐시를 무효화하므로, replace() 한 번이면 새 매장 컨텍스트로 SSR된다.
      // (기존엔 replace 직후 refresh()까지 호출해 전체 SSR이 2회 돌며 전환이 느렸음)
      router.replace('/dashboard');
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
      {/* 전환 중 전체 화면 피드백 — SSR 재렌더 동안 멈춘 것처럼 보이지 않게 */}
      {pending && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
          <p className="mt-3 text-sm font-semibold text-slate-700">매장 전환 중…</p>
        </div>
      )}
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
              {options.length > 1 && (
                <Link
                  href="/stores"
                  onClick={() => setOpen(false)}
                  className="block cursor-pointer rounded px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  전체 매장 보기
                </Link>
              )}
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
