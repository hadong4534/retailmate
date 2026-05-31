'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PhoneInput } from '@/components/ui/PhoneInput';

type Stage = 'idle' | 'sent' | 'verified';

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [code, setCode] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [smsLoading, setSmsLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phoneDigits = phone.replace(/\D/g, '');
  const isValidPhone = /^010\d{7,8}$/.test(phoneDigits);

  const canSendSms = isValidPhone && !smsLoading && stage !== 'verified' && countdown === 0;
  const canVerify = stage === 'sent' && code.length === 6 && !verifyLoading;
  const canSubmit =
    email.length > 0 &&
    password.length >= 8 &&
    name.length > 0 &&
    stage === 'verified' &&
    agreeTerms &&
    agreePrivacy &&
    !signupLoading;

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  function startCountdown(seconds: number) {
    setCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((s) => {
        if (s <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleSendSms() {
    setError(null);
    setInfo(null);
    if (!isValidPhone) {
      setError('휴대폰 번호 형식이 올바르지 않습니다.');
      return;
    }
    setSmsLoading(true);
    try {
      const res = await fetch('/api/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '인증번호 발송에 실패했습니다.');
        return;
      }
      setStage('sent');
      setInfo('인증번호가 발송되었습니다. 5분 이내에 입력해주세요.');
      startCountdown(60); // 재발송 가능 시점 카운트다운
    } catch {
      setError('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSmsLoading(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    setInfo(null);
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '인증에 실패했습니다.');
        return;
      }
      setStage('verified');
      setInfo('휴대폰 번호가 확인되었습니다.');
    } catch {
      setError('인증에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (stage !== 'verified') {
      setError('휴대폰 인증을 먼저 완료해주세요.');
      return;
    }

    setSignupLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, phone: phoneDigits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '가입에 실패했습니다.');
        return;
      }
      // 가입 직후 비밀번호로 로그인 → 세션 발급
      const supabase = createClient();
      const { error: signinErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signinErr) {
        setError('가입은 완료됐지만 자동 로그인에 실패했습니다. 로그인 페이지에서 직접 로그인해주세요.');
        router.push('/login');
        return;
      }
      window.location.href = '/onboarding/store';
    } catch {
      setError('가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSignupLoading(false);
    }
  }

  function handleKakaoLogin() {
    setError(null);
    // 비즈앱 미인증 상태에서는 Supabase 기본 OAuth가 account_email scope 강제 포함 → KOE205.
    // 우리 서버에서 직접 카카오 OAuth를 진행해 scope를 profile_nickname으로 제한.
    window.location.href = '/api/auth/kakao/start?next=/onboarding/store';
  }

  return (
    <div className="rounded-2xl border border-[#EAECF5] bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
      <p className="mt-2 text-sm text-slate-500">
        무료로 시작 · 신용카드 등록 불필요
      </p>
      <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
        직원이신가요? 사장님께 받은 <strong>근로계약서 서명 링크</strong>로 가입해주세요. 이 페이지는 매장을 직접 운영하시는 사장님 전용입니다.
      </div>

      <button
        type="button"
        onClick={handleKakaoLogin}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] px-4 text-base font-semibold text-[#3C1E1E] shadow-sm transition active:scale-[0.98] hover:brightness-95"
      >
        <KakaoIcon />
        카카오로 시작하기
      </button>

      <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        <span>또는 이메일로 가입</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="이메일" id="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="owner@example.com"
          />
        </Field>

        <Field label="비밀번호 (8자 이상)" id="password">
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="사장님 이름" id="name">
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="홍길동"
          />
        </Field>

        {/* 휴대폰 번호 + 인증번호 받기 */}
        <div>
          <label className="block text-sm font-medium text-slate-700">휴대폰 번호</label>
          <div className="mt-1 flex gap-2">
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                const next = e.target.value;
                setPhone(formatPhone(next));
                if (stage === 'verified') setStage('idle'); // 번호 바꾸면 인증 무효
              }}
              placeholder="010-0000-0000"
              maxLength={13}
              disabled={stage === 'verified'}
              className={`h-11 flex-1 rounded-md border border-[#E3E5F0] px-3 text-base focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB] disabled:bg-slate-50 disabled:text-slate-500`}
            />
            <button
              type="button"
              onClick={handleSendSms}
              disabled={!canSendSms}
              className="h-11 shrink-0 rounded-md border border-indigo-600 px-3 text-sm font-semibold text-indigo-600 disabled:cursor-not-allowed disabled:border-[#EAECF5] disabled:text-slate-400"
            >
              {stage === 'verified'
                ? '인증완료'
                : smsLoading
                ? '발송 중...'
                : countdown > 0
                ? `재발송 ${countdown}s`
                : stage === 'sent'
                ? '재발송'
                : '인증번호 받기'}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            본인 식별에 사용됩니다. 한 휴대폰당 한 계정만 가능합니다.
          </p>
        </div>

        {/* 인증번호 입력 — 발송된 후 표시 */}
        {stage !== 'idle' && (
          <div>
            <label className="block text-sm font-medium text-slate-700">인증번호 (6자리)</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                disabled={stage === 'verified'}
                className="h-11 flex-1 rounded-md border border-[#E3E5F0] px-3 text-base tracking-widest font-mono focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB] disabled:bg-slate-50 disabled:text-slate-500"
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={!canVerify}
                className="h-11 shrink-0 rounded-md bg-[#7177EE] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {(stage as Stage) === 'verified' ? '확인됨' : verifyLoading ? '확인 중...' : '확인'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 rounded-md bg-slate-50 p-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-red-600">[필수]</span> 이용약관에 동의합니다.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-red-600">[필수]</span> 개인정보 처리방침에 동의합니다.
            </span>
          </label>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {info && !error && (
          <div className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-700">{info}</div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-md bg-[#7177EE] px-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-[#5E64E6] disabled:opacity-50"
        >
          {signupLoading ? '가입 중...' : '가입하기'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}

function formatPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

const inputCls =
  'mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]';

function Field({
  label, id, children,
}: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4C6.477 4 2 7.477 2 11.75c0 2.73 1.793 5.13 4.5 6.51L5.4 22l4.42-2.45c.708.105 1.43.16 2.18.16 5.523 0 10-3.477 10-7.75S17.523 4 12 4Z"
        fill="#3C1E1E"
      />
    </svg>
  );
}
