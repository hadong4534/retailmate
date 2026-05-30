'use client';

import { useState } from 'react';

/**
 * 계약서 서명 토큰을 받아 직원 서명 URL을 생성·복사하는 버튼.
 * 계약서 목록에서 status='sent' 행에 표시.
 */
export function CopySignLinkButton({ signToken }: { signToken: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/contracts/${signToken}/sign`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 링크를 길게 눌러 복사하세요', url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
      aria-label="직원 서명 링크 복사"
    >
      {copied ? '✓ 복사됨' : '서명 링크 복사'}
    </button>
  );
}
