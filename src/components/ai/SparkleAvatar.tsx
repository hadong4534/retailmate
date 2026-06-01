import { cn } from '@/lib/utils';

/**
 * AI 아바타 — 브랜드 글래스 오브(aurora-orb). 챗봇 헤더·말풍선·폼에 사용.
 * (기존 별 SVG에서 브랜드 오브로 교체 — 디자인 일관성)
 */
interface Props {
  size?: number;
  className?: string;
  /** 둥근 글로우 후광(헤더·말풍선용) */
  withGlow?: boolean;
}

export function SparkleAvatar({ size = 40, className, withGlow = false }: Props) {
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-label="AI"
    >
      {withGlow && (
        <span aria-hidden className="absolute inset-0 rounded-full bg-[#8E94F2]/25 blur-md" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/aurora-orb.png" alt="" aria-hidden className="relative h-full w-full object-contain" />
    </span>
  );
}
