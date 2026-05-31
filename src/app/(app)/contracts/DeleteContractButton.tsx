'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteContract } from './actions';

interface Props {
  contractId: string;
  /** 식별용 — confirm 메시지에 표시 */
  label?: string | null;
  /** 'icon': 아이콘만 (PC 테이블용) / 'chip': 칩 (모바일 카드 더보기 안) */
  variant?: 'icon' | 'chip';
}

export function DeleteContractButton({ contractId, label, variant = 'icon' }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handle() {
    const who = label ? `(${label})` : '';
    if (!confirm(
      `계약서${who}를 영구 삭제하시겠습니까?\n\n` +
      '• 계약서 row와 PDF 파일이 즉시 제거됩니다.\n' +
      '• 서명 완료 계약서도 삭제됩니다.\n' +
      '• 이 작업은 되돌릴 수 없습니다.'
    )) return;
    startTransition(async () => {
      const r = await deleteContract(contractId);
      if ('error' in r) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  if (variant === 'chip') {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="inline-flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        {pending ? '삭제 중…' : '계약서 영구 삭제'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-label="계약서 삭제"
      title="계약서 영구 삭제"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
    </button>
  );
}
