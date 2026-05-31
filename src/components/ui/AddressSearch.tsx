'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const POSTCODE_SCRIPT = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

interface DaumPostcodeResult {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
  bname: string;
  sido: string;
  sigungu: string;
}

interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeResult) => void;
  onclose?: (state: string) => void;
  width?: string | number;
  height?: string | number;
}

interface DaumPostcodeInstance {
  open: () => void;
  embed: (el: HTMLElement) => void;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: DaumPostcodeOptions) => DaumPostcodeInstance;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (typeof window === 'undefined') return Promise.reject(new Error('Window 객체 없음'));
  if (window.daum?.Postcode) return Promise.resolve();

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${POSTCODE_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('우편번호 스크립트 로드 실패')));
      return;
    }
    const s = document.createElement('script');
    s.src = POSTCODE_SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('우편번호 스크립트 로드 실패'));
    document.head.appendChild(s);
  });

  return scriptPromise;
}

async function geocodeKR(query: string): Promise<{ lat: number; lng: number } | null> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}` +
    `&countrycodes=kr&limit=1&accept-language=ko`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;
    return {
      lat: Number(Number(data[0].lat).toFixed(6)),
      lng: Number(Number(data[0].lon).toFixed(6)),
    };
  } catch {
    return null;
  }
}

export interface AddressValue {
  postcode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  label?: string;
  value: string;
  postcode?: string;
  onChange: (v: AddressValue) => void;
  required?: boolean;
  disabled?: boolean;
}

/**
 * 다음 우편번호(카카오) 검색 위젯.
 *
 * - 모바일에서 .open() 팝업이 차단되는 문제를 피하기 위해 .embed()를 인라인 모달에 마운트.
 * - 사용자가 [주소 검색] 클릭 → 화면 위에 fixed 모달 표시 → 다음 우편번호 위젯 embed.
 * - 검색·선택 완료 시 oncomplete 콜백 후 모달 자동 닫힘.
 */
export function AddressSearch({
  label = '주소',
  value,
  postcode,
  onChange,
  required,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const embedRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);

  // 최신 onChange 보존 (effect 안에서 호출 시 stale 방지)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleOpen = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await loadScript();
      if (!window.daum?.Postcode) throw new Error('우편번호 API 사용 불가');
      setOpen(true);
    } catch (e) {
      setError((e as Error).message ?? '우편번호 검색 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  // 모달 열릴 때 embed 마운트
  useEffect(() => {
    if (!open) return;
    if (!window.daum?.Postcode || !embedRef.current) return;

    embedRef.current.innerHTML = ''; // 재마운트 대비 초기화
    try {
      const postcodeWidget = new window.daum.Postcode({
        oncomplete: (data) => {
          const fullAddress = data.roadAddress || data.jibunAddress || data.address;

          onChangeRef.current({
            postcode: data.zonecode,
            address: fullAddress,
            roadAddress: data.roadAddress,
            jibunAddress: data.jibunAddress,
            sido: data.sido,
            sigungu: data.sigungu,
            lat: null,
            lng: null,
          });
          setOpen(false);

          // 좌표 변환 비동기
          setGeocoding(true);
          (async () => {
            const queries = [data.roadAddress, data.jibunAddress, fullAddress].filter(Boolean);
            let coords: { lat: number; lng: number } | null = null;
            for (const q of queries) {
              coords = await geocodeKR(q);
              if (coords) break;
            }
            setGeocoding(false);
            if (coords) {
              onChangeRef.current({
                postcode: data.zonecode,
                address: fullAddress,
                roadAddress: data.roadAddress,
                jibunAddress: data.jibunAddress,
                sido: data.sido,
                sigungu: data.sigungu,
                lat: coords.lat,
                lng: coords.lng,
              });
            }
          })();
        },
        width: '100%',
        height: '100%',
      });
      postcodeWidget.embed(embedRef.current);
    } catch (e) {
      setError((e as Error).message ?? '우편번호 위젯 로드 실패');
      setOpen(false);
    }
  }, [open]);

  // 모달 열려있을 때 body 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // prefetch
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.daum?.Postcode) {
      loadScript().catch(() => {});
    }
  }, []);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={postcode ?? ''}
          readOnly
          placeholder="우편번호"
          className="h-11 w-24 rounded-md border border-slate-300 bg-slate-50 px-3 text-center font-mono text-sm text-slate-700 placeholder:text-slate-300"
        />
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled || loading}
          className="h-11 shrink-0 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
        >
          {loading ? '여는 중…' : '주소 검색'}
        </button>
      </div>
      <input
        type="text"
        value={value}
        readOnly
        placeholder="주소 검색을 눌러 주소를 선택하세요"
        required={required}
        className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400"
      />
      {geocoding && <p className="mt-1 text-[11px] text-indigo-600">📍 좌표 확인 중…</p>}
      {error && <p className="mt-1 text-[11px] text-red-600">⚠ {error}</p>}

      {/* 인라인 모달 — 모바일/PC 모두에서 안정 */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="주소 검색"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">주소 검색</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 L6 18 M6 6 L18 18" />
                </svg>
              </button>
            </div>
            <div ref={embedRef} className="h-[460px] w-full sm:h-[520px]" />
          </div>
        </div>
      )}
    </div>
  );
}
