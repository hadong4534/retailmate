'use client';

import { useEffect, useRef } from 'react';

/**
 * 랜딩 히어로 배경 영상.
 * - 서버 컴포넌트에서 <video muted>가 브라우저에 따라 자동재생이 막히는 경우가 있어
 *   클라이언트에서 muted를 강제하고 play()를 직접 호출해 PC/모바일 모두 안정적으로 재생.
 * - 자동재생이 막혀도 poster 이미지가 그대로 보이므로 화면이 깨지지 않음.
 */
export function HeroBackgroundVideo({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    tryPlay();
    v.addEventListener('loadeddata', tryPlay, { once: true });
    return () => v.removeEventListener('loadeddata', tryPlay);
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/home-hero.jpg"
      aria-hidden
      className={className}
    >
      <source src="/home-hero.mp4" type="video/mp4" />
    </video>
  );
}
