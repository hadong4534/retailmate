import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/layout/AppShell';
import { NoticePopup } from '@/components/notices/NoticePopup';
import { AIToastWatcher } from '@/components/ai/AIToastWatcher';
import { Toaster } from '@/components/ui/Toaster';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { SessionGuard } from '@/components/auth/SessionGuard';
import { getCurrentAdminStore, getUserStoreContexts } from '@/lib/auth/store-context';
import { getUnreadNotices } from '@/lib/notices/queries';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // getUser()는 Auth 서버 왕복(수백ms). 미들웨어가 세션을 이미 검증·갱신하므로
  // 로컬 JWT 검증(getClaims)으로 충분 — 대시보드와 동일 패턴.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as { sub?: string; email?: string } | undefined;
  if (!claims?.sub) redirect('/login');
  const userId = claims.sub;

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

  const roleMap = new Map(allContexts.map((c) => [c.storeId, c.role]));
  const unread = await getUnreadNotices(supabase, userId, roleMap);

  const adminOptions = allContexts
    .filter((c) => c.isAdmin)
    .map((c) => ({ storeId: c.storeId, storeName: c.storeName, role: c.role }));

  return (
    <AppShell
      storeName={adminStore.storeName}
      ownerName={profile?.name ?? claims.email ?? ''}
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
      {unread.length > 0 && <NoticePopup notices={unread} />}
      <AIToastWatcher />
      <Toaster />
      <PullToRefresh />
      {children}
    </AppShell>
  );
}
