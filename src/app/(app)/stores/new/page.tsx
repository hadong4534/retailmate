import Link from 'next/link';
import { NewStoreForm } from './NewStoreForm';

export const metadata = {
  title: '새 매장 추가 · 리테일메이트',
};

export default function NewStorePage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700"
            aria-label="뒤로"
          >
            ←
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">새 매장 추가</h1>
        </div>
        <p className="mb-6 text-sm text-slate-500">
          여러 매장을 운영하시나요? 매장을 추가하면 사이드바 매장 선택자에서 즉시 전환할 수 있습니다.
        </p>
        <NewStoreForm />
      </div>
    </div>
  );
}
