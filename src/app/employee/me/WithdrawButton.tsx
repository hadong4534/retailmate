'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deleteMyAccount } from './actions';

/**
 * 회원탈퇴 버튼 — 2단계 확인 후 계정·개인정보 삭제.
 */
export function WithdrawButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleWithdraw() {
    setLoading(true);
    setError(null);
    const res = await deleteMyAccount();
    if ('error' in res) {
      setError(res.error);
      setLoading(false);
      return;
    }
    // 클라이언트 세션도 정리 후 로그인 화면으로
    try {
      await createClient().auth.signOut();
    } catch {
      /* 이미 서버에서 정리됨 */
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="mt-10 border-t border-slate-200 pt-6 text-center">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
        >
          회원탈퇴
        </button>
      ) : (
        <div className="mx-auto max-w-sm rounded-xl border border-red-200 bg-red-50 p-4 text-left">
          <p className="text-sm font-semibold text-red-700">정말 탈퇴하시겠어요?</p>
          <p className="mt-1 text-xs leading-relaxed text-red-600">
            계정과 개인정보(이름·연락처·근태·급여 기록)가 삭제되며 되돌릴 수 없습니다.
            매장에서도 자동으로 빠집니다.
          </p>
          {error && (
            <p className="mt-2 rounded-md bg-white/70 px-2.5 py-2 text-xs text-red-700">{error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => { setOpen(false); setError(null); }}
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleWithdraw}
              className="flex-1 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? '처리 중...' : '탈퇴하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
