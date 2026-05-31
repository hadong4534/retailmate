'use client';

import { useState, useTransition } from 'react';
import { MapPin, AlertTriangle, Check } from 'lucide-react';
import { gpsCheckIn, gpsCheckOut } from '@/app/(app)/attendance/actions';

interface Props {
  /** 현재 사용자가 진행 중인 출근 row가 있는지 (서버에서 계산해 전달) */
  hasOpenAttendance: boolean;
  /** 매장 좌표가 등록되어 있는지 */
  storeHasGps: boolean;
}

export function GpsCheckWidget({ hasOpenAttendance, storeHasGps }: Props) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | { kind: 'ok'; message: string }
    | { kind: 'error'; message: string }
    | null
  >(null);

  function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 기기에서는 위치 서비스를 사용할 수 없습니다.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          reject(
            err.code === err.PERMISSION_DENIED
              ? new Error('위치 권한을 허용해주세요. (주소창의 자물쇠 → 위치 허용)')
              : new Error('위치를 가져오지 못했습니다. GPS 신호가 약하거나 잠시 후 다시 시도해주세요.'),
          );
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });
  }

  async function handle(action: 'in' | 'out') {
    setResult(null);
    setBusy(true);
    try {
      const pos = await getPosition();
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      startTransition(async () => {
        const fn = action === 'in' ? gpsCheckIn : gpsCheckOut;
        const res = await fn({ lat, lng });
        if ('error' in res) {
          setResult({ kind: 'error', message: res.error });
        } else {
          setResult({
            kind: 'ok',
            message:
              action === 'in'
                ? `출근 완료 — 매장 ${res.distanceM}m 거리에서 인증되었습니다.`
                : `퇴근 완료 — 매장 ${res.distanceM}m 거리에서 인증되었습니다.`,
          });
        }
        setBusy(false);
      });
    } catch (e) {
      setResult({ kind: 'error', message: (e as Error).message });
      setBusy(false);
    }
  }

  if (!storeHasGps) {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2.2} />
        <div className="min-w-0">
          <p className="font-semibold">매장 위치가 미설정</p>
          <p className="mt-0.5 text-xs">
            <a href="/settings" className="underline">[설정 → 매장 정보]</a>에서 매장 주소를 먼저 등록해주세요.
          </p>
        </div>
      </div>
    );
  }

  const disabled = pending || busy;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-indigo-600" strokeWidth={2.2} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">출퇴근</p>
            <p className="mt-0.5 truncate text-xs text-slate-600">
              {hasOpenAttendance ? '근무 중이에요' : '매장에 도착했나요?'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {!hasOpenAttendance ? (
            <button
              type="button"
              onClick={() => handle('in')}
              disabled={disabled}
              className="min-w-[88px] rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? '확인 중…' : '출근'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handle('out')}
              disabled={disabled}
              className="min-w-[88px] rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? '확인 중…' : '퇴근'}
            </button>
          )}
        </div>
      </div>

      {result && (
        <div
          className={
            'mt-3 flex items-start gap-1.5 rounded-md px-3 py-2 text-xs ' +
            (result.kind === 'ok'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800')
          }
        >
          {result.kind === 'ok' ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.6} />
          ) : (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
          )}
          <span>{result.message}</span>
        </div>
      )}

      <p className="mt-2 text-[10px] text-slate-500">
        매장 반경 안에 있는지 GPS로 자동 확인합니다.
      </p>
    </div>
  );
}
