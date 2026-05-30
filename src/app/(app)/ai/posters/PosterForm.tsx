'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SparkleAvatar } from '@/components/ai/SparkleAvatar';
import { enqueue } from '@/lib/ai/image-queue';

const KINDS = [
  { value: 'poster', label: '포스터', desc: '세로형 (4:5)' },
  { value: 'sns', label: 'SNS', desc: '정사각 (1:1)' },
  { value: 'card_news', label: '카드뉴스', desc: '정사각 (1:1)' },
] as const;

const TEMPLATES = [
  '봄맞이 신메뉴 출시 안내, 따뜻한 분위기',
  '주말 특별 할인 이벤트 (20% OFF)',
  '단골 고객 감사 메시지',
  '신선한 제철 식재료 강조',
  '오픈 1주년 감사 이벤트',
];

export function PosterForm({ hasLogo }: { hasLogo: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<'poster' | 'sns' | 'card_news'>('poster');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setQueued(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/ai/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            kind,
            mode: 'brand',
          }),
        });
        const json = (await res.json()) as { imageId?: string; error?: string };
        if (!res.ok || !json.imageId) {
          setError(json.error ?? '생성 요청 실패');
          return;
        }
        // 큐에 등록 → 글로벌 워처가 폴링하여 완료 시 토스트
        enqueue({ id: json.imageId, kind, prompt: prompt.trim() });
        setPrompt('');
        setQueued(true);
        // 갤러리 새로고침해서 pending row 표시
        router.refresh();
        // 안내 토스트는 8초간만 보여주고 자동 사라짐
        setTimeout(() => setQueued(false), 6000);
      } catch (err) {
        setError((err as Error).message ?? '네트워크 오류');
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      {!hasLogo && (
        <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠ 매장 로고가 등록되지 않았습니다. <a href="/ai/brand" className="underline">로고를 먼저 등록</a>하면 포스터에 자동 반영됩니다.
        </div>
      )}

      <div className="flex items-start gap-3">
        <SparkleAvatar size={28} withGlow />
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-900">새 디자인 만들기</h2>
          <p className="mt-1 text-xs text-slate-500">
            매장 로고와 정보가 자동으로 반영됩니다. 어떤 분위기·메시지로 만들지 알려주세요.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">형식</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {KINDS.map((k) => {
              const active = kind === k.value;
              return (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={
                    'rounded-md border px-3 py-2.5 text-left transition ' +
                    (active
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50')
                  }
                >
                  <p className={'text-sm font-semibold ' + (active ? 'text-blue-700' : 'text-slate-900')}>
                    {k.label}
                  </p>
                  <p className="text-[10px] text-slate-500">{k.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">프롬프트</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="예: 봄맞이 신메뉴 출시, 벚꽃 분위기로 따뜻하게"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">매장 로고·소개·메인 컬러는 자동으로 반영됩니다.</p>
            <span className="text-[10px] text-slate-400">{prompt.length} / 500</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPrompt(t)}
              disabled={pending}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">⚠ {error}</p>
        )}

        {queued && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
            생성을 시작했습니다. 다른 작업 중에도 완료되면 화면 상단에 알림이 표시됩니다.
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending || !prompt.trim()}>
          {pending ? '요청 중…' : '생성 시작'}
        </Button>

        <p className="text-center text-[10px] text-slate-400">
          보통 10~30초 소요됩니다.
        </p>
      </div>
    </form>
  );
}
