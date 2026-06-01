'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

function shiftMonth(value: string, delta: number): string {
  const [y, m] = value.split('-').map(Number);
  const d = new Date(y, (m - 1) + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(month: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', month);
    return `${pathname}?${params.toString()}`;
  }

  const arrowCls =
    'flex h-10 w-9 items-center justify-center rounded-md border border-[#E3E5F0] bg-white text-slate-500 transition hover:bg-[#EEF0FE] hover:text-[#5961E6] active:scale-95';

  return (
    <div className="inline-flex items-center gap-1">
      <Link href={hrefFor(shiftMonth(value, -1))} prefetch={false} aria-label="이전 달" className={arrowCls}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </Link>
      <input
        type="month"
        value={value}
        onChange={(e) => {
          router.push(hrefFor(e.target.value));
          router.refresh();
        }}
        className="h-10 rounded-md border border-[#E3E5F0] bg-white px-3 text-sm text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
      />
      <Link href={hrefFor(shiftMonth(value, 1))} prefetch={false} aria-label="다음 달" className={arrowCls}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </Link>
    </div>
  );
}
