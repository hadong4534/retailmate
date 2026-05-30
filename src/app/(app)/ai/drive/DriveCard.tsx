'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

interface Props {
  id: string;
  kindLabel: string;
  prompt: string;
  status: string;
  errorMessage: string | null;
  signedUrl: string | null;
  createdAt: string;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export function DriveCard({
  id,
  kindLabel,
  prompt,
  status,
  errorMessage,
  signedUrl,
  createdAt,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDelete() {
    setConfirmOpen(false);
    startTransition(async () => {
      const res = await fetch(`/api/ai/images/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json().catch(() => null);
        alert(json?.error ?? '삭제 실패');
      }
    });
  }

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md">
      <div className="relative aspect-square bg-slate-100">
        {status === 'failed' ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
            <AlertTriangle className="h-5 w-5 text-red-500" strokeWidth={2.2} />
            <p className="text-[10px] font-semibold text-red-600">생성 실패</p>
            {errorMessage && (
              <p className="line-clamp-3 text-[10px] text-red-500/80">{errorMessage}</p>
            )}
          </div>
        ) : status === 'pending' ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            <p className="text-[10px] text-slate-400">생성 중…</p>
          </div>
        ) : signedUrl ? (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt={prompt}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
          </a>
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
            URL 만료 — 새로고침
          </div>
        )}

        {/* 삭제 버튼 — hover로 노출 */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setConfirmOpen(true);
          }}
          disabled={pending}
          aria-label="삭제"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-500 opacity-0 shadow-sm ring-1 ring-slate-200 transition hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6" />
          </svg>
        </button>
      </div>

      <div className="p-2.5">
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-700" title={prompt}>
          {prompt}
        </p>
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
              {kindLabel}
            </span>
            <span className="text-[9px] text-slate-400">{formatRelative(createdAt)}</span>
          </div>
          {signedUrl && status === 'done' && (
            <a
              href={`/api/ai/images/${id}`}
              download
              className="text-[10px] font-medium text-blue-600 hover:underline"
            >
              다운로드 ↓
            </a>
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {confirmOpen && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="mx-3 w-full rounded-lg bg-white p-4 text-center shadow-xl">
            <p className="text-sm font-semibold text-slate-900">삭제하시겠어요?</p>
            <p className="mt-1 text-[11px] text-slate-500">복구할 수 없습니다.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
