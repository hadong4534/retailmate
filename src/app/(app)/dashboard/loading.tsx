/**
 * /dashboard 진입 시 즉시 표시되는 스켈레톤.
 * 모바일에서 응답 지연으로 "Load failed" 처리되는 것을 방지.
 */
export default function DashboardLoading() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl animate-pulse">
        {/* 헤더 */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="h-3 w-32 rounded bg-slate-200" />
            <div className="mt-3 h-7 w-48 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-64 rounded bg-slate-200" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-20 rounded-full bg-slate-200" />
            <div className="h-7 w-24 rounded-full bg-slate-200" />
          </div>
        </div>

        {/* AI 인사이트 자리 */}
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 ring-1 ring-white/10">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="h-3 w-40 rounded bg-white/5" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="h-20 rounded-xl bg-white/5" />
            <div className="h-20 rounded-xl bg-white/5" />
          </div>
        </div>

        {/* KPI 5개 */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-[#EAECF5] bg-white p-5">
              <div className="h-3 w-12 rounded bg-slate-200" />
              <div className="mt-3 h-5 w-20 rounded bg-slate-200" />
              <div className="mt-2 h-2 w-16 rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* 운영 요약 + 차트 */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-48 rounded-xl border border-[#EAECF5] bg-white p-6 lg:col-span-2" />
          <div className="h-48 rounded-xl border border-[#EAECF5] bg-white p-6" />
        </div>

        {/* 빠른 작업 + 알림 */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-44 rounded-xl border border-[#EAECF5] bg-white p-6" />
          <div className="h-44 rounded-xl border border-[#EAECF5] bg-white p-6" />
        </div>

        {/* 안내 */}
        <p className="mt-6 text-center text-xs text-slate-400">
          매장 데이터를 불러오는 중…
        </p>
      </div>
    </div>
  );
}
