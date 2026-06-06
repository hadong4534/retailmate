import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/layout/AppShell';
import { NoticePopup } from '@/components/notices/NoticePopup';
import { AIToastWatcher } from '@/components/ai/AIToastWatcher';
import { Toaster } from '@/components/ui/Toaster';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { SessionGuard } from '@/components/auth/SessionGuard';
import { getCurrentAdminStore, getUserStoreContexts, type StoreRole } from '@/lib/auth/store-context';
import { getUnreadNotices } from '@/lib/notices/queries';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // 주의: 이 getUser()가 앱 전체의 유일한 서버측 토큰 검증·갱신 지점이다 (middleware 없음).
  // getClaims()로 바꾸면 만료 토큰이 갱신되지 않아 세션이 끊긴다 — 반드시 getUser() 유지.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const userId = user.id;

  // 프로필과 매장 컨텍스트는 서로 독립 → 병렬 조회로 SSR 시간 단축
  const [{ data: profile }, allContexts] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, avatar_path')
      .eq('id', userId)
      .single(),
    getUserStoreContexts(supabase, userId),
  ]);

  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const admin = createAdminClient();
    const { data } = admin.storage.from('avatars').getPublicUrl(profile.avatar_path);
    avatarUrl = data?.publicUrl ?? null;
  }

  const adminStore = await getCurrentAdminStore(supabase, userId);

  if (!adminStore) {
    if (allContexts.length > 0) {
      redirect('/employee/me');
    }
    redirect('/onboarding/store');
  }

  const roleEntries: [string, StoreRole][] = allContexts.map((c) => [c.storeId, c.role]);

  const adminOptions = allContexts
    .filter((c) => c.isAdmin)
    .map((c) => ({ storeId: c.storeId, storeName: c.storeName, role: c.role }));

  return (
    <AppShell
      storeName={adminStore.storeName}
      ownerName={profile?.name ?? user.email ?? ''}
      ownerAvatarUrl={avatarUrl}
      role={adminStore.role}
      currentStore={{
        storeId: adminStore.storeId,
        storeName: adminStore.storeName,
        role: adminStore.role,
      }}
      storeOptions={adminOptions}
    >
      <SessionGuard />
      {/* 공지 조회는 페이지 렌더를 막지 않도록 Suspense로 스트리밍 (SSR 1~2왕복 절감) */}
      <Suspense fallback={null}>
        <UnreadNotices userId={userId} roleEntries={roleEntries} />
      </Suspense>
      <AIToastWatcher />
      <Toaster />
      <PullToRefresh />
      {children}
    </AppShell>
  );
}

/** 미확인 공지 팝업 — 비차단 스트리밍용 서버 컴포넌트. */
async function UnreadNotices({
  userId,
  roleEntries,
}: {
  userId: string;
  roleEntries: [string, StoreRole][];
}) {
  const supabase = await createClient();
  const unread = await getUnreadNotices(supabase, userId, new Map(roleEntries));
  if (unread.length === 0) return null;
  return <NoticePopup notices={unread} />;
}
