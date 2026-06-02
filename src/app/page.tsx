import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { SplashScreen } from '@/components/common/SplashScreen';
import { BarChart3, FileText, MapPin, Sparkles, Check } from 'lucide-react';

/**
 * 로그인 전 홈(랜딩) — 단순·고급. 브랜드 영상 히어로.
 * 포지셔닝: "POS·연동 없이 수기 입력만으로, 나머지는 AI가 완벽 관리".
 * (포스/토스류 앱과 차별화 — 수기입력 + 완벽한 AI 관리 플랫폼)
 */
export default function LandingPage() {
  return (
    <>
      <SplashScreen />
      <div
        className="relative flex min-h-screen flex-col overflow-hidden"
        style={{
          background:
            'radial-gradient(55% 45% at 12% 2%, rgba(129,140,248,0.16), transparent 60%),' +
            'radial-gradient(50% 45% at 100% 18%, rgba(127,184,238,0.16), transparent 60%),' +
            'radial-gradient(45% 40% at 60% 100%, rgba(243,200,230,0.12), transparent 70%),' +
            'linear-gradient(160deg,#F8F7FE 0%,#EFF1FB 55%,#F3ECFA 100%)',
        }}
      >
        {/* 헤더 */}
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/55 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:h-16 md:px-8">
            <Logo size="sm" className="md:hidden" />
            <Logo size="md" className="hidden md:inline-flex" />
            <div className="flex items-center gap-2">
              <Link href="/signup" className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white/70 md:block">회원가입</Link>
              <Link href="/login" className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5458E6]">로그인</Link>
            </div>
          </div>
        </header>

        {/* HERO — 풀블리드 영상 배경 위에 헤드라인 오버레이 (빌딩 잘 된 앱 느낌) */}
        <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-10">
          <div className="relative overflow-hidden rounded-[28px] shadow-[0_30px_90px_-32px_rgba(99,102,241,0.5)] ring-1 ring-white/50">
            {/* 배경 영상 */}
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/home-hero.jpg"
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src="/home-hero.mp4" type="video/mp4" />
            </video>
            {/* 가독성 스크림 — 영상이 밝아도 흰 글자가 또렷하게 보이도록 하단·좌측 그라데이션 */}
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(22,19,48,0.10) 0%, rgba(22,19,48,0.34) 46%, rgba(22,19,48,0.80) 100%)' }} />
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(22,19,48,0.46) 0%, rgba(22,19,48,0.10) 55%, transparent 100%)' }} />
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/40" />

            {/* 콘텐츠 */}
            <div className="relative flex min-h-[80vh] flex-col justify-end p-6 sm:min-h-[68vh] sm:p-10 lg:min-h-[564px] lg:p-14">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[12.5px] font-semibold text-white backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> POS·연동 없이 완벽한 매장 관리
              </span>
              <h1 className="mt-4 max-w-2xl text-[30px] font-extrabold leading-[1.18] tracking-tight text-white sm:text-[40px] lg:text-[52px]" style={{ wordBreak: 'keep-all', textShadow: '0 2px 18px rgba(10,8,30,0.45)' }}>
                사장님은 <span className="text-[#C7C9F7]">숫자만</span> 입력하세요.
                <br />
                정리는{' '}
                <span className="bg-gradient-to-r from-[#C7C9F7] to-[#BBE4FA] bg-clip-text text-transparent">AI</span>가 합니다.
              </h1>
              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-white/85 sm:text-[16px]" style={{ textShadow: '0 1px 12px rgba(10,8,30,0.5)' }}>
                포스기도, 복잡한 연동도 필요 없어요. 수기 입력만으로 매출·지출·직원·근태·계약이 자동 정리되고,
                AI가 매장 흐름을 읽어 다음 할 일까지 알려드립니다.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-[15px] font-semibold text-[#5458E6] shadow-lg shadow-indigo-950/20 transition active:scale-[0.98] hover:bg-white/90">
                  로그인
                </Link>
                <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/40 bg-white/15 px-6 text-[15px] font-semibold text-white backdrop-blur-md transition active:scale-[0.98] hover:bg-white/25">
                  무료로 시작하기
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-white/85">
                <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-[#BBE4FA]" strokeWidth={2.6} /> 회원가입 무료</span>
                <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-[#BBE4FA]" strokeWidth={2.6} /> 카드 등록 없이 시작</span>
                <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-[#BBE4FA]" strokeWidth={2.6} /> 3분 만에 시작</span>
              </div>
            </div>
          </div>
        </section>

        {/* 기능 스트립 (단순 4) */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-14">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <Feature Icon={BarChart3} title="매출·지출" desc="수기 입력만으로 손익 자동 계산" />
            <Feature Icon={FileText} title="근로계약·전자서명" desc="표준 양식 + 모바일 서명 + PDF" />
            <Feature Icon={MapPin} title="GPS 출퇴근" desc="매장 반경 인증 · 근태 자동 집계" />
            <Feature Icon={Sparkles} title="AI 인사이트·챗봇" desc="흐름 분석 + 다음 할 일 제안" />
          </div>
        </section>

        {/* 푸터 */}
        <footer className="border-t border-white/50 bg-white/40 px-6 py-7 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Logo size="md" />
            <p className="text-[12.5px] text-slate-500">POS 없이, 수기 입력으로 완벽하게. 매장의 모든 것을 AI가 정리합니다.</p>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex items-center gap-3 text-[12px] font-medium text-slate-500">
                <Link href="/privacy" className="hover:text-[#6366F1]">개인정보처리방침</Link>
                <span className="text-slate-300">·</span>
                <Link href="/terms" className="hover:text-[#6366F1]">이용약관</Link>
              </div>
              <p className="text-[11px] text-slate-400">© 2026 리테일메이트</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function Feature({ Icon, title, desc }: { Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur transition hover:bg-white/90 lg:p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FE] text-[#6366F1]">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <h3 className="mt-3 text-[14.5px] font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{desc}</p>
    </div>
  );
}
