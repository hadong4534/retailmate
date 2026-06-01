'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { setRememberFlag } from '@/lib/auth/session-flag';
import { SplashScreen } from '@/components/common/SplashScreen';

export default function LoginPage() {
  return (
    <>
      {/* 앱 진입 인트로 — 비로그인 실행 시 대시보드→로그인으로 오는 길에 1.2초 노출 후 사라짐 */}
      <SplashScreen />
      <Suspense fallback={<div className="text-center text-slate-500">불러오는 중...</div>}>
        <LoginForm />
      </Suspense>
    </>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(translateAuthError(error.message));
      setLoading(false);
      return;
    }

    // 자동 로그인 플래그 저장
    setRememberFlag(remember);

    // ⚠ router.push 대신 window.location.href로 hard navigation.
    //   - signInWithPassword 직후 일부 모바일 브라우저(특히 iOS Safari)에서 cookie 쓰기가
    //     비동기적으로 처리되어, soft navigation 시 다음 request에 cookie가 누락될 수 있음.
    //   - hard reload는 브라우저가 모든 cookie를 포함시켜 안전하게 SSR auth가 통과됨.
    window.location.href = redirect;
  }

  function handleKakaoLogin() {
    setError(null);
    setRememberFlag(remember);
    // 커스텀 카카오 OAuth — scope을 profile_nickname으로 제한해 비즈앱 미인증 KOE205 회피.
    window.location.href = `/api/auth/kakao/start?next=${encodeURIComponent(redirect)}`;
  }

  return (
    <div
      className="rm-page rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8"
      style={{ WebkitBackdropFilter: 'blur(24px)' }}
    >
      <h1 className="text-center text-2xl font-bold text-slate-900">로그인</h1>
      <p className="mt-2 text-center text-sm text-slate-500">
        이메일 또는 카카오로 시작하세요.
      </p>

      <button
        type="button"
        onClick={handleKakaoLogin}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] px-4 text-base font-semibold text-[#3C1E1E] shadow-sm transition active:scale-[0.98] hover:brightness-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 4C6.477 4 2 7.477 2 11.75c0 2.73 1.793 5.13 4.5 6.51L5.4 22l4.42-2.45c.708.105 1.43.16 2.18.16 5.523 0 10-3.477 10-7.75S17.523 4 12 4Z"
            fill="#3C1E1E"
          />
        </svg>
        카카오로 로그인
      </button>

      <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        <span>또는 이메일 로그인</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-[#E3E5F0] px-3 text-base focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
            placeholder="owner@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-[#E3E5F0] px-3 text-base focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-[#E3E5F0] text-indigo-600 focus:ring-2 focus:ring-[#E4E6FB]"
          />
          <span>자동 로그인 <span className="text-[11px] text-slate-400">(직접 로그아웃 전까지 유지)</span></span>
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-md bg-[#7177EE] px-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-[#5E64E6] disabled:opacity-60"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        사장님이신가요?{' '}
        <Link href="/signup" className="font-semibold text-indigo-600 hover:underline">
          회원가입
        </Link>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600">
        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={2.2} />
        <p className="leading-relaxed">
          <span className="font-medium text-slate-900">직원이신가요?</span>{' '}
          사장님께 받은 <strong>근로계약서 서명 링크</strong>로 가입·로그인하세요.
        </p>
      </div>
    </div>
  );
}

function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (msg.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 받은 메일함을 확인해주세요.';
  if (msg.includes('rate limit')) return '잠시 후 다시 시도해주세요.';
  return msg;
}
