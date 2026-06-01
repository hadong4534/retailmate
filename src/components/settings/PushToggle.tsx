'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Send } from 'lucide-react';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** 이 기기에서 웹푸시 알림 받기 (PWA). VAPID 공개키 미설정 시 '준비 중'. */
export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && !!PUBLIC_KEY;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => null);
  }, []);

  async function enable() {
    setBusy(true); setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setMsg('브라우저에서 알림을 허용해주세요.'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY as string) as unknown as BufferSource,
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) { setMsg('구독 저장에 실패했어요. 잠시 후 다시 시도해주세요.'); return; }
      setSubscribed(true);
      setMsg('이 기기에서 알림을 받습니다.');
    } catch {
      setMsg('알림 설정 중 오류가 발생했어요.');
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), unsubscribe: true }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg('이 기기 알림을 껐어요.');
    } catch {
      setMsg('해제 중 오류가 발생했어요.');
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const j = await res.json().catch(() => null);
      setMsg(res.ok ? '테스트 알림을 보냈어요. 잠시 후 확인해보세요.' : (j?.error ?? '발송 실패'));
    } catch {
      setMsg('테스트 발송 중 오류가 발생했어요.');
    } finally { setBusy(false); }
  }

  if (!PUBLIC_KEY) {
    return (
      <div className="rounded-md border border-[#EAECF5] bg-slate-50 px-4 py-3 text-xs text-slate-500">
        기기 푸시 알림은 곧 제공됩니다. (서버 설정 준비 중)
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#E1E0F8] bg-[#F6F5FE] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            {subscribed ? <Bell className="h-4 w-4 text-[#6366F1]" /> : <BellOff className="h-4 w-4 text-slate-400" />}
            이 기기에서 알림 받기
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            홈 화면에 추가한 앱에서 매출 마감·공지 등 푸시 알림을 받아요.
          </p>
        </div>
        {!supported ? (
          <span className="shrink-0 text-[11px] text-slate-400">미지원 기기</span>
        ) : subscribed ? (
          <button type="button" onClick={disable} disabled={busy}
            className="shrink-0 rounded-lg border border-[#E3E5F0] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 disabled:opacity-50">
            끄기
          </button>
        ) : (
          <button type="button" onClick={enable} disabled={busy}
            className="shrink-0 rounded-lg bg-[#6366F1] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#5458E6] disabled:opacity-50">
            알림 켜기
          </button>
        )}
      </div>
      {subscribed && (
        <button type="button" onClick={test} disabled={busy}
          className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-[#5458E6] hover:underline disabled:opacity-50">
          <Send className="h-3 w-3" /> 테스트 알림 받기
        </button>
      )}
      {msg && <p className="mt-2 text-[11.5px] text-slate-600">{msg}</p>}
    </div>
  );
}
