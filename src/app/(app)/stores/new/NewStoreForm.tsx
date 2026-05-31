'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AddressSearch } from '@/components/ui/AddressSearch';
import { createStore } from './actions';

const INDUSTRIES = [
  { value: '', label: '선택 안 함' },
  { value: 'restaurant', label: '외식업 (음식점·카페)' },
  { value: 'retail', label: '소매업 (편의점·매장)' },
  { value: 'beauty', label: '미용·뷰티' },
  { value: 'service', label: '서비스업' },
  { value: 'other', label: '기타' },
];

export function NewStoreForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [businessNo, setBusinessNo] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [detail, setDetail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStore({
        name,
        industry,
        business_no: businessNo,
        address,
        postcode,
        detail_address: detail,
        // 월 매출 목표는 매장 등록 후 [설정 → 매장 정보]에서 별도 설정
        monthly_target: 0,
      });
      if (result && 'error' in result) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="매장명"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 마초스테이크 동성로점"
        maxLength={50}
        required
      />

      <div>
        <label className="block text-sm font-medium text-slate-700">업종</label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {INDUSTRIES.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>

      <Input
        label="사업자등록번호 (선택)"
        value={businessNo}
        onChange={(e) => setBusinessNo(e.target.value)}
        placeholder="000-00-00000"
        maxLength={15}
      />

      <AddressSearch
        label="매장 주소"
        required
        value={address}
        postcode={postcode}
        onChange={(v) => {
          setAddress(v.address);
          setPostcode(v.postcode);
        }}
      />

      <Input
        label="상세 주소 (선택)"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="예: 2층 201호"
        maxLength={50}
      />

      <div className="rounded-md bg-indigo-50 px-4 py-3 text-xs text-indigo-900">
        매장 등록 후 <strong>[설정 → 매장 정보]</strong>에서 월 매출 목표·GPS 좌표·영업 시간 등 세부 항목을 설정할 수 있습니다.
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => router.back()}
          disabled={pending}
        >
          취소
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-[2]"
          disabled={pending || !name || !address}
        >
          {pending ? '등록 중…' : '매장 추가'}
        </Button>
      </div>
    </form>
  );
}
