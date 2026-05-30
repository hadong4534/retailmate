/**
 * 리테일메이트 공통 디자인 시스템 컴포넌트.
 *
 * 새 화면을 만들 때 이 컴포넌트들을 우선 사용하면 모바일/PC가 같은 룩을 유지한다.
 * 기존 코드를 점진적으로 이쪽으로 마이그레이션한다.
 *
 * ─── 컴포넌트 인벤토리 ──────────────────────────
 * 레이아웃        PageHeader, SectionHeader, AppCard(=SectionCard), AccentCard, AIInsightCard
 * KPI/액션        MetricCard, ActionCard, EmptyState
 * 텍스트/뱃지     CurrencyText, AppBadge(=StatusChip), DeltaChip, IconBadge
 * 버튼            Button, PrimaryButton, SecondaryButton, GhostButton, DangerButton (전부 ui/Button 별칭)
 * Shell 요소      Sidebar, MobileTopBar, BottomNavigation → 현재 AppShell 안에 통합되어 있음
 *                (외부로 분리 필요해지면 그때 추출, 지금은 AppShell이 단일 진실의 원천)
 *
 * import 예시:
 *   import { PageHeader, SectionCard, MetricCard, PrimaryButton, IconBadge } from '@/components/app';
 */

import type { ReactNode, HTMLAttributes } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatWon } from '@/lib/utils';
import { SparklesIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';

/* ───────────────────────── AppCard ─────────────────────────
   공통 카드 — bg-white + 보더 + soft shadow + radius. */
interface AppCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 'default'(p-5/p-6) | 'compact'(p-4) | 'flush'(p-0) */
  density?: 'default' | 'compact' | 'flush';
  /** 짙은 다크 카드(AI 인사이트 스타일) */
  tone?: 'light' | 'dark';
}

export function AppCard({
  className,
  density = 'default',
  tone = 'light',
  children,
  ...rest
}: AppCardProps) {
  const padCls =
    density === 'flush' ? 'p-0' : density === 'compact' ? 'p-4' : 'p-5 lg:p-6';
  const toneCls =
    tone === 'dark'
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ring-1 ring-white/5 text-white'
      : 'bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.05)]';
  return (
    <div
      className={cn('rounded-[20px] lg:rounded-[24px]', toneCls, padCls, className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── AppBadge ───────────────────────── */
type BadgeTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const BADGE_TONE: Record<BadgeTone, string> = {
  info:    'bg-blue-50 text-blue-700 ring-blue-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger:  'bg-red-50 text-red-700 ring-red-200',
  neutral: 'bg-slate-50 text-slate-700 ring-slate-200',
};

export function AppBadge({
  tone = 'neutral',
  children,
  className,
  Icon,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  Icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset',
        BADGE_TONE[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.4} />}
      {children}
    </span>
  );
}

/* ───────────────────────── CurrencyText ─────────────────────────
   금액 표시 통일. 모바일/PC 모두 "원" 접미. ₩ 가운데 가로선 문제 회피. */
type CurrencyTone = 'sales' | 'expense' | 'profit' | 'neutral';

const CURRENCY_COLOR: Record<CurrencyTone, string> = {
  sales:   'text-blue-600',
  expense: 'text-red-500',
  profit:  'text-emerald-600',
  neutral: 'text-slate-900',
};

export function CurrencyText({
  amount,
  tone = 'neutral',
  size = 'md',
  className,
}: {
  amount: number | null | undefined;
  tone?: CurrencyTone;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeCls = {
    sm: 'text-[13px] font-semibold',
    md: 'text-[15px] font-bold',
    lg: 'text-[20px] font-bold lg:text-2xl',
    xl: 'text-[28px] font-extrabold lg:text-4xl',
  }[size];

  return (
    <span className={cn('rm-tnum', sizeCls, CURRENCY_COLOR[tone], className)}>
      {formatWon(amount)}
    </span>
  );
}

/* ───────────────────────── SectionHeader ───────────────────────── */
export function SectionHeader({
  title,
  description,
  right,
  Icon,
  className,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  Icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="h-4 w-4 text-slate-500" strokeWidth={2.2} />}
          <h2 className="text-[19px] font-bold text-slate-900 lg:text-2xl">{title}</h2>
        </div>
        {description && (
          <p className="mt-0.5 text-[13px] text-slate-500 lg:text-sm">{description}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* ───────────────────────── PageHeader ─────────────────────────
   페이지 타이틀 — 좌측 컬러 아이콘 컨테이너 + 제목 + 설명. */
export function PageHeader({
  title,
  description,
  right,
  Icon,
  tone = 'blue',
  className,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: 'blue' | 'emerald' | 'red' | 'violet' | 'amber' | 'slate' | 'cyan';
  className?: string;
}) {
  const toneCls = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red:     'bg-red-50 text-red-500',
    violet:  'bg-violet-50 text-violet-600',
    amber:   'bg-amber-50 text-amber-600',
    cyan:    'bg-cyan-50 text-cyan-600',
    slate:   'bg-slate-100 text-slate-600',
  }[tone];

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', toneCls)}>
          <Icon className="h-[22px] w-[22px]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight text-slate-900 lg:text-[26px]">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-[13px] text-slate-500 lg:text-sm">{description}</p>
          )}
        </div>
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/* ───────────────────────── DeltaChip ─────────────────────────
   전기 대비 변동률 칩 — 자동 ▲/▼/− 표시 + 색상. */
export function DeltaChip({
  value,
  suffix,
  className,
}: {
  /** 백분율 (예: 12.4 또는 -5.3). null이면 표시 안 함. */
  value: number | null;
  suffix?: string;
  className?: string;
}) {
  if (value == null) return null;
  const positive = value > 0;
  const negative = value < 0;
  const cls = positive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : negative
    ? 'bg-red-50 text-red-700 ring-red-200'
    : 'bg-slate-50 text-slate-600 ring-slate-200';
  const arrow = positive ? '▲' : negative ? '▼' : '–';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ring-inset',
        cls,
        className,
      )}
    >
      <span aria-hidden>{arrow}</span>
      {Math.abs(value)}%{suffix ? ` ${suffix}` : ''}
    </span>
  );
}

/* ───────────────────────── AccentCard ─────────────────────────
   좌측 4px 컬러 띠를 가진 카드. 카테고리 색상으로 카드를 즉시 인식. */
export function AccentCard({
  tone,
  children,
  className,
  density = 'default',
}: {
  tone: 'blue' | 'emerald' | 'red' | 'violet' | 'amber' | 'cyan' | 'slate';
  children: ReactNode;
  className?: string;
  density?: 'default' | 'compact';
}) {
  const border = {
    blue: 'border-l-blue-500',
    emerald: 'border-l-emerald-500',
    red: 'border-l-red-500',
    violet: 'border-l-violet-500',
    amber: 'border-l-amber-500',
    cyan: 'border-l-cyan-500',
    slate: 'border-l-slate-400',
  }[tone];
  const pad = density === 'compact' ? 'p-4' : 'p-5 lg:p-6';
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 border-l-4 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]',
        border,
        pad,
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── MetricCard ───────────────────────── */
export function MetricCard({
  label,
  value,
  amount,
  tone = 'neutral',
  sub,
  Icon,
  className,
}: {
  label: string;
  /** 문자열 또는 숫자(amount) 둘 중 하나 사용 */
  value?: string;
  amount?: number;
  tone?: CurrencyTone;
  sub?: string;
  Icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-400" strokeWidth={2.2} />}
      </div>
      <div className="mt-1">
        {amount != null ? (
          <CurrencyText amount={amount} tone={tone} size="lg" />
        ) : (
          <p className={cn('rm-tnum text-[20px] font-bold lg:text-2xl', CURRENCY_COLOR[tone])}>
            {value ?? '-'}
          </p>
        )}
      </div>
      {sub && <p className="mt-1 truncate text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

/* ───────────────────────── IconBadge ─────────────────────────
   톤별 연한 배경 + 단색 아이콘. 카드 상단 또는 PageHeader 좌측 아이콘으로 사용. */
type IconTone = 'blue' | 'emerald' | 'red' | 'violet' | 'amber' | 'cyan' | 'slate';

const ICON_BADGE_TONE: Record<IconTone, string> = {
  blue:    'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red:     'bg-red-50 text-red-500',
  violet:  'bg-violet-50 text-violet-600',
  amber:   'bg-amber-50 text-amber-600',
  cyan:    'bg-cyan-50 text-cyan-600',
  slate:   'bg-slate-100 text-slate-600',
};

export function IconBadge({
  Icon,
  tone = 'blue',
  size = 'md',
  className,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: IconTone;
  /** sm: 36px / md: 44px / lg: 52px */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeCls = {
    sm: 'h-9 w-9 rounded-lg',
    md: 'h-11 w-11 rounded-xl',
    lg: 'h-[52px] w-[52px] rounded-2xl',
  }[size];
  const iconSize = { sm: 'h-[18px] w-[18px]', md: 'h-[22px] w-[22px]', lg: 'h-6 w-6' }[size];
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', sizeCls, ICON_BADGE_TONE[tone], className)}>
      <Icon className={iconSize} strokeWidth={2.2} />
    </span>
  );
}

/* ───────────────────────── ActionCard ─────────────────────────
   대시보드 "빠른 작업" 등 큰 터치 타겟의 링크 카드.
   아이콘 + 라벨(+ 선택적 description). 호버/탭 시 미세 압축. */
export function ActionCard({
  href,
  Icon,
  label,
  description,
  tone = 'blue',
  className,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  description?: string;
  tone?: IconTone;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex h-[96px] flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-3.5 transition',
        'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-4px_rgba(15,23,42,0.08)] active:translate-y-0 active:bg-slate-50',
        className,
      )}
    >
      <IconBadge Icon={Icon} tone={tone} size="sm" />
      <div className="min-w-0 w-full">
        <p className="truncate text-[14px] font-semibold text-slate-900">{label}</p>
        {description && (
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{description}</p>
        )}
      </div>
    </Link>
  );
}

/* ───────────────────────── AIInsightCard ─────────────────────────
   AI 영역 전용 다크 그라데이션 카드. 헤더 배지 + 본문 + 선택적 액션. */
export function AIInsightCard({
  title,
  children,
  action,
  className,
  badge = 'AI 인사이트',
}: {
  /** 카드 상단 제목 (없으면 헤더 영역 생략) */
  title?: string;
  children: ReactNode;
  /** 우측 상단 또는 하단 액션 영역 */
  action?: ReactNode;
  className?: string;
  /** 헤더 배지 텍스트. 기본 'AI 인사이트'. */
  badge?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[20px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] ring-1 ring-white/5 lg:rounded-[24px] lg:p-6',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide">
          <SparklesIcon className="h-3 w-3" strokeWidth={2.4} />
          {badge}
        </span>
        <span className="text-[11px] text-slate-400">리테일메이트 AI</span>
      </div>
      {title && <h3 className="mt-3 text-[16px] font-bold lg:text-[17px]">{title}</h3>}
      <div className="mt-2 text-[13px] leading-relaxed text-slate-200">{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </section>
  );
}

/* ───────────────────────── EmptyState ───────────────────────── */
export function EmptyState({
  Icon,
  title,
  description,
  action,
  className,
}: {
  Icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // 모바일 py-8, PC py-12 — 모바일 카드가 너무 길어 보이지 않도록.
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center lg:py-12',
        className,
      )}
    >
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
      )}
      <p className="text-[15px] font-medium text-slate-900">{title}</p>
      {description && (
        <p className="mt-1 text-[12px] text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ───────────────────────── 별칭(Aliases) ─────────────────────────
   사용자/디자인 표준 이름과 내부 구현 컴포넌트 매핑.
   기존 import (`AppCard`, `AppBadge` 등)는 그대로 두고, 새 코드는 별칭 이름을 사용해도 됨. */

/** AppCard 별칭 — 의미: "섹션 단위 카드" */
export { AppCard as SectionCard };

/** AppBadge 별칭 — 의미: "상태 표시 칩" */
export { AppBadge as StatusChip };

/** Button 재노출 + variant 고정 wrapper */
export { Button } from '@/components/ui/Button';
export function PrimaryButton(props: Omit<React.ComponentProps<typeof Button>, 'variant'>) {
  return <Button variant="primary" {...props} />;
}
export function SecondaryButton(props: Omit<React.ComponentProps<typeof Button>, 'variant'>) {
  return <Button variant="secondary" {...props} />;
}
export function GhostButton(props: Omit<React.ComponentProps<typeof Button>, 'variant'>) {
  return <Button variant="ghost" {...props} />;
}
export function DangerButton(props: Omit<React.ComponentProps<typeof Button>, 'variant'>) {
  return <Button variant="danger" {...props} />;
}
