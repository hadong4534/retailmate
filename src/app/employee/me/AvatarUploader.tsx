'use client';

import { useRef, useState, useTransition } from 'react';
import { Camera, X } from 'lucide-react';
import { uploadAvatar, removeAvatar } from '@/app/(app)/settings/actions';

/** 직원 본인 프로필 사진 업로드/표시 — 설정의 서버 액션 재사용. */
export function AvatarUploader({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = name.charAt(0) || '?';

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('이미지 파일만 업로드할 수 있습니다.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('5MB 이하의 이미지만 업로드 가능합니다.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      start(async () => {
        setError(null);
        const r = await uploadAvatar({ dataUrl });
        if ('error' in r) { setError(r.error); return; }
        setUrl(dataUrl);
      });
    };
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    start(async () => {
      const r = await removeAvatar();
      if ('error' in r) setError(r.error); else setUrl(null);
    });
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-20 w-20 shrink-0">
        <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-white shadow-sm">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8E94F2] to-[#6366F1] text-2xl font-bold text-white">
              {initial}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          aria-label="프로필 사진 변경"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#6366F1] text-white shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <Camera className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
        {url && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            aria-label="프로필 사진 제거"
            className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-400 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <X className="h-3 w-3" strokeWidth={2.6} />
          </button>
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      {error && <p className="mt-2 max-w-[160px] text-center text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
