'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * 새 비밀번호 설정 — 재설정 메일 링크로 진입(세션 보유 상태).
 * 세션이 없으면 링크 만료 안내 후 재요청으로 유도.
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  async function save() {
    setError(null);
    if (pw.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (pw !== pw2) {
      setError('비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password: pw });
      if (err) {
        setError(
          err.message.includes('different')
            ? '기존과 다른 비밀번호를 사용해주세요.'
            : '변경에 실패했습니다. 잠시 후 다시 시도해주세요.',
        );
        return;
      }
      setDone(true);
      setTimeout(() => router.replace('/dashboard'), 1200);
    } finally {
      setLoading(false);
    }
  }

  if (ready === null) {
    return <p className="py-10 text-center text-sm text-slate-500">확인 중…</p>;
  }

  if (!ready) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900">링크가 만료되었어요</h1>
        <p className="mt-2 text-sm text-slate-500">
          재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해주세요.
        </p>
        <Link
          href="/reset-password"
          className="mt-6 block h-12 w-full rounded-md bg-[#7177EE] px-4 text-center text-base font-semibold leading-[48px] text-white shadow-sm transition hover:bg-[#5E64E6]"
        >
          재설정 메일 다시 받기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">새 비밀번호 설정</h1>
      <p className="mt-2 text-sm text-slate-500">새로 사용할 비밀번호를 입력해주세요. (8자 이상)</p>

      {done ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm font-semibold text-emerald-900">
          비밀번호가 변경되었습니다. 잠시 후 홈으로 이동해요…
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">새 비밀번호</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">새 비밀번호 확인</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
            />
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={loading}
            className="h-12 w-full rounded-md bg-[#7177EE] px-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#5E64E6] active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      )}
    </div>
  );
}
