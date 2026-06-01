'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

/**
 * 당겨서 새로고침 — 모바일. 스크롤 최상단에서 아래로 끌면 인디케이터가 나오고,
 * 임계값을 넘겨 떼면 router.refresh(). passive 리스너만 사용해 스크롤을 방해하지 않음.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [dist, setDist] = useState(0);
  const [busy, setBusy] = useState(false);
  const ref = useRef({ startY: 0, pulling: false, dist: 0, busy: false });
  const THRESH = 70;

  useEffect(() => {
    const st = ref.current;
    function onStart(e: TouchEvent) {
      if (window.scrollY <= 0 && e.touches.length === 1 && !st.busy) {
        st.startY = e.touches[0].clientY; st.pulling = true;
      } else st.pulling = false;
    }
    function onMove(e: TouchEvent) {
      if (!st.pulling || st.busy) return;
      const dy = e.touches[0].clientY - st.startY;
      if (dy > 0 && window.scrollY <= 0) {
        st.dist = Math.min(dy * 0.5, 88); setDist(st.dist);
      } else { st.dist = 0; setDist(0); }
    }
    function onEnd() {
      if (!st.pulling) return;
      st.pulling = false;
      if (st.dist >= THRESH && !st.busy) {
        st.busy = true; setBusy(true); st.dist = 48; setDist(48);
        router.refresh();
        window.setTimeout(() => { st.busy = false; setBusy(false); st.dist = 0; setDist(0); }, 900);
      } else { st.dist = 0; setDist(0); }
    }
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [router]);

  if (dist <= 0 && !busy) return null;
  const ready = dist >= THRESH || busy;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center lg:hidden"
      style={{ transform: `translateY(${Math.max(0, dist)}px)`, transition: ref.current.pulling ? 'none' : 'transform .25s', paddingTop: 'env(safe-area-inset-top)' }}>
      <span className={'mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ' + (ready ? 'text-[#6366F1]' : 'text-slate-300')}>
        <RefreshCw className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')} style={{ transform: busy ? undefined : `rotate(${dist * 4}deg)` }} strokeWidth={2.4} />
      </span>
    </div>
  );
}
