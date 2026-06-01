import { cn } from '@/lib/utils';
import type { SVGProps } from 'react';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<Size, { box: string; mark: number; text: string }> = {
  sm: { box: 'gap-1.5', mark: 22, text: 'text-base' },
  md: { box: 'gap-2', mark: 26, text: 'text-lg' },
  lg: { box: 'gap-2.5', mark: 32, text: 'text-xl' },
  xl: { box: 'gap-3', mark: 48, text: 'text-2xl' },
};

interface Props {
  size?: Size;
  iconOnly?: boolean;
  hideText?: boolean;
  className?: string;
  onDark?: boolean;
}

let gradSeq = 0;

/**
 * 리테일메이트 브랜드 로고 아이콘 (Aurora 페리윙클 그라데이션).
 * - white=true 면 단색 흰색(currentColor) — 다크 배경용.
 */
export function LogoMark({
  size = 26,
  white = false,
  className,
  ...rest
}: { size?: number; white?: boolean } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox'>) {
  const gid = `rmLogoGrad${white ? '' : ++gradSeq}`;
  const paint = white ? 'currentColor' : `url(#${gid})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="리테일메이트"
      className={className}
      {...rest}
    >
      {!white && (
        <defs>
          <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#8E94F2" />
            <stop offset="0.55" stopColor="#6366F1" />
            <stop offset="1" stopColor="#7FB8EE" />
          </linearGradient>
        </defs>
      )}
      <rect x="7" y="28" width="6" height="12" rx="2" fill={paint} />
      <rect x="19" y="22" width="6" height="18" rx="2" fill={paint} />
      <rect x="31" y="15" width="6" height="25" rx="2" fill={paint} />
      <path d="M9 24 L20 17 L28 19 L39 8" stroke={paint} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 8 H39 V16" stroke={paint} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({
  size = 'md',
  iconOnly = false,
  hideText = false,
  className,
  onDark = false,
}: Props) {
  const s = sizeMap[size];
  const textClass = onDark ? 'text-white' : 'text-slate-900';
  return (
    <span className={cn('inline-flex items-center', s.box, className)}>
      <LogoMark size={s.mark} white={onDark} className={onDark ? 'text-white' : undefined} />
      {!iconOnly && !hideText && (
        <span className={cn('font-bold tracking-tight', textClass, s.text)}>
          리테일메이트
        </span>
      )}
    </span>
  );
}

/** 큰 화면용 로고 아이콘 — currentColor(주로 흰색/단색 배경 위). */
export function RetailMateLogoIcon({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="리테일메이트" className={className} {...rest}>
      <rect x="7" y="28" width="6" height="12" rx="2" fill="currentColor" />
      <rect x="19" y="22" width="6" height="18" rx="2" fill="currentColor" />
      <rect x="31" y="15" width="6" height="25" rx="2" fill="currentColor" />
      <path d="M9 24 L20 17 L28 19 L39 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 8 H39 V16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
