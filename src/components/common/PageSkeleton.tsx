/**
 * 공통 페이지 진입 스켈레톤 — Next.js loading.tsx에서 사용.
 * 클릭 즉시 회색 카드들이 떠서 "버튼이 먹혔다"는 시그널을 즉시 준다.
 * 실제 SSR 데이터가 도착하면 자동으로 교체.
 *
 * variant:
 *   - 'default' : 헤더 + KPI 4 + 큰 카드 (홈/매출/비용/리포트)
 *   - 'list'    : 헤더 + KPI 4 + 리스트 (직원/근태/계약서/공지)
 *   - 'form'    : 헤더 + 폼 카드 (설정/계약서 새로 작성)
 */

interface Props {
  variant?: 'default' | 'list' | 'form';
}

export function PageSkeleton({ variant = 'default' }: Props) {
  return (
    <div className="rm-page px-4 py-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        {/* PageHeader */}
        <div className="flex items-center gap-3">
          <SkBox className="h-11 w-11 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkBox className="h-6 w-32 rounded" />
            <SkBox className="h-3.5 w-56 max-w-full rounded" />
          </div>
          <SkBox className="hidden h-9 w-24 rounded-lg sm:block" />
        </div>

        {/* KPI 4 */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rm-card-data flex h-[124px] flex-col gap-2 p-4">
              <SkBox className="h-3 w-16 rounded" />
              <SkBox className="h-7 w-24 rounded" />
              <SkBox className="mt-auto h-3 w-20 rounded" />
            </div>
          ))}
        </div>

        {variant === 'default' && (
          <>
            <div className="mt-5">
              <SkBox className="h-32 w-full rounded-2xl" />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SkBox className="h-48 w-full rounded-2xl" />
              <SkBox className="h-48 w-full rounded-2xl" />
            </div>
          </>
        )}

        {variant === 'list' && (
          <div className="mt-5 rounded-2xl border border-[#EAECF5] bg-white p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
                <SkBox className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <SkBox className="h-4 w-32 rounded" />
                  <SkBox className="h-3 w-48 rounded" />
                </div>
                <SkBox className="h-7 w-16 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {variant === 'form' && (
          <div className="mt-5 rounded-2xl border border-[#EAECF5] bg-white p-5 lg:p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-4 space-y-1.5">
                <SkBox className="h-3.5 w-20 rounded" />
                <SkBox className="h-11 w-full rounded-md" />
              </div>
            ))}
            <SkBox className="mt-2 h-11 w-32 rounded-md" />
          </div>
        )}
      </div>
    </div>
  );
}

function SkBox({ className }: { className: string }) {
  return <div className={`animate-pulse bg-slate-200/70 ${className}`} />;
}
