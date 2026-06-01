import Link from 'next/link';
import { Logo, RetailMateLogoIcon } from '@/components/ui/Logo';

/**
 * 인증 레이아웃 (로그인·회원가입 공통).
 * - PC(lg+): 좌측 = "AI가 매장 구조를 설계하는" Aurora 브랜드 패널(영상/이미지) + 우측 = 폼.
 * - 모바일: 상단 로고 헤더 + 중앙 폼. (브랜드 패널 숨김)
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full">
      {/* Aurora 배경 — 폼 영역/모바일 공통 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 45% at 18% 0%, rgba(129,140,248,0.18), transparent 60%),' +
            'radial-gradient(50% 40% at 100% 25%, rgba(127,184,238,0.16), transparent 60%),' +
            'radial-gradient(45% 40% at 50% 100%, rgba(243,200,230,0.14), transparent 70%),' +
            'linear-gradient(135deg,#F6F5FE 0%,#EEF1FB 60%,#F2ECFA 100%)',
        }}
      />

      {/* ── 좌측 브랜드 패널 (lg+) ── */}
      <aside className="relative hidden w-1/2 overflow-hidden lg:flex xl:w-[55%]">
        {/* AI가 매장을 설계하는 비주얼 — 영상(있으면) / 이미지 포스터(폴백) */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/login-hero.jpg"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/login-hero.mp4" type="video/mp4" />
        </video>
        {/* 가독성 스크림 */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(43,40,86,0.42) 0%, rgba(43,40,86,0.05) 26%, rgba(43,40,86,0.12) 46%, rgba(43,40,86,0.88) 100%)',
          }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-10 text-white xl:p-12">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5" aria-label="리테일메이트 홈">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <RetailMateLogoIcon className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">리테일메이트</span>
          </Link>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-semibold ring-1 ring-white/25 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> AI 매장 운영 비서
            </span>
            <h2
              className="mt-5 text-[32px] font-extrabold leading-[1.28] tracking-tight xl:text-[36px]"
              style={{ wordBreak: 'keep-all' }}
            >
              사장님은 숫자만 입력하세요.
              <br />
              정리는 <span className="text-[#C7CBFF]">AI</span>가 합니다.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
              매출·비용·직원·근태·계약까지 한 곳에서. AI가 매장의 흐름을 읽고 다음 할 일을 정리해드려요.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {['매출·비용 자동정리', '근로계약·전자서명', 'GPS 출퇴근', 'AI 인사이트'].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/12 px-3 py-1.5 text-[12.5px] font-medium text-white/90 ring-1 ring-white/20 backdrop-blur"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── 우측 폼 영역 ── */}
      <div className="flex flex-1 flex-col">
        <header
          className="border-b border-white/40 bg-white/50 backdrop-blur-md lg:hidden"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
            <Link href="/" aria-label="리테일메이트 홈">
              <Logo size="md" />
            </Link>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-10 lg:py-16">
          <div className="w-full max-w-[440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
