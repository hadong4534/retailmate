import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

/**
 * 인증 레이아웃 (로그인·회원가입) — 깔끔한 중앙 카드형.
 * 브랜드 영상/비주얼은 로그인 전 홈(랜딩)에서 보여주고, 로그인은 단순·집중 UI로 유지.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Aurora 배경 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 45% at 18% 0%, rgba(129,140,248,0.18), transparent 60%),' +
            'radial-gradient(50% 40% at 100% 25%, rgba(127,184,238,0.16), transparent 60%),' +
            'radial-gradient(45% 40% at 50% 100%, rgba(243,200,230,0.14), transparent 70%),' +
            'linear-gradient(135deg,#F6F5FE 0%,#EEF1FB 60%,#F2ECFA 100%)',
        }}
      />
      <header
        className="border-b border-white/40 bg-white/50 backdrop-blur-md"
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
  );
}
