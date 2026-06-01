'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SparkleAvatar } from '@/components/ai/SparkleAvatar';
import { enqueue } from '@/lib/ai/image-queue';

type Kind = 'poster' | 'sns' | 'card_news';

interface SizeOpt { value: string; label: string; desc: string }

// 형식 탭 — 포스터 / SNS / 정사각형(1:1 통합)
const KINDS: { value: Kind; label: string; desc: string }[] = [
  { value: 'poster', label: '포스터', desc: '인쇄용 A4·A3·A2' },
  { value: 'sns', label: 'SNS', desc: '스토리·가로·게시물' },
  { value: 'card_news', label: '정사각형', desc: '1:1' },
];

// 형식별 사이즈/비율 옵션
const SIZES: Record<Kind, SizeOpt[]> = {
  poster: [
    { value: 'a4', label: 'A4', desc: '210×297' },
    { value: 'a3', label: 'A3', desc: '297×420' },
    { value: 'a2', label: 'A2', desc: '420×594' },
  ],
  sns: [
    { value: '9:16', label: '9:16', desc: '스토리·릴스' },
    { value: '16:9', label: '16:9', desc: '가로형' },
    { value: '4:5', label: '게시물', desc: '피드 4:5' },
  ],
  card_news: [
    { value: '1:1', label: '1:1', desc: '정사각' },
  ],
};

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
  const [kind, setKind] = useState<Kind>('poster');
  const [size, setSize] = useState<string>('a4');

  function changeKind(k: Kind) {
    setKind(k);
    setSize(SIZES[k][0].value); // 형식 바꾸면 첫 사이즈로 리셋
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setQueued(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/ai/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, kind, size, mode: 'brand' }),
        });
        const json = (await res.json()) as { imageId?: string; error?: string };
        if (!res.ok || !json.imageId) {
          setError(json.error ?? '생성 요청 실패');
          return;
        }
        enqueue({ id: json.imageId, kind, prompt: prompt.trim() });
        setPrompt('');
        setQueued(true);
        router.refresh();
        setTimeout(() => setQueued(false), 6000);
      } catch (err) {
        setError((err as Error).message ?? '네트워크 오류');
      }
    });
  }

  const sizeOpts = SIZES[kind];

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#EAECF5] bg-white p-5">
      {!hasLogo && (
        <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          매장 로고가 등록되지 않았습니다. <a href="/ai/brand" className="underline">로고를 먼저 등록</a>하면 포스터에 자동 반영됩니다.
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
        {/* 형식 */}
        <div>
          <label className="block text-sm font-medium text-slate-700">형식</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {KINDS.map((k) => {
              const active = kind === k.value;
              return (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => changeKind(k.value)}
                  className={
                    'rounded-md border px-3 py-2.5 text-left transition ' +
                    (active ? 'border-indigo-400 bg-indigo-50' : 'border-[#EAECF5] bg-white hover:bg-slate-50')
                  }
                >
                  <p className={'text-sm font-semibold ' + (active ? 'text-indigo-700' : 'text-slate-900')}>{k.label}</p>
                  <p className="text-[10px] text-slate-500">{k.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 사이즈/비율 — 형식별 */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {kind === 'poster' ? '용지 크기' : kind === 'sns' ? '비율' : '비율'}
          </label>
          <div className={'mt-2 grid gap-2 ' + (sizeOpts.length === 1 ? 'grid-cols-1' : 'grid-cols-3')}>
            {sizeOpts.map((s) => {
              const active = size === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSize(s.value)}
                  className={
                    'rounded-md border px-3 py-2 text-center transition ' +
                    (active ? 'border-indigo-400 bg-indigo-50' : 'border-[#EAECF5] bg-white hover:bg-slate-50')
                  }
                >
                  <p className={'text-[13px] font-semibold ' + (active ? 'text-indigo-700' : 'text-slate-900')}>{s.label}</p>
                  <p className="text-[10px] text-slate-500">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 프롬프트 */}
        <div>
          <label className="block text-sm font-medium text-slate-700">프롬프트</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="예: 봄맞이 신메뉴 출시, 벚꽃 분위기로 따뜻하게"
            className="mt-1 w-full rounded-md border border-[#E3E5F0] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
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
              className="rounded-full border border-[#EAECF5] bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {queued && (
          <p className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
            생성을 시작했습니다. 다른 작업 중에도 완료되면 화면 상단에 알림이 표시됩니다.
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending || !prompt.trim()}>
          {pending ? '요청 중…' : '생성 시작'}
        </Button>
        <p className="text-center text-[10px] text-slate-400">보통 30초~2분 소요됩니다.</p>
      </div>
    </form>
  );
}
