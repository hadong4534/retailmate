'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { getQueue, dequeue, subscribeQueue, clearStale, type QueueItem } from '@/lib/ai/image-queue';

interface Toast {
  imageId: string;
  status: 'done' | 'failed';
  kind: string;
  prompt: string;
  errorMessage?: string;
  shownAt: number;
}

interface StatusItem {
  id: string;
  status: string;
  kind: string;
  user_prompt: string;
  error_message: string | null;
}

const KIND_LABEL: Record<string, string> = {
  poster: '포스터',
  sns: 'SNS',
  card_news: '카드뉴스',
  free: '이미지',
};

const TOAST_TTL_MS = 8000;
const POLL_INTERVAL_MS = 3000;

/**
 * 전역 AI 이미지 생성 토스트 워처.
 * (app)/layout.tsx에 1회 마운트. 어느 페이지에서 시작하든 완료 알림이 화면 상단 가운데에 노출.
 */
export function AIToastWatcher() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 큐 변화 구독 + 초기화 + 만료 청소
  useEffect(() => {
    clearStale();
    const update = () => setQueue(getQueue());
    update();
    return subscribeQueue(update);
  }, []);

  // 폴링
  useEffect(() => {
    if (queue.length === 0) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;
      const cur = getQueue();
      if (cur.length === 0) return;

      try {
        const ids = cur.map((q) => q.id).join(',');
        const res = await fetch(`/api/ai/images/status?ids=${ids}`, { cache: 'no-store' });
        if (res.ok) {
          const json = (await res.json()) as { items?: StatusItem[] };
          const items = json.items ?? [];
          for (const item of items) {
            if (item.status === 'done' || item.status === 'failed') {
              const queueItem = cur.find((q) => q.id === item.id);
              if (queueItem) {
                showToast({
                  imageId: item.id,
                  status: item.status,
                  kind: item.kind,
                  prompt: queueItem.prompt,
                  errorMessage: item.error_message ?? undefined,
                  shownAt: Date.now(),
                });
                dequeue(item.id);
              }
            }
          }
        }
      } catch {
        // network error - 다음 poll에 재시도
      }

      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    function showToast(t: Toast) {
      setToasts((prev) => [...prev, t]);
      // TTL 후 자동 제거
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.imageId !== t.imageId));
      }, TOAST_TTL_MS);
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [queue]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((x) => x.imageId !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-3 z-[100] flex w-[calc(100%-1rem)] max-w-md -translate-x-1/2 flex-col gap-2 px-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastCard key={t.imageId} toast={t} onDismiss={() => dismiss(t.imageId)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const isDone = toast.status === 'done';
  const label = KIND_LABEL[toast.kind] ?? toast.kind;

  return (
    <div
      role="status"
      className={
        'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md ' +
        (isDone
          ? 'border-emerald-200 bg-white/95'
          : 'border-red-200 bg-white/95')
      }
    >
      <div
        className={
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ' +
          (isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600')
        }
      >
        {isDone ? <Sparkles className="h-4 w-4" strokeWidth={2.4} /> : <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {isDone ? `${label} 생성 완료` : `${label} 생성 실패`}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {isDone
            ? toast.prompt
            : toast.errorMessage?.slice(0, 60) ?? '잠시 후 다시 시도해주세요.'}
        </p>
        {isDone && (
          <Link
            href="/ai/drive"
            onClick={onDismiss}
            className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:underline"
          >
            바로 확인 →
          </Link>
        )}
      </div>
      <button
        type="button"
        aria-label="닫기"
        onClick={onDismiss}
        className="shrink-0 text-slate-400 hover:text-slate-700"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 L6 18 M6 6 L18 18" />
        </svg>
      </button>
    </div>
  );
}
