'use client';

import { useEffect, useState, useTransition } from 'react';
import { markNoticeRead } from '@/app/(app)/notices/actions';

interface NoticePayload {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  published_at: string;
  expires_at: string | null;
}

export function NoticePopup({ notices }: { notices: NoticePayload[] }) {
  const [queue, setQueue] = useState<NoticePayload[]>(notices);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setQueue(notices);
  }, [notices]);

  if (queue.length === 0) return null;

  const current = queue[0];
  const total = queue.length;
  const idx = notices.length - total + 1;

  function handleAck() {
    startTransition(async () => {
      const result = await markNoticeRead(current.id);
      if ('error' in result && result.error) {
        // 에러 시에도 큐에서 제거 (UI 안 막힘) — 다음 로그인 시 재노출
      }
      setQueue((q) => q.slice(1));
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#EAECF5] bg-white shadow-xl">
        <div className="border-b border-[#EAECF5] px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-600">📢 매장 공지</p>
            <span className="text-xs text-slate-400">
              {idx} / {notices.length}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{current.title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(current.published_at).toLocaleString('ko-KR')}
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto px-6 py-5">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{current.body}</p>
        </div>

        <div className="flex border-t border-[#EAECF5] px-6 py-4">
          <button
            type="button"
            onClick={handleAck}
            disabled={pending}
            className="ml-auto rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? '처리 중…' : total > 1 ? '확인하고 다음' : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}
