'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FoundAccount {
  email: string | null;
  provider: 'kakao' | 'email';
  name: string | null;
}

/**
 * 아이디(이메일) 찾기 — 휴대폰 인증 후 가입 이메일과 가입 방식(카카오/이메일)을 알려준다.
 * 직원·사장 공용. 인증번호 발송/검증은 기존 phone/send·verify API 재사용.
 */
export default function FindAccountPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<FoundAccount[] | null>(null);

  const phoneDigits = phone.replace(/\D/g, '');

  async function sendCode() {
    setError(null);
    if (!/^010\d{7,8}$/.test(phoneDigits)) {
      setError('휴대폰 번호를 정확히 입력해주세요.');
      return;
    }
    setLoading(true);
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
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndFind() {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const vres = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits, code: code.trim() }),
      });
      const vdata = await vres.json();
      if (!vres.ok) {
        setError(vdata.error ?? '인증에 실패했습니다.');
        return;
      }
      const fres = await fetch('/api/auth/find-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits }),
      });
      const fdata = await fres.json();
      if (!fres.ok) {
        setError(fdata.error ?? '계정 조회에 실패했습니다.');
        return;
      }
      setAccounts(fdata.accounts ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">아이디 찾기</h1>
      <p className="mt-2 text-sm text-slate-500">
        가입할 때 등록한 휴대폰 번호로 본인 확인 후, 가입된 이메일과 로그인 방법을 알려드려요.
      </p>

      {accounts === null ? (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">휴대폰 번호</label>
            <div className="mt-1 flex gap-2">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={sent}
                className="h-12 min-w-0 flex-1 rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB] disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={loading}
                className="h-12 shrink-0 rounded-md border border-[#E3E5F0] bg-white px-4 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
              >
                {sent ? '재발송' : '인증번호 받기'}
              </button>
            </div>
          </div>

          {sent && (
            <div>
              <label className="block text-sm font-medium text-slate-700">인증번호 (6자리)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 h-12 w-full rounded-md border border-[#E3E5F0] px-3 text-base tracking-widest text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
              />
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {sent && (
            <button
              type="button"
              onClick={verifyAndFind}
              disabled={loading}
              className="h-12 w-full rounded-md bg-[#7177EE] px-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#5E64E6] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? '확인 중...' : '인증하고 아이디 찾기'}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {accounts.length === 0 ? (
            <div className="rounded-lg border border-[#EAECF5] bg-slate-50 px-4 py-5 text-center text-sm text-slate-600">
              이 번호로 가입된 계정을 찾지 못했어요.
              <br />
              직원이라면 사장님께 <strong>근로계약서 서명 링크</strong>를 다시 요청해주세요.
            </div>
          ) : (
            accounts.map((a, i) => (
              <div key={i} className="rounded-lg border border-[#EAECF5] bg-white px-4 py-4 shadow-sm">
                <p className="text-sm text-slate-500">{a.name ? `${a.name}님의 계정` : '내 계정'}</p>
                {a.provider === 'kakao' ? (
                  <p className="mt-1 text-[15px] font-semibold text-slate-900">
                    카카오로 가입된 계정이에요. 로그인 화면에서{' '}
                    <span className="text-amber-600">[카카오로 시작하기]</span>를 눌러주세요.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 break-all text-[15px] font-bold text-indigo-600">{a.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      이 이메일과 비밀번호로 로그인하세요.
                    </p>
                  </>
                )}
              </div>
            ))
          )}
          <Link
            href="/login"
            className="block h-12 w-full rounded-md bg-[#7177EE] px-4 text-center text-base font-semibold leading-[48px] text-white shadow-sm transition hover:bg-[#5E64E6]"
          >
            로그인하러 가기
          </Link>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
