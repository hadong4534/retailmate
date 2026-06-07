'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * 비밀번호 재설정 요청 — 가입 이메일로 재설정 링크를 보낸다.
 * 메일 링크 → /auth/callback?next=/reset-password/update → 새 비밀번호 입력.
 */
export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    const e = email.trim();
    if (!/.+@.+\..+/.test(e)) {
      setError('이메일 주소를 정확히 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: `${location.origin}/auth/callback?next=/reset-password/update`,
      });
      if (err) {
        setError('메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">비밀번호 재설정</h1>
      <p className="mt-2 text-sm text-slate-500">
        가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드려요.
        <br />
        카카오로 가입한 계정은 비밀번호 없이 [카카오로 시작하기]로 로그인하면 됩니다.
      </p>

      {sent ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-900">
          <p className="font-semibold">재설정 메일을 보냈어요.</p>
          <p className="mt-1 leading-relaxed">
            <strong>{email.trim()}</strong> 받은편지함에서 메일을 열고 링크를 눌러 새 비밀번호를
            설정해주세요. 메일이 안 보이면 스팸함도 확인해주세요.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">이메일</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
            />
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={send}
            disabled={loading}
            className="h-12 w-full rounded-md bg-[#7177EE] px-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#5E64E6] active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? '발송 중...' : '재설정 링크 보내기'}
          </button>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          로그인으로 돌아가기
        </Link>
        <span className="mx-2 text-slate-300">|</span>
        <Link href="/find-account" className="font-semibold text-indigo-600 hover:underline">
          아이디 찾기
        </Link>
      </div>
    </div>
  );
}
