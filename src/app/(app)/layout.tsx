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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar_path')
    .eq('id', user.id)
    .single();

  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const admin = createAdminClient();
    const { data } = admin.storage.from('avatars').getPublicUrl(profile.avatar_path);
    avatarUrl = data?.publicUrl ?? null;
  }

  const allContexts = await getUserStoreContexts(supabase, user.id);
  const adminStore = await getCurrentAdminStore(supabase, user.id);

  if (!adminStore) {
    if (allContexts.length > 0) {
      redirect('/employee/me');
    }
    redirect('/onboarding/store');
  }

  const roleMap = new Map(allContexts.map((c) => [c.storeId, c.role]));
  const unread = await getUnreadNotices(supabase, user.id, roleMap);

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
      {unread.length > 0 && <NoticePopup notices={unread} />}
      <AIToastWatcher />
      <Toaster />
      <PullToRefresh />
      {children}
    </AppShell>
  );
}
