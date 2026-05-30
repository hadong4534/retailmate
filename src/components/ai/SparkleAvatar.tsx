/**
 * AI "뇌" 아이콘 — 그라데이션 + 반짝임 애니메이션.
 * 챗봇 헤더와 메시지 옆에 사용.
 */

import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
  /** 둥근 배경 + 글로우 적용 (헤더용) */
  withGlow?: boolean;
}

export function SparkleAvatar({ size = 40, className, withGlow = false }: Props) {
  if (withGlow) {
    return (
      <span
        className={cn(
          'relative inline-flex items-center justify-center',
          className,
        )}
        style={{ width: size, height: size }}
      >
        {/* 글로우 펄스 */}
        <span
          className="absolute inset-0 animate-ping rounded-full bg-blue-400/40"
          style={{ animationDuration: '2.5s' }}
        />
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-violet-500 to-pink-500 opacity-90 shadow-lg shadow-violet-500/40" />
        <SparkleSvg size={Math.round(size * 0.6)} className="relative text-white" />
      </span>
    );
  }
  return <SparkleSvg size={size} className={cn('text-blue-500', className)} />;
}

function SparkleSvg({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="AI"
    >
      {/* 메인 별 — 천천히 반짝 */}
      <g
        className="origin-center animate-pulse"
        style={{ animationDuration: '3s' }}
      >
        <path
          d="M16 4 L18 13 L27 16 L18 19 L16 28 L14 19 L5 16 L14 13 Z"
          fill="currentColor"
        />
      </g>
      {/* 보조 별 1 */}
      <g
        className="origin-center animate-pulse"
        style={{ animationDuration: '2s', animationDelay: '0.4s' }}
      >
        <path
          d="M25 5 L25.8 7.2 L28 8 L25.8 8.8 L25 11 L24.2 8.8 L22 8 L24.2 7.2 Z"
          fill="currentColor"
          opacity="0.85"
        />
      </g>
      {/* 보조 별 2 */}
      <g
        className="origin-center animate-pulse"
        style={{ animationDuration: '2.4s', animationDelay: '0.8s' }}
      >
        <path
          d="M7 22 L7.6 23.6 L9.2 24.2 L7.6 24.8 L7 26.4 L6.4 24.8 L4.8 24.2 L6.4 23.6 Z"
          fill="currentColor"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}
