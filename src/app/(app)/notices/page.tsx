import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { getStoreNotices } from '@/lib/notices/queries';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/app';
import { EmptyMegaphone } from '@/components/app/EmptyIllustration';
import { DeleteNoticeButton } from './NoticeActions';

export const metadata = {
  title: '공지 · 리테일메이트',
};

const TARGET_LABEL: Record<string, string> = {
  all: '전체',
  employees: '직원만',
};

export default async function NoticesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  const notices = await getStoreNotices(supabase, adminStore.storeId);
  const isAdmin = adminStore.isAdmin;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          Icon={Megaphone}
          tone="cyan"
          title="공지"
          description="매장 공지사항을 작성하고 관리하세요."
          right={
            isAdmin && (
              <Link href="/notices/new">
                <Button size="sm">+ 공지 작성</Button>
              </Link>
            )
          }
          className="mb-5"
        />

        {notices.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <EmptyMegaphone className="text-slate-400" />
            <p className="mt-3 text-[15px] font-medium text-slate-900">아직 작성된 공지가 없습니다</p>
            <p className="mt-1 text-[12px] text-slate-500">매장 운영 안내·이벤트·휴무 정보를 직원에게 전달해보세요.</p>
            {isAdmin && (
              <Link href="/notices/new" className="mt-4 inline-block">
                <Button size="sm">+ 첫 공지 작성</Button>
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {notices.map((n) => {
              const isExpired = n.expires_at && new Date(n.expires_at) < new Date();
              return (
                <li
                  key={n.id}
                  className={
                    'rounded-xl border bg-white p-5 ' +
                    (n.is_pinned && !isExpired
                      ? 'border-indigo-300 ring-1 ring-indigo-100'
                      : 'border-slate-200')
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.is_pinned && (
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                            고정
                          </span>
                        )}
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                          {TARGET_LABEL[n.target]}
                        </span>
                        {isExpired && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                            만료됨
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1.5 text-base font-semibold text-slate-900">
                        {n.title}
                      </h2>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">
                        {n.body}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(n.published_at).toLocaleString('ko-KR')}
                        {n.expires_at && ` · 만료 ${new Date(n.expires_at).toLocaleDateString('ko-KR')}`}
                      </p>
                    </div>
                    {isAdmin && <DeleteNoticeButton id={n.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
