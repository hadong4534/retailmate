'use client';

import { cn } from '@/lib/utils';
import { ChangeEvent } from 'react';

interface Props {
  label?: string;
  value: string;
  onChange: (formatted: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  hint?: string;
}

export function formatKoreanPhone(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';

  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  const isMobile = /^01[016789]/.test(digits);
  const areaLen = isMobile ? 3 : 3;

  if (digits.length <= areaLen) return digits;
  if (digits.length <= 7) return `${digits.slice(0, areaLen)}-${digits.slice(areaLen)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, areaLen)}-${digits.slice(areaLen, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, areaLen)}-${digits.slice(areaLen, 7)}-${digits.slice(7, 11)}`;
}

export function PhoneInput({
  label,
  value,
  onChange,
  placeholder = '010-0000-0000',
  className,
  disabled,
  name,
  hint,
}: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(formatKoreanPhone(e.target.value));
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}
      <input
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        disabled={disabled}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={13}
        className={cn(
          'mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50',
        )}
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
