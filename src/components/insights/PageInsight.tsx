/**
 * 페이지별 작은 AI 인사이트 박스 (매출/비용/근태 등 상세 페이지에서 사용).
 * 대시보드의 큰 다크 카드와는 다른 라이트한 톤.
 */

import { SparklesIcon, LightbulbIcon } from '@/components/icons';

interface Tip {
  text: string;
}

export function PageInsight({
  title,
  body,
  tip,
}: {
  title: string;
  body: string;
  tip?: Tip;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
          <SparklesIcon className="h-3 w-3" />
          이달의 인사이트
        </span>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <SparklesIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{body}</p>
        </div>
      </div>

      {tip && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
          <LightbulbIcon className="h-4 w-4 shrink-0 text-indigo-600" />
          <span>
            <strong>팁</strong> {tip.text}
          </span>
        </div>
      )}
    </div>
  );
}
