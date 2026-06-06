'use client';

/**
 * 모바일 PWA(홈 화면 앱)에서 window.confirm / window.alert 가 조용히 무시되어
 * 삭제·퇴사·승진 등 확인이 필요한 버튼이 동작하지 않는 문제 대응.
 *
 * 프레임워크 독립적인 DOM 모달로 동일한 UX를 제공한다.
 *  - appConfirm(message): Promise<boolean>  — 확인/취소
 *  - appAlert(message):   Promise<void>     — 확인만
 *
 * 사용처에서는 `if (!await appConfirm('...')) return;` 형태로 쓴다.
 */

interface DialogButton {
  label: string;
  primary?: boolean;
  value: boolean;
}

function showDialog(message: string, buttons: DialogButton[]): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.45);' +
      'display:flex;align-items:center;justify-content:center;padding:24px;';

    const box = document.createElement('div');
    box.style.cssText =
      'background:#fff;border-radius:16px;max-width:340px;width:100%;padding:20px;' +
      'box-shadow:0 20px 50px -20px rgba(15,23,42,.45);font-family:inherit;';

    const msg = document.createElement('p');
    msg.style.cssText =
      'font-size:14px;line-height:1.65;color:#1f2937;white-space:pre-line;margin:0 0 16px;word-break:keep-all;';
    msg.textContent = message;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';

    buttons.forEach((b) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = b.label;
      btn.style.cssText = b.primary
        ? 'flex:1;background:#6366F1;color:#fff;border:0;border-radius:10px;padding:11px 14px;font-size:13px;font-weight:700;cursor:pointer;'
        : 'flex:1;background:#fff;color:#475569;border:1px solid #CBD5E1;border-radius:10px;padding:11px 14px;font-size:13px;font-weight:500;cursor:pointer;';
      btn.onclick = () => {
        overlay.remove();
        resolve(b.value);
      };
      row.appendChild(btn);
    });

    box.appendChild(msg);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

/** window.confirm 대체 — 확인 시 true. */
export function appConfirm(message: string): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);
  return showDialog(message, [
    { label: '취소', value: false },
    { label: '확인', primary: true, value: true },
  ]);
}

/** window.alert 대체. */
export function appAlert(message: string): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(true);
  return showDialog(message, [{ label: '확인', primary: true, value: true }]);
}
