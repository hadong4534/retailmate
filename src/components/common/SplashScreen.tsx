'use client';

import { useEffect, useState } from 'react';
import { RetailMateLogoIcon } from '@/components/ui/Logo';

/**
 * 앱 진입 스플래시.
 * - 0~900ms: 표시
 * - 900ms: fade-out 시작
 * - 1200ms: DOM 제거
 * - prefers-reduced-motion: scale/pulse 제거, 단순 fade만
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
          'radial-gradient(ellipse at 30% 20%, #1E40AF 0%, transparent 55%),' +
          'radial-gradient(ellipse at 75% 80%, #0EA5E9 0%, transparent 50%),' +
          'linear-gradient(135deg, #020617 0%, #0F172A 55%, #1E3A8A 100%)',
      }}
    >
      {/* 배경 sparkle dots */}
      <div className="pointer-events-none absolute inset-0 motion-reduce:hidden">
        <span className="rm-twinkle absolute h-1 w-1 rounded-full bg-cyan-300/70 blur-[1px]"
              style={{ top: '24%', left: '18%' }} />
        <span className="rm-twinkle absolute h-1.5 w-1.5 rounded-full bg-blue-300/70 blur-[1px]"
              style={{ top: '70%', left: '78%', animationDelay: '0.4s' }} />
        <span className="rm-twinkle absolute h-1 w-1 rounded-full bg-white/60 blur-[1px]"
              style={{ top: '38%', left: '82%', animationDelay: '0.8s' }} />
        <span className="rm-twinkle absolute h-0.5 w-0.5 rounded-full bg-cyan-200/80"
              style={{ top: '82%', left: '22%', animationDelay: '1.1s' }} />
      </div>

      {/* 중앙 컨텐츠 */}
      <div className="relative flex flex-col items-center px-6">
        {/* 로고 + glow */}
        <div className="relative">
          <span
            aria-hidden
            className="rm-glow absolute inset-0 -z-10 rounded-full bg-blue-500/40 blur-3xl motion-reduce:hidden"
          />
          <div className="rm-rise flex items-center justify-center rounded-3xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-md sm:p-6"
               style={{ boxShadow: '0 0 60px rgba(59,130,246,0.4)' }}>
            <RetailMateLogoIcon className="h-[72px] w-[72px] text-white sm:hidden" />
            <RetailMateLogoIcon className="hidden h-[88px] w-[88px] text-white sm:block" />
          </div>
        </div>

        {/* 브랜드명 */}
        <h1 className="rm-fade-up mt-6 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-[32px] font-extrabold tracking-tight text-transparent sm:mt-7 sm:text-[44px]">
          리테일메이트
        </h1>

        {/* 서브카피 */}
        <p className="rm-fade-up mt-3 text-[15px] text-blue-200/85 sm:text-[17px]"
           style={{ animationDelay: '120ms' }}>
          매장 운영을 더 스마트하게
        </p>

        {/* 로딩 라인 (shimmer) */}
        <div
          className="mt-8 h-[2px] w-[180px] overflow-hidden rounded-full bg-white/10 sm:mt-10 sm:w-[260px]"
          aria-hidden
        >
          <span className="rm-shimmer block h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        </div>
      </div>

      {/* 키프레임 정의 */}
      <style>{`
        .rm-rise {
          animation: rm-rise 700ms ease-out both;
        }
        .rm-fade-up {
          animation: rm-fade-up 900ms ease-out both;
        }
        .rm-glow {
          animation: rm-pulse 2.4s ease-in-out infinite;
        }
        .rm-twinkle {
          animation: rm-twinkle 2.6s ease-in-out infinite;
        }
        .rm-shimmer {
          animation: rm-shimmer 1100ms ease-in-out infinite;
        }
        @keyframes rm-rise {
          0% { opacity: 0; transform: scale(0.96) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes rm-fade-up {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes rm-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        @keyframes rm-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes rm-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(420%); }
        }
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
