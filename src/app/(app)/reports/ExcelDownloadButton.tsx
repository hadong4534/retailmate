'use client';

import { useState } from 'react';
import { appAlert } from '@/components/ui/appDialog';
import { Button } from '@/components/ui/Button';

export function ExcelDownloadButton({ month }: { month: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/excel?month=${month}`);
      if (!res.ok) { void appAlert('엑셀 생성에 실패했어요. 잠시 후 다시 시도해주세요.'); return; }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      let name = `리테일메이트_${month}.xlsx`;
      const m = cd.match(/filename\*=UTF-8''([^;]+)/);
      if (m) { try { name = decodeURIComponent(m[1]); } catch { /* keep default */ } }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      void appAlert('엑셀 다운로드 중 오류가 발생했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={download} disabled={busy}>
      {busy ? '생성 중…' : '엑셀 다운로드'}
    </Button>
  );
}
