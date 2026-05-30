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
  /** 다크 배경(예: 사이드바)에서 흰색 텍스트로 */
  onDark?: boolean;
}

/**
 * 리테일메이트 브랜드 로고 아이콘.
 *
 * - viewBox 48x48 정사각으로 비율 깨짐 방지.
 * - currentColor 사용 → text 색상 클래스로 어디서든 재사용.
 * - 상승 막대그래프 3개 + 우상향 화살표 표현.
 */
export function LogoMark({
  size = 26,
  className,
  ...rest
}: { size?: number } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox'>) {
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
      {/* 막대그래프 3개 — 점진적 상승 */}
      <rect x="7" y="28" width="6" height="12" rx="2" fill="currentColor" />
      <rect x="19" y="22" width="6" height="18" rx="2" fill="currentColor" />
      <rect x="31" y="15" width="6" height="25" rx="2" fill="currentColor" />
      {/* 우상향 라인 (막대 윗부분을 잇는 추세선) */}
      <path
        d="M9 24 L20 17 L28 19 L39 8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 화살표 머리 */}
      <path
        d="M31 8 H39 V16"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const markClass = onDark ? 'text-white' : 'text-blue-600';
  return (
    <span className={cn('inline-flex items-center', s.box, className)}>
      <LogoMark size={s.mark} className={markClass} />
      {!iconOnly && !hideText && (
        <span className={cn('font-bold tracking-tight', textClass, s.text)}>
          리테일메이트
        </span>
      )}
    </span>
  );
}

/**
 * Splash·랜딩 영웅 등 큰 화면용 로고 아이콘.
 * Tailwind size 클래스로 자유 조정.
 */
export function RetailMateLogoIcon({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="리테일메이트"
      className={className}
      {...rest}
    >
      <rect x="7" y="28" width="6" height="12" rx="2" fill="currentColor" />
      <rect x="19" y="22" width="6" height="18" rx="2" fill="currentColor" />
      <rect x="31" y="15" width="6" height="25" rx="2" fill="currentColor" />
      <path
        d="M9 24 L20 17 L28 19 L39 8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 8 H39 V16"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
