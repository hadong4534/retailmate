import Link from 'next/link';

export function EditDayLink({ date }: { date: string }) {
  return (
    <Link
      href={`/sales/edit/${date}`}
      className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
      aria-label={`${date} 매출 수정`}
    >
      수정
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}
