import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* 브랜드 진입 — radial gradient 배경 (body 위에 한 겹 더) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 20% 0%, rgba(37, 99, 235, 0.16), transparent 60%),' +
            'radial-gradient(50% 40% at 100% 30%, rgba(56, 189, 248, 0.15), transparent 60%),' +
            'radial-gradient(40% 40% at 50% 100%, rgba(139, 92, 246, 0.10), transparent 70%)',
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
