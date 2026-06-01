import { Settings as SettingsIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { PageHeader } from '@/components/app';
import { SettingsClient } from './SettingsClient';

export const metadata = {
  title: '설정 · 리테일메이트',
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  const [{ data: store }, { data: profile }, { data: prefs }] = await Promise.all([
    supabase
      .from('stores')
      .select('*')
      .eq('id', adminStore.storeId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('name, email, phone, avatar_path')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('user_notification_prefs')
      .select('expense_alert, attendance_alert, notice_alert, important_alert, briefing_alert')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (!store || !profile) return null;

  // 아바타 public URL (avatars 버킷이 public이므로 publicUrl 사용)
  let avatarUrl: string | null = null;
  if (profile.avatar_path) {
    const admin = createAdminClient();
    const { data } = admin.storage.from('avatars').getPublicUrl(profile.avatar_path);
    avatarUrl = data?.publicUrl ?? null;
  }
  const profileWithUrl = {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    avatar_url: avatarUrl,
  };

  const defaultPrefs = {
    briefing_alert: true,
    expense_alert: true,
    attendance_alert: true,
    notice_alert: true,
    important_alert: true,
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          Icon={SettingsIcon}
          tone="slate"
          title="설정"
          description="매장 및 계정 정보를 관리하세요."
          className="mb-5"
        />

        <SettingsClient
          store={store}
          profile={profileWithUrl}
          prefs={prefs ?? defaultPrefs}
        />
      </div>
    </div>
  );
}
