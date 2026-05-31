import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantCls: Record<Variant, string> = {
  primary:   'bg-[#7177EE] text-white hover:bg-[#5E64E6] active:bg-[#5E64E6] shadow-sm shadow-indigo-500/15 disabled:bg-[#C9CCF7] disabled:shadow-none',
  secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-700 shadow-sm shadow-red-600/10',
};

// 모바일 우선 — 터치 타겟 충분 + PC에서 살짝 작게
const sizeCls: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-lg',
  md: 'h-12 px-5 text-[15px] rounded-xl lg:h-11 lg:rounded-lg',
  lg: 'h-14 px-6 text-[16px] rounded-2xl lg:h-12 lg:rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';
