import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { EmptyGallery } from '@/components/app/EmptyIllustration';
import { DriveCard } from './DriveCard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI 드라이브 · 리테일메이트',
};

interface ImageRow {
  id: string;
  kind: string;
  user_prompt: string;
  image_path: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  poster: '포스터',
  sns: 'SNS',
  card_news: '정사각형',
  free: '자유',
};

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'poster', label: '포스터' },
  { key: 'sns', label: 'SNS' },
  { key: 'card_news', label: '정사각형' },
  { key: 'free', label: '자유' },
];

export default async function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const filter = kind && FILTERS.some((f) => f.key === kind) ? kind : 'all';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  let q = supabase
    .from('ai_images')
    .select('id, kind, user_prompt, image_path, status, error_message, created_at')
    .eq('store_id', adminStore.storeId)
    .order('created_at', { ascending: false })
    .limit(60);

  if (filter !== 'all') {
    q = q.eq('kind', filter);
  }

  const { data: imagesData } = await q;
  const images = (imagesData ?? []) as ImageRow[];

  // Signed URL 일괄 생성
  const admin = createAdminClient();
  const signedMap = new Map<string, string>();
  await Promise.all(
    images
      .filter((im) => im.image_path)
      .map(async (im) => {
        const { data } = await admin.storage
          .from('ai-images')
          .createSignedUrl(im.image_path!, 60 * 60);
        if (data?.signedUrl) signedMap.set(im.id, data.signedUrl);
      }),
  );

  // 통계
  const totalDone = images.filter((im) => im.status === 'done').length;
  const totalPending = images.filter((im) => im.status === 'pending').length;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI 드라이브</h1>
            <p className="mt-1 text-sm text-slate-500">
              AI로 생성한 모든 이미지가 여기 저장됩니다.
            </p>
          </div>
          <Link href="/ai" className="text-xs font-medium text-indigo-600 hover:underline">
            ← AI 도구
          </Link>
        </div>

        {/* 통계 */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="저장된 이미지" value={`${totalDone}개`} />
          <Stat label="진행 중" value={`${totalPending}개`} />
          <Stat label="필터" value={FILTERS.find((f) => f.key === filter)?.label ?? '전체'} />
        </div>

        {/* 필터 탭 */}
        <div className="mb-4 inline-flex rounded-xl border border-[#EAECF5] bg-white p-1">
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Link
                key={f.key}
                href={f.key === 'all' ? '/ai/drive' : `/ai/drive?kind=${f.key}`}
                className={
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
                  (active
                    ? 'bg-[#7177EE] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100')
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E3E5F0] bg-white px-6 py-10 text-center">
            <EmptyGallery className="text-slate-400" />
            <p className="mt-3 text-[15px] font-medium text-slate-700">
              아직 저장된 작업물이 없습니다
            </p>
            <p className="mt-1 text-xs text-slate-400">
              포스터·SNS·카드뉴스를 만들면 여기에 자동 보관돼요.
            </p>
            <Link
              href="/ai/posters"
              className="mt-4 rounded-md bg-[#7177EE] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5E64E6]"
            >
              + 첫 디자인 만들기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((im) => (
              <DriveCard
                key={im.id}
                id={im.id}
                kindLabel={KIND_LABEL[im.kind] ?? im.kind}
                prompt={im.user_prompt}
                status={im.status}
                errorMessage={im.error_message}
                signedUrl={signedMap.get(im.id) ?? null}
                createdAt={im.created_at}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#EAECF5] bg-white px-4 py-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}
