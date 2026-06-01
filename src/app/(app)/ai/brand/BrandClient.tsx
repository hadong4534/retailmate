'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { updateBrandSettings, uploadLogo, removeLogo } from './actions';

interface Props {
  initial: {
    brand_color: string;
    brand_slogan: string;
    brand_description: string;
    logoUrl: string | null;
    storeName: string;
    industry: string | null;
  };
}

export function BrandClient({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploadPending, setUploadPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [description, setDescription] = useState(initial.brand_description || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateBrandSettings({
        brand_color: initial.brand_color,
        brand_slogan: '',
        brand_description: description,
      });
      if ('error' in result && result.error) setError(result.error);
      else setSuccess('저장되었습니다.');
    });
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadPending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);
      const result = await uploadLogo(formData);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      setSuccess('로고가 업로드되었습니다.');
    } finally {
      setUploadPending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    if (!confirm('매장 로고를 삭제하시겠습니까?')) return;
    setUploadPending(true);
    setError(null);
    try {
      const result = await removeLogo();
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      setSuccess('로고가 삭제되었습니다.');
    } finally {
      setUploadPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* 로고 영역 */}
      <section className="rounded-xl border border-[#EAECF5] bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">매장 로고</h2>

        <div className="mt-3">
          {initial.logoUrl ? (
            <div className="rounded-lg border border-[#EAECF5] bg-slate-50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={initial.logoUrl}
                alt="매장 로고"
                className="mx-auto max-h-44 max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-[#E3E5F0] bg-slate-50 text-xs text-slate-400">
              로고 미등록
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoChange}
            className="hidden"
          />

          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadPending}
            >
              {uploadPending ? '업로드 중…' : initial.logoUrl ? '변경' : '로고 업로드'}
            </Button>
            {initial.logoUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemoveLogo}
                disabled={uploadPending}
              >
                삭제
              </Button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            PNG·JPG·WEBP · 5MB 이하 · 정사각/투명 권장
          </p>
        </div>
      </section>

      {/* 매장 프롬프트 */}
      <section className="rounded-xl border border-[#EAECF5] bg-white p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">AI에게 알려줄 매장 정보</h2>
            <p className="mt-1 text-xs text-slate-500">
              매장의 분위기·메뉴·타겟·톤을 자유롭게 적어주세요. AI가 포스터/SNS를 만들 때 기억하고 활용합니다.
            </p>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
            maxLength={1000}
            placeholder={`예시:
- 30년 전통 한우 전문점
- 따뜻한 가족 모임에 어울리는 분위기
- 1++ 한우와 제철 채소 사용
- "정성을 담은 한끼" — 손님에게 항상 이 마음으로
- 메인 컬러는 차분한 블랙·골드 톤
- 30~50대 가족 단위 손님 위주`}
            className="w-full rounded-md border border-[#E3E5F0] px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          />

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              {initial.storeName}
              {initial.industry && ` · ${initial.industry}`}
              {' · '}
              매장명·업종은 [설정]에서 자동으로 가져옵니다
            </p>
            <span className="text-[10px] text-slate-400">{description.length} / 1000</span>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? '저장 중…' : '저장하기'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
