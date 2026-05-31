'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { regeneratePDF } from '../sign/actions';

export function PrintToolbar({
  backHref,
  contractId,
  hasPdf,
}: {
  backHref: string;
  contractId: string;
  hasPdf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [generated, setGenerated] = useState(hasPdf);

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regeneratePDF(contractId);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      setGenerated(true);
      router.refresh();
    });
  }

  return (
    <div
      className="sticky top-0 z-20 flex items-center justify-between border-b border-[#EAECF5] bg-white/95 px-4 py-3 backdrop-blur print:hidden"
      // 계약서 view는 (app) 그룹 밖이라 AppShell 헤더가 적용되지 않음.
      // 모바일 PWA 풀스크린(viewportFit=cover)에서 노치/시계와 ← 버튼이 겹쳐 목록으로 돌아갈 수 없던 문제 해결.
      style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
    >
      <Link
        href={backHref}
        className="text-sm font-medium text-slate-700 hover:text-slate-900"
      >
        ← 목록으로
      </Link>
      <div className="flex items-center gap-2">
        {generated ? (
          <a
            href={`/api/contracts/${contractId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            📄 PDF 다운로드
          </a>
        ) : (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={pending}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
          >
            {pending ? 'PDF 생성 중…' : '📄 PDF 생성'}
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          🖨 인쇄
        </button>
      </div>
    </div>
  );
}
