import Link from 'next/link';
import { Logo, RetailMateLogoIcon } from '@/components/ui/Logo';
import { SplashScreen } from '@/components/common/SplashScreen';

export default function LandingPage() {
  return (
    <>
      <SplashScreen />
      <div className="flex flex-1 flex-col bg-white">
        {/* ── 상단 헤더 (높이 mobile 56px / PC 64px) — PWA 노치 회피 padding ─── */}
        <header
          className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:h-16 md:px-8">
            <Logo size="sm" className="md:hidden" />
            <Logo size="md" className="hidden md:inline-flex" />
            <nav className="hidden items-center gap-7 text-sm font-medium text-slate-700 md:flex">
              <a href="#features" className="hover:text-blue-600">기능</a>
              <a href="#preview" className="hover:text-blue-600">미리보기</a>
              <a href="#trust" className="hover:text-blue-600">신뢰</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href="/signup"
                className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 md:block"
              >
                회원가입
              </Link>
              <Link
                href="/login"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                로그인
              </Link>
            </div>
          </div>
        </header>

        {/* ── HERO ─ 모바일/PC 분기 ──────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-0"
            aria-hidden
            style={{
              background:
                'radial-gradient(circle at 8% 12%, rgba(59,130,246,0.08) 0%, transparent 40%),' +
                'radial-gradient(circle at 92% 88%, rgba(56,189,248,0.08) 0%, transparent 40%)',
            }}
          />

          {/* ── 모바일 전용 hero ────────────────────── */}
          <div className="relative mx-auto max-w-[420px] px-6 pb-8 pt-10 md:hidden">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-700 ring-1 ring-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              매장 운영을 더 똑똑하게
            </span>

            <h1
              className="mt-5 text-[36px] font-extrabold tracking-tight text-slate-900"
              style={{ lineHeight: 1.18, wordBreak: 'keep-all' }}
            >
              사장님은 <span className="text-blue-600">숫자만</span> 입력하세요.
              <br />
              정리는 <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">AI</span>가 합니다.
            </h1>

            <p className="mt-4 text-[15px] leading-7 text-slate-500">
              매출·비용·직원·근태를 한 곳에서 관리하세요.
            </p>

            <div className="mt-7 flex flex-col gap-3">
              <Link
                href="/login"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-blue-600 px-6 text-[17px] font-semibold text-white shadow-lg shadow-blue-600/20 transition active:scale-[0.98] hover:bg-blue-700"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-[17px] font-semibold text-slate-700 transition active:scale-[0.98] hover:bg-slate-50"
              >
                무료로 시작하기 (회원가입)
              </Link>
              <a
                href="#features"
                className="-mb-1 mt-1 text-center text-[13px] font-medium text-slate-500 underline-offset-4 hover:underline"
              >
                기능 둘러보기 ↓
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-1.5">
              <Chip label="회원가입 무료" />
              <Chip label="카드 등록 없이 시작" />
              <Chip label="3분 만에 시작" />
            </div>

            {/* 미니 미리보기 카드 */}
            <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-900">오늘의 요약</p>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">5월 11일</span>
              </div>
              <div className="mt-3 space-y-2">
                <Row label="매출" value="2,458만 원" tone="blue" />
                <Row label="비용" value="843만 원" tone="red" />
                <Row label="순이익" value="1,615만 원" tone="emerald" />
              </div>
              <div className="mt-3">
                <MiniLine />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">전월 대비 +18.7% · AI 인사이트 자동 분석</p>
            </div>
          </div>

          {/* ── PC 전용 hero (md 이상) ──────────────── */}
          <div className="relative mx-auto hidden max-w-7xl grid-cols-[1.05fr_1fr] gap-12 px-8 py-20 md:grid">
            <div className="flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                매장 운영을 더 똑똑하게
              </span>

              <h1
                className="mt-5 text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl xl:text-[3.2rem]"
                style={{ lineHeight: 1.18, wordBreak: 'keep-all' }}
              >
                사장님은 <span className="text-blue-600">숫자만</span> 입력하세요.
                <br />
                정리는{' '}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  리테일메이트 AI
                </span>
                가 합니다.
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-slate-500">
                매출·비용·직원·근태를 한 곳에서 관리하세요.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  무료로 시작하기 (회원가입)
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-lg px-3 py-3.5 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  기능 둘러보기 →
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-2 text-[11px] text-slate-500">
                <Chip label="회원가입 무료" />
                <Chip label="카드 등록 없이 시작" />
                <Chip label="3분 만에 시작" />
              </div>
            </div>

            <div id="preview" className="relative">
              <DashboardPreview />
            </div>
          </div>

          {/* 안전성 라인 (PC 전용 강조) */}
          <div className="hidden border-t border-slate-100 bg-white/60 py-3 md:block">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-8 text-[12px] text-slate-500">
              <SafetyDot /> <span>안전한 데이터 보호</span>
              <SafetyDot /> <span>금융권 수준 보안</span>
              <SafetyDot /> <span>매일 자동 백업</span>
            </div>
          </div>
        </section>

        {/* ── 기능 카드 (모바일 1열, PC 4열) ──────────── */}
        <section id="features" className="bg-slate-50/60 px-4 py-12 md:px-8 md:py-20">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-[20px] font-bold text-slate-900 md:hidden">
              핵심 기능
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-0 md:grid-cols-4 md:gap-5">
              <FeatureCard
                accent="blue"
                icon={<BarsIcon className="h-6 w-6" />}
                title="매출/비용 관리"
                desc="채널별로 입력만 하면 손익 자동 계산"
                bullets={['결제수단 6종 지원', '월·일 그래프 자동']}
              />
              <FeatureCard
                accent="emerald"
                icon={<DocumentIcon className="h-6 w-6" />}
                title="근로계약서"
                desc="표준 양식 + 모바일 전자서명 + PDF 보관"
                bullets={['전자서명 지원', '계약 자동 알림']}
              />
              <FeatureCard
                accent="violet"
                icon={<PinIcon className="h-6 w-6" />}
                title="GPS 출퇴근"
                desc="매장 반경 안에서만 체크인, 자동 집계"
                bullets={['위치 기반 출퇴근', '근태 리포트 자동']}
              />
              <FeatureCard
                accent="cyan"
                icon={<SparkleIcon className="h-6 w-6" />}
                title="AI 인사이트"
                desc="매출·비용·손익을 AI가 자동 분석"
                bullets={['맞춤형 경영 리포트', '개선 제안 자동']}
              />
            </div>
          </div>
        </section>

        {/* ── 신뢰 라인 ──────────────────── */}
        <section id="trust" className="bg-white px-4 py-12 md:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-center text-sm text-slate-500">
              자영업자를 위한 올인원 플랫폼
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat icon={<HeartIcon className="h-5 w-5" />} value="안전" label="금융권 수준 보안" />
              <Stat icon={<ClockIcon className="h-5 w-5" />} value="자동" label="매일 자동 백업" />
              <Stat icon={<UserIcon className="h-5 w-5" />} value="간편" label="3분 만에 사용 시작" />
            </div>
          </div>
        </section>

        {/* ── 푸터 ─ 가벼운 라이트 톤 ───────────────── */}
        <footer className="border-t border-slate-200 bg-slate-50/60 px-4 py-8 text-slate-600 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Logo size="md" />
              <p className="mt-1 text-xs text-slate-500">
                사장님의 시간을 아껴, 매장의 성장을 돕습니다.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <a href="#" className="hover:text-blue-600">회사소개</a>
              <a href="#" className="hover:text-blue-600">이용약관</a>
              <a href="#" className="hover:text-blue-600">개인정보처리방침</a>
              <a href="#" className="hover:text-blue-600">문의하기</a>
            </nav>
            <p className="text-[11px] text-slate-400">
              © 2026 리테일메이트. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ───────────────────── 보조 컴포넌트 ───────────────────── */

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[13px] font-medium text-slate-600 md:text-[11px]">
      {label}
    </span>
  );
}

function SafetyDot() {
  return <span className="h-1 w-1 rounded-full bg-blue-500/80" aria-hidden />;
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'red' | 'emerald';
}) {
  const cls = { blue: 'text-blue-600', red: 'text-red-500', emerald: 'text-emerald-600' }[tone];
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className={`text-[14px] font-bold tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}

function MiniLine() {
  return (
    <svg viewBox="0 0 200 50" className="h-12 w-full" aria-hidden>
      <defs>
        <linearGradient id="rmFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 38 L20 33 L40 35 L60 27 L80 30 L100 22 L120 24 L140 16 L160 20 L180 12 L200 6 L200 50 L0 50 Z"
        fill="url(#rmFill)"
      />
      <path
        d="M0 38 L20 33 L40 35 L60 27 L80 30 L100 22 L120 24 L140 16 L160 20 L180 12 L200 6"
        fill="none"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div className="text-left">
        <p className="text-lg font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  accent,
  icon,
  title,
  desc,
  bullets,
}: {
  accent: 'blue' | 'emerald' | 'violet' | 'cyan';
  icon: React.ReactNode;
  title: string;
  desc: string;
  bullets: string[];
}) {
  const tone = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
    cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600' },
  }[accent];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md md:p-6">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone.bg} ${tone.text} md:h-12 md:w-12`}>
        {icon}
      </div>
      <h3 className="mt-3 text-[15px] font-bold text-slate-900 md:mt-4 md:text-base">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-500 md:text-sm">{desc}</p>
      <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[12px] text-slate-600 md:text-xs">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-1.5">
            <CheckIcon className={`h-3.5 w-3.5 ${tone.text}`} />
            {b}
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ───── PC 우측 대시보드 미리보기 (PC 전용) ───── */
function DashboardPreview() {
  return (
    <div className="relative">
      {/* 뒷쪽 부유 orb — 카드를 빛으로 감쌈 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] blur-3xl"
        style={{
          background:
            'radial-gradient(60% 50% at 30% 50%, rgba(37, 99, 235, 0.18), transparent 70%),' +
            'radial-gradient(50% 50% at 80% 30%, rgba(56, 189, 248, 0.15), transparent 70%)',
        }}
      />

      {/* AI assistant bubble (떠있는 둥근 칩) */}
      <span
        aria-hidden
        className="absolute -bottom-3 right-3 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-500 text-white shadow-xl shadow-blue-500/40 ring-4 ring-white"
      >
        <span className="rm-ai-icon-pulse absolute inset-0 rounded-full" />
        <span className="relative text-xs font-bold">AI</span>
      </span>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
        <div className="flex h-7 items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>

        <div className="grid grid-cols-[120px_1fr]">
          <aside className="border-r border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-3 flex items-center gap-1.5">
              <RetailMateLogoIcon className="h-[18px] w-[18px] text-blue-600" />
              <span className="text-[11px] font-bold text-slate-900">리테일메이트</span>
            </div>
            <ul className="space-y-1 text-[11px]">
              <SideItem label="대시보드" active />
              <SideItem label="매출/비용" />
              <SideItem label="직원 관리" />
              <SideItem label="근로계약서" />
              <SideItem label="출퇴근 관리" />
              <SideItem label="AI 인사이트" />
              <SideItem label="설정" />
            </ul>
          </aside>

          <div className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-900">오늘의 요약</p>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">이번 달</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiTile label="매출" value="24,580,000원" delta="▲ 12.5%" tone="blue" />
              <KpiTile label="비용" value="8,430,000원" delta="▼ 5.3%" tone="red" />
              <KpiTile label="순이익" value="16,150,000원" delta="▲ 18.7%" tone="emerald" />
              <KpiTile label="직원 수" value="12명" delta="출근 10명" tone="slate" />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_1fr]">
              <MiniLineChart />
              <AIInsightCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <li
      className={
        'flex items-center gap-1.5 rounded-md px-2 py-1.5 ' +
        (active ? 'bg-blue-600 text-white' : 'text-slate-600')
      }
    >
      <span className={'h-1 w-1 rounded-full ' + (active ? 'bg-white' : 'bg-slate-400')} />
      {label}
    </li>
  );
}

function KpiTile({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  tone: 'blue' | 'red' | 'emerald' | 'slate';
}) {
  const cls = {
    blue: 'text-blue-600',
    red: 'text-red-500',
    emerald: 'text-emerald-600',
    slate: 'text-slate-600',
  }[tone];
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-2.5">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 text-[12px] font-bold text-slate-900">{value}</p>
      <p className={`mt-0.5 text-[10px] font-medium ${cls}`}>{delta} 전월 대비</p>
    </div>
  );
}

function MiniLineChart() {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <p className="text-[11px] font-semibold text-slate-900">매출 추이</p>
      <div className="mt-2">
        <svg viewBox="0 0 200 70" className="h-20 w-full" aria-hidden>
          <defs>
            <linearGradient id="rmFill2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 50 L20 45 L40 48 L60 38 L80 40 L100 30 L120 32 L140 22 L160 25 L180 18 L200 10 L200 70 L0 70 Z"
            fill="url(#rmFill2)"
          />
          <path
            d="M0 50 L20 45 L40 48 L60 38 L80 40 L100 30 L120 32 L140 22 L160 25 L180 18 L200 10"
            fill="none"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M0 60 L20 58 L40 56 L60 50 L80 52 L100 46 L120 44 L140 38 L160 42 L180 36 L200 30"
            fill="none"
            stroke="#10B981"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="mt-1 flex gap-3 text-[9px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> 매출</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 순이익</span>
      </div>
    </div>
  );
}

function AIInsightCard() {
  return (
    <div className="rounded-lg border border-slate-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-900">AI 인사이트</p>
        <span className="rounded bg-blue-600 px-1 py-0.5 text-[8px] font-bold text-white">NEW</span>
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">
        이번 달 순이익이 전월 대비
      </p>
      <p className="text-base font-bold text-blue-600">18.7% 증가했어요!</p>
      <p className="mt-1.5 text-[9px] leading-snug text-slate-500">
        특히 &apos;상품 매출&apos;이 22% 증가하며 성장을 이끌고 있어요.
      </p>
    </div>
  );
}

/* ─────────── 라인 아이콘들 ─────────── */
type IconProps = React.SVGProps<SVGSVGElement>;

function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}
function ClockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function HeartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 13l4 4 10-10" />
    </svg>
  );
}
function BarsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 20V10 M12 20V4 M19 20v-7" />
    </svg>
  );
}
function DocumentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M9 13h6 M9 17h6" />
    </svg>
  );
}
function PinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function SparkleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" />
    </svg>
  );
}
