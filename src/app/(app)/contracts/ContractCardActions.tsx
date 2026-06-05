'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CopySignLinkButton } from './CopySignLinkButton';
import { CancelContractButton } from './CancelContractButton';
import { DeleteContractButton } from './DeleteContractButton';
import { MoreIcon } from '@/components/icons';

interface Props {
  contractId: string;
  status: 'draft' | 'sent' | 'signed' | 'terminated' | 'cancelled';
  signToken: string | null;
  inviteName: string | null;
  /** 만료/임박 계약일 때 갱신 작성 링크 (/contracts/new?renew=...) */
  renewHref?: string | null;
}

/**
 * 모바일 계약서 카드용 액션 모음.
 * - 메인 액션: "보기" (sent/signed)
 * - 더보기 (⋯): 서명 링크 복사, 발송 취소 — 외부 클릭 시 닫힘
 *
 * PC 테이블은 별도 — 가로 폭 충분하므로 버튼 나열 유지.
 */
export function ContractCardActions({ contractId, status, signToken, inviteName, renewHref }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const showView = status === 'sent' || status === 'signed';
  // 더보기 메뉴는 항상 노출 — 모든 상태에서 최소한 '삭제'는 가능해야 영구 누적 방지.

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      {showView && (
        <Link
          href={`/contracts/${contractId}/view`}
          className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-[#EAECF5] bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
        >
          보기
        </Link>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="더보기"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#EAECF5] bg-white text-slate-600 hover:bg-slate-50"
      >
        <MoreIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-[#EAECF5] bg-white shadow-lg"
          onClick={() => setOpen(false)}
        >
          {renewHref && (
            <Link
              href={renewHref}
              className="block border-b border-slate-100 px-3 py-2 text-[12px] font-medium text-indigo-700 hover:bg-indigo-50"
            >
              갱신 계약서 작성
            </Link>
          )}
          {status === 'sent' && signToken && (
            <div className="border-b border-slate-100 px-2 py-1.5">
              <CopySignLinkButton signToken={signToken} />
            </div>
          )}
          {status === 'sent' && (
            <div className="border-b border-slate-100 px-2 py-1.5">
              <CancelContractButton contractId={contractId} inviteName={inviteName} />
            </div>
          )}
          <DeleteContractButton contractId={contractId} label={inviteName} variant="chip" />
        </div>
      )}
    </div>
  );
}
