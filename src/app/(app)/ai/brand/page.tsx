import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { createAdminClient } from '@/lib/supabase/admin';
import { BrandClient } from './BrandClient';

export const metadata = {
  title: '매장 브랜드 · 리테일메이트',
};

export default async function BrandSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  const { data: store } = await supabase
    .from('stores')
    .select('name, industry, logo_path, brand_color, brand_slogan, brand_description')
    .eq('id', adminStore.storeId)
    .maybeSingle();
  if (!store) return null;

  // 로고 signed URL 1시간
  let logoUrl: string | null = null;
  if (store.logo_path) {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from('ai-images')
      .createSignedUrl(store.logo_path, 60 * 60);
    logoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">매장 브랜드</h1>
          <p className="mt-1 text-sm text-slate-500">
            로고·슬로건·소개를 등록하면 AI 포스터·SNS·카드뉴스가 매장 톤에 맞춰 자동 생성됩니다.
          </p>
        </div>

        <BrandClient
          initial={{
            brand_color: store.brand_color ?? '#7177EE',
            brand_slogan: store.brand_slogan ?? '',
            brand_description: store.brand_description ?? '',
            logoUrl,
            storeName: store.name,
            industry: store.industry,
          }}
        />
      </div>
    </div>
  );
}
