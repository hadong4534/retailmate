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
  const [imgBusy, setImgBusy] = useState(false);

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regeneratePDF(contractId);
      if ('error' in result) { alert(result.error); return; }
      setGenerated(true);
      router.refresh();
    });
  }

  async function handleSaveImage() {
    setImgBusy(true);
    try {
      const el = document.querySelector('.contract-print-area') as HTMLElement | null;
      if (!el) { alert('계약서 영역을 찾을 수 없습니다.'); return; }
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = '리테일메이트_근로계약서.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert('이미지 저장 중 문제가 발생했어요. PDF 저장을 이용해주세요.');
    } finally {
      setImgBusy(false);
    }
  }

  return (
    <div
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[#EAECF5] bg-white/95 px-4 py-3 backdrop-blur print:hidden"
      style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
    >
      <Link href={backHref} className="text-sm font-medium text-slate-700 hover:text-slate-900">
        ← 목록으로
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        {generated ? (
          <a
            href={`/api/contracts/${contractId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            PDF 저장
          </a>
        ) : (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={pending}
            className="rounded-md bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
          >
            {pending ? 'PDF 생성 중…' : 'PDF 생성'}
          </button>
        )}
        <button
          type="button"
          onClick={handleSaveImage}
          disabled={imgBusy}
          className="rounded-md border border-[#C9CCF7] bg-white px-3.5 py-2 text-sm font-semibold text-[#5458E6] shadow-sm hover:bg-[#EEF0FE] disabled:opacity-60"
        >
          {imgBusy ? '이미지 저장 중…' : '이미지 저장'}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-[#7177EE] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5E64E6]"
        >
          인쇄
        </button>
      </div>
    </div>
  );
}
