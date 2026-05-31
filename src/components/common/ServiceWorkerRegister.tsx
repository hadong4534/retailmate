'use client';

import { useEffect } from 'react';

/**
 * Service Worker 등록 — production에서만 작동.
 * 개발 중에는 SW가 캐싱해 변경사항이 안 보일 수 있어 일부러 비활성화.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // 등록 실패는 조용히 무시 — 기본 웹 동작은 정상 유지
      }
    };
    // 페이지 로드 후 idle 시점에 등록 (초기 로딩에 영향 없음)
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(register);
    } else {
      setTimeout(register, 1500);
    }
  }, []);

  return null;
}
