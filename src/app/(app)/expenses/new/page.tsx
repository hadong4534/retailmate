import Link from 'next/link';
import { ExpenseNewForm } from './ExpenseNewForm';
import { todayInKST } from '@/lib/utils';

export const metadata = {
  title: '지출 입력 · 리테일메이트',
};

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const defaultDate = date ?? todayInKST();

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/expenses"
            className="text-sm text-slate-500 hover:text-slate-700"
            aria-label="뒤로"
          >
            ←
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">지출 입력</h1>
        </div>

        <ExpenseNewForm defaultDate={defaultDate} />
      </div>
    </div>
  );
}
