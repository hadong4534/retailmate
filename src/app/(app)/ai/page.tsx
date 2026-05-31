import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { SparkleAvatar } from '@/components/ai/SparkleAvatar';

export const metadata = {
  title: 'AI 도구 · 리테일메이트',
};

interface Tool {
  href: string;
  title: string;
  desc: string;
  badge: string;
  accent: 'blue' | 'violet' | 'pink' | 'emerald';
}

const TOOLS: Tool[] = [
  {
    href: '/ai/chat',
    title: 'AI 챗봇',
    desc: '매출·비용·근태를 자연어로 물어보세요. 실시간 매장 분석.',
    badge: '대화',
    accent: 'blue',
  },
  {
    href: '/ai/posters',
    title: 'AI 포스터·SNS',
    desc: '매장 로고·소개를 반영한 마케팅 디자인을 자동 생성합니다.',
    badge: '브랜드',
    accent: 'violet',
  },
  {
    href: '/ai/drive',
    title: 'AI 드라이브',
    desc: 'AI로 만든 모든 작업물을 한곳에 보관·다운로드·삭제할 수 있어요.',
    badge: '저장',
    accent: 'emerald',
  },
  {
    href: '/ai/brand',
    title: '매장 브랜드',
    desc: '로고와 매장 소개를 등록하면 디자인 생성에 자동 반영됩니다.',
    badge: '설정',
    accent: 'pink',
  },
];

const ACCENT: Record<Tool['accent'], { ring: string; bg: string; text: string }> = {
  blue:    { ring: 'group-hover:ring-indigo-300',    bg: 'bg-indigo-50',    text: 'text-indigo-700' },
  violet:  { ring: 'group-hover:ring-violet-300',  bg: 'bg-violet-50',  text: 'text-violet-700' },
  pink:    { ring: 'group-hover:ring-pink-300',    bg: 'bg-pink-50',    text: 'text-pink-700' },
  emerald: { ring: 'group-hover:ring-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export default async function AIHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  // 최근 작업물 통계
  const [{ count: totalImages }, { data: latest }, { data: store }] = await Promise.all([
    supabase
      .from('ai_images')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', adminStore.storeId)
      .eq('status', 'done'),
    supabase
      .from('ai_images')
      .select('id, kind, created_at, status')
      .eq('store_id', adminStore.storeId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('stores')
      .select('logo_path, brand_description')
      .eq('id', adminStore.storeId)
      .maybeSingle(),
  ]);

  const hasBrand = !!(store?.logo_path || store?.brand_description);
  const lastImageAt = latest?.[0]?.created_at;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <div className="mb-8 flex items-center gap-4">
          <SparkleAvatar size={48} withGlow />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 lg:text-3xl">AI 도구</h1>
            <p className="mt-1 text-sm text-slate-500">
              매장에 맞춘 챗봇·디자인·드라이브를 한 곳에서 사용하세요.
            </p>
          </div>
        </div>

        {/* 빠른 통계 */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="저장된 작업물" value={`${totalImages ?? 0}개`} />
          <Stat label="브랜드 등록" value={hasBrand ? '완료' : '미완료'} tone={hasBrand ? 'positive' : 'warning'} />
          <Stat
            label="최근 생성"
            value={lastImageAt ? formatRelative(lastImageAt) : '없음'}
          />
        </div>

        {/* 도구 카드 4개 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOOLS.map((t) => {
            const c = ACCENT[t.accent];
            return (
              <Link
                key={t.href}
                href={t.href}
                className={
                  'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 ring-1 ring-transparent transition hover:shadow-md ' +
                  c.ring
                }
              >
                <div className="absolute right-4 top-4">
                  <span className={`rounded-full ${c.bg} ${c.text} px-2 py-0.5 text-[10px] font-semibold`}>
                    {t.badge}
                  </span>
                </div>
                <SparkleAvatar size={36} className={c.text} />
                <h2 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-indigo-700">
                  {t.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">{t.desc}</p>
                <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                  열기
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12 H19 M12 5 L19 12 L12 19" />
                  </svg>
                </p>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-400">
          리테일메이트 AI
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'warning';
}) {
  const cls =
    tone === 'positive' ? 'text-emerald-600'
    : tone === 'warning' ? 'text-amber-600'
    : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}
