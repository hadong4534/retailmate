import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { todayInKST } from '@/lib/utils';
import { SparkleAvatar } from '@/components/ai/SparkleAvatar';
import { ChatClient } from './ChatClient';

export const metadata = {
  title: 'AI 챗봇 · 리테일메이트',
};

export default async function AIChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_path')
    .eq('id', user.id)
    .maybeSingle();

  const ownerName = profile?.name ?? user.email ?? '나';
  const ownerInitial = ownerName.charAt(0) || '나';

  let ownerAvatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const admin = createAdminClient();
    const { data } = admin.storage.from('avatars').getPublicUrl(profile.avatar_path);
    ownerAvatarUrl = data?.publicUrl ?? null;
  }

  // 데이터 상황별 추천 질문 — 매출/비용/직원 입력 여부로 동적 분기.
  // 직원 테이블 이름·필터는 dashboard/page.tsx의 패턴을 그대로 따름.
  const today = todayInKST();
  const monthStart = today.slice(0, 7) + '-01';
  const [{ count: salesCount }, { count: expensesCount }, { count: employeesCount }] = await Promise.all([
    supabase.from('sales').select('id', { count: 'exact', head: true }).eq('store_id', adminStore.storeId).gte('sale_date', monthStart),
    supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('store_id', adminStore.storeId).gte('expense_date', monthStart),
    supabase.from('store_members').select('id', { count: 'exact', head: true }).eq('store_id', adminStore.storeId).neq('role', 'owner').eq('is_active', true),
  ]);
  const suggestions = buildSuggestions({
    hasSales: (salesCount ?? 0) > 0,
    hasExpenses: (expensesCount ?? 0) > 0,
    hasEmployees: (employeesCount ?? 0) > 0,
  });

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* 헤더 — 모바일 h-12 / PC py-3. PWA 노치 회피 padding 추가. */}
      <header
        className="border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md lg:px-8"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 py-2.5 lg:py-3">
          <div className="flex min-w-0 items-center gap-2.5 lg:gap-3">
            <SparkleAvatar size={32} withGlow className="lg:hidden" />
            <SparkleAvatar size={36} withGlow className="hidden lg:inline-flex" />
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold text-slate-900 lg:text-lg">리테일메이트 AI</h1>
              <p className="truncate text-[11px] text-slate-500">{adminStore.storeName}</p>
            </div>
          </div>
          {/* 온라인 표시 — 작은 green pulse dot */}
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-700">온라인</span>
          </span>
        </div>
      </header>

      <ChatClient ownerInitial={ownerInitial} ownerAvatarUrl={ownerAvatarUrl} suggestions={suggestions} />
    </div>
  );
}

/** 매장 데이터 상황에 따른 추천 질문. 데이터가 부족한 영역은 일부러 빼서 빈 답 유도 방지. */
function buildSuggestions(state: { hasSales: boolean; hasExpenses: boolean; hasEmployees: boolean }): string[] {
  const out: string[] = [];
  // "오늘 해야 할 일"은 매장 상태와 무관하게 항상 첫 자리 — AI가 운영 비서처럼 느껴지도록.
  out.push('오늘 해야 할 일');
  if (state.hasSales) {
    out.push('이번 달 매출 요약', '결제수단별 매출 알려줘', '전월 대비 매출 변화');
  } else {
    out.push('매출을 어떻게 입력하나요?');
  }
  if (state.hasSales && state.hasExpenses) {
    out.push('이번 달 영업이익은?');
  }
  if (state.hasEmployees) {
    out.push('인건비 비중 분석');
  }
  if (state.hasSales) {
    out.push('최근 6개월 월별 추이');
  }
  return Array.from(new Set(out)).slice(0, 6);
}
