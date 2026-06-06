'use client';

import { useState, useTransition } from 'react';
import { appConfirm } from '@/components/ui/appDialog';
import { useRouter } from 'next/navigation';
import { cancelContract } from './actions';

/**
 * 발송 대기 중 계약서를 취소하는 버튼.
 * - 서명 완료된 계약은 표시되지 않아야 함 (부모에서 status 필터)
 * - 클릭 → confirm 다이얼로그 → 서버액션 호출 → 성공시 리스트 갱신
 */
export function CancelContractButton({
  contractId,
  inviteName,
}: {
  contractId: string;
  inviteName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const name = inviteName ?? '직원';
    if (!await appConfirm(`${name}님에게 보낸 계약서를 취소하시겠어요?\n\n· 서명 링크가 즉시 무효화되어 직원이 더 이상 서명할 수 없게 됩니다.\n· 취소된 계약은 복구할 수 없습니다.\n· 동일 직원에게 새로 계약을 보낼 수는 있습니다.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await cancelContract(contractId);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex h-7 cursor-pointer items-center rounded-md border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '취소 중...' : '발송 취소'}
      </button>
      {error && (
        <span className="ml-2 text-xs text-red-600">{error}</span>
      )}
    </>
  );
}
