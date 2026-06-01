import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { PosterForm } from './PosterForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI 포스터·SNS · 리테일메이트',
};

export default async function PostersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  const { data: store } = await supabase
    .from('stores')
    .select('logo_path')
    .eq('id', adminStore.storeId)
    .maybeSingle();
  const hasLogo = !!store?.logo_path;

  // 최근 진행 중·완료 카운트 (메인 갤러리는 드라이브에서)
  const [{ count: pendingCount }, { count: doneCount }] = await Promise.all([
    supabase
      .from('ai_images')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', adminStore.storeId)
      .eq('status', 'pending'),
    supabase
      .from('ai_images')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', adminStore.storeId)
      .eq('status', 'done'),
  ]);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI 포스터·SNS</h1>
            <p className="mt-1 text-sm text-slate-500">
              매장 로고·소개를 자동 반영해 마케팅 디자인물을 만듭니다.
            </p>
          </div>
          <Link href="/ai" className="text-xs font-medium text-indigo-600 hover:underline">
            ← AI 도구
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <PosterForm hasLogo={hasLogo} />

          <aside className="space-y-3">
            <div className="rounded-2xl border border-[#EAECF5] bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">내 작업물</h3>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">진행 중</span>
                  <span className="font-mono text-sm font-bold text-indigo-600 tabular-nums">
                    {pendingCount ?? 0}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">완료</span>
                  <span className="font-mono text-sm font-bold text-emerald-600 tabular-nums">
                    {doneCount ?? 0}
                  </span>
                </div>
              </div>
              <Link
                href="/ai/drive"
                className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-md border border-[#EAECF5] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                AI 드라이브에서 보기 →
              </Link>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-relaxed text-indigo-900">
              <p className="font-semibold">알림 받기</p>
              <p className="mt-1">
                생성을 시작하면 다른 탭에 갔다 와도 <strong>화면 상단에 완료 알림</strong>이 표시됩니다. 매장 운영을 멈출 필요 없어요.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
