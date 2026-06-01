'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

/** 어디서든 호출 가능한 토스트 트리거 (같은 페이지). */
export function toast(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rm:toast', { detail: message }));
  }
}

const SAVED_LABEL: Record<string, string> = {
  sale: '매출이 저장됐어요',
  expense: '비용이 저장됐어요',
  '1': '저장됐어요',
};

/** 전역 토스트 — 저장 등 액션 성공 피드백. (app) 레이아웃에 1회 마운트. */
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  const pathname = usePathname();

  const show = useCallback((m: string) => {
    setMsg(m);
    const w = window as unknown as { __rmToastT?: number };
    if (w.__rmToastT) window.clearTimeout(w.__rmToastT);
    w.__rmToastT = window.setTimeout(() => setMsg(null), 2600);
  }, []);

  // 같은 페이지 이벤트
  useEffect(() => {
    const h = (e: Event) => show((e as CustomEvent).detail as string);
    window.addEventListener('rm:toast', h);
    return () => window.removeEventListener('rm:toast', h);
  }, [show]);

  // 네비게이션 후 ?saved= 파라미터로 들어온 성공 피드백
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const saved = sp.get('saved');
    if (saved) {
      show(SAVED_LABEL[saved] ?? '저장됐어요');
      sp.delete('saved');
      const q = sp.toString();
      window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : ''));
    }
  }, [pathname, show]);

  if (!msg) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
      <div className="rm-toast-in pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-lg backdrop-blur-md">
        <CheckCircle2 className="h-4 w-4 text-emerald-300" strokeWidth={2.4} />
        {msg}
      </div>
    </div>
  );
}
