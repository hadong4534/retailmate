'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function MonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <input
      type="month"
      value={value}
      onChange={handleChange}
      className="h-10 rounded-md border border-[#E3E5F0] bg-white px-3 text-sm text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
    />
  );
}
