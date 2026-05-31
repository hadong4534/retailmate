import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { NoticeForm } from './NoticeForm';

export const metadata = {
  title: '공지 작성 · 리테일메이트',
};

export default async function NewNoticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore || !adminStore.isAdmin) {
    redirect('/notices');
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/notices"
            className="text-sm text-slate-500 hover:text-slate-700"
            aria-label="뒤로"
          >
            ←
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">공지 작성</h1>
        </div>
        <NoticeForm />
      </div>
    </div>
  );
}
