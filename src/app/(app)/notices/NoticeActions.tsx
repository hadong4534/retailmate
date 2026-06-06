'use client';

import { useTransition } from 'react';
import { appConfirm, appAlert } from '@/components/ui/appDialog';
import { deleteNotice } from './actions';

export function DeleteNoticeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  async function handleClick() {
    if (!await appConfirm('이 공지를 삭제하시겠습니까?')) return;
    startTransition(async () => {
      const result = await deleteNotice(id);
      if (result?.error) void appAlert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? '삭제 중…' : '삭제'}
    </button>
  );
}
