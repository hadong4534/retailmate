'use client';

import { cn, parseMoney } from '@/lib/utils';
import { ChangeEvent } from 'react';

interface Props {
  label?: string;
  icon?: string;
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  className?: string;
  size?: 'md' | 'lg';
  disabled?: boolean;
  name?: string;
}

export function MoneyInput({
  label,
  icon,
  value,
  onChange,
  placeholder = '0원',
  className,
  size = 'md',
  disabled,
  name,
}: Props) {
  // value가 0이면 input은 비워서 placeholder ("0원")가 자연스럽게 보이게 하고,
  // 사용자가 숫자를 입력하면 placeholder가 사라지면서 입력값(숫자만)이 표시됨.
  //
  // ⚠ "원" 표시 정책:
  //   - 별도의 absolute suffix 방식은 placeholder "0"과 위치가 겹쳐서 "0과 원이 겹쳐 보임" 버그가 있었음.
  //   - placeholder 자체에 "0원"을 포함시켜 단일 텍스트로 표시 — 겹침 자체를 없앤다.
  //   - 사용자 정책: 숫자 입력 시작하면 "원" 글자는 사라져야 함 → placeholder는 입력 시 자동 소멸이라 충족.
  const display = value === 0 ? '' : value.toLocaleString('ko-KR');

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(parseMoney(e.target.value));
  }

  return (
    <div className={className}>
      {label && (
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          {icon && <span>{icon}</span>}
          {label}
        </label>
      )}
      <div className="relative mt-1">
        <input
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-md border border-slate-300 text-right font-mono tabular-nums text-slate-900 placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50',
            size === 'lg' ? 'h-12 px-4 text-lg' : 'h-11 px-3 text-base',
          )}
        />
      </div>
    </div>
  );
}
