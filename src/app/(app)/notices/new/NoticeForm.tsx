'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createNotice } from '../actions';

export function NoticeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'employees'>('all');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createNotice({
        title,
        body,
        target,
        is_pinned: isPinned,
        expires_at: expiresAt
          ? new Date(expiresAt + 'T23:59:59').toISOString()
          : null,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="예: 5월 19일 정기 미팅"
        maxLength={100}
        required
      />

      <div>
        <label className="block text-sm font-medium text-slate-700">내용</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="공지 내용을 입력해주세요. 직원이 로그인 시 자동으로 팝업으로 표시됩니다."
          className="mt-1 w-full rounded-md border border-[#E3E5F0] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">대상</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([
            ['all', '전체 (최고관리자·매니저·직원)'],
            ['employees', '직원만'],
          ] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTarget(v)}
              className={
                'rounded-md border px-3 py-2 text-sm font-medium transition ' +
                (target === v
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-[#EAECF5] bg-white text-slate-700 hover:bg-slate-50')
              }
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          만료일 <span className="text-xs text-slate-400">(선택, 비워두면 영구)</span>
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="h-4 w-4"
        />
        상단 고정 <span className="text-xs text-slate-400">(목록에서 우선 표시)</span>
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => router.back()}
          disabled={pending}
        >
          취소
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-[2]"
          disabled={pending || !title || !body}
        >
          {pending ? '게시 중…' : '공지 게시'}
        </Button>
      </div>
    </form>
  );
}
