'use client';

import { useEffect, useState } from 'react';

/**
 * 앱 진입 스플래시 (Aurora 파스텔).
 * - 0~900ms 표시 → 900ms fade-out → 1200ms DOM 제거
 * - prefers-reduced-motion: 단순 fade
 */
export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 900);
    const t2 = setTimeout(() => setShow(false), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-label="리테일메이트 로딩 중"
      className={
        'fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden ' +
        'transition-opacity duration-150 ease-out motion-reduce:duration-100 ' +
        (leaving ? 'opacity-0 pointer-events-none' : 'opacity-100')
      }
      style={{
        background:
          'radial-gradient(ellipse at 22% 18%, #DCD9FB 0%, transparent 55%),' +
          'radial-gradient(ellipse at 82% 78%, #CDE8FA 0%, transparent 52%),' +
          'radial-gradient(ellipse at 78% 14%, #F4DCEE 0%, transparent 45%),' +
          'linear-gradient(135deg, #F6F5FE 0%, #EEF1FB 55%, #F2ECFA 100%)',
      }}
    >
      {/* 배경 파스텔 sparkle dots */}
      <div className="pointer-events-none absolute inset-0 motion-reduce:hidden">
        <span className="rm-twinkle absolute h-1.5 w-1.5 rounded-full bg-[#A8AAF6]/70 blur-[1px]" style={{ top: '24%', left: '18%' }} />
        <span className="rm-twinkle absolute h-2 w-2 rounded-full bg-[#96CDF5]/70 blur-[1px]" style={{ top: '70%', left: '78%', animationDelay: '0.4s' }} />
        <span className="rm-twinkle absolute h-1.5 w-1.5 rounded-full bg-[#F3C8E6]/70 blur-[1px]" style={{ top: '38%', left: '82%', animationDelay: '0.8s' }} />
        <span className="rm-twinkle absolute h-1 w-1 rounded-full bg-[#C7C9F7]/90" style={{ top: '82%', left: '22%', animationDelay: '1.1s' }} />
      </div>

      <div className="relative flex flex-col items-center px-6">
        <div className="relative">
          <span
            aria-hidden
            className="rm-glow absolute inset-0 -z-10 rounded-full bg-[#8E94F2]/35 blur-3xl motion-reduce:hidden"
          />
          <div className="rm-rise flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-logo.png"
              alt="리테일메이트"
              className="h-[112px] w-[112px] object-contain drop-shadow-[0_12px_34px_rgba(99,102,241,0.38)] sm:h-[140px] sm:w-[140px]"
            />
          </div>
        </div>

        <h1 className="rm-fade-up mt-6 bg-gradient-to-r from-[#6366F1] via-[#8E94F2] to-[#7FB8EE] bg-clip-text text-[32px] font-extrabold tracking-tight text-transparent sm:mt-7 sm:text-[44px]">
          리테일메이트
        </h1>
        <p className="rm-fade-up mt-3 text-[15px] font-medium text-[#7C82A0] sm:text-[17px]" style={{ animationDelay: '120ms' }}>
          매장 운영을 더 스마트하게
        </p>

        <div className="mt-8 h-[3px] w-[180px] overflow-hidden rounded-full bg-[#E6E5F6] sm:mt-10 sm:w-[260px]" aria-hidden>
          <span className="rm-shimmer block h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#6366F1] to-transparent" />
        </div>
      </div>

      <style>{`
        .rm-rise { animation: rm-rise 700ms ease-out both; }
        .rm-fade-up { animation: rm-fade-up 900ms ease-out both; }
        .rm-glow { animation: rm-pulse 2.4s ease-in-out infinite; }
        .rm-twinkle { animation: rm-twinkle 2.6s ease-in-out infinite; }
        .rm-shimmer { animation: rm-shimmer 1100ms ease-in-out infinite; }
        @keyframes rm-rise { 0% { opacity: 0; transform: scale(0.96) translateY(6px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes rm-fade-up { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes rm-pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.08); } }
        @keyframes rm-twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes rm-shimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(420%); } }
        @media (prefers-reduced-motion: reduce) {
          .rm-rise, .rm-fade-up { animation: rm-fade-up 200ms ease-out both !important; transform: none !important; }
          .rm-glow { animation: none !important; opacity: 0.5 !important; }
          .rm-twinkle { animation: none !important; opacity: 0.3 !important; }
          .rm-shimmer { animation: none !important; transform: translateX(150%) !important; }
        }
      `}</style>
    </div>
  );
}
