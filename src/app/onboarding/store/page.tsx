'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { AddressSearch } from '@/components/ui/AddressSearch';

const INDUSTRIES = [
  { value: 'restaurant', label: '외식업 (음식점·카페)' },
  { value: 'retail', label: '소매업 (편의점·매장)' },
  { value: 'beauty', label: '미용·뷰티' },
  { value: 'service', label: '서비스업' },
  { value: 'other', label: '기타' },
];

export default function StoreOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [businessNo, setBusinessNo] = useState('');
  const [industry, setIndustry] = useState('restaurant');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [detail, setDetail] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(100);
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [target, setTarget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login');
      else setAuthChecked(true);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('stores')
      .insert({
        owner_id: user.id,
        name,
        business_no: businessNo || null,
        industry,
        address,
        postcode: postcode || null,
        detail_address: detail || null,
        lat,
        lng,
        radius_m: radius,
        open_time: openTime,
        close_time: closeTime,
        monthly_target: target ? Number(target.replaceAll(',', '')) : 0,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        확인 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-[#EAECF5] bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <Logo size="md" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-[#EAECF5] bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">매장 등록</h1>
          <p className="mt-2 text-sm text-slate-500">
            마지막 단계예요. 매장 정보를 입력하면 바로 시작할 수 있습니다.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              name="name"
              label="매장명 *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 리테일카페 동성로점"
            />

            <Input
              name="business_no"
              label="사업자등록번호 (선택)"
              value={businessNo}
              onChange={(e) => setBusinessNo(e.target.value)}
              placeholder="123-45-67890"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700">업종 *</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#E3E5F0] px-3 py-2 text-base focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
              >
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>

            <AddressSearch
              label="매장 주소"
              required
              value={address}
              postcode={postcode}
              onChange={(v) => {
                setAddress(v.address);
                setPostcode(v.postcode);
                if (v.lat != null && v.lng != null) {
                  setLat(v.lat);
                  setLng(v.lng);
                }
              }}
            />

            <Input
              name="detail"
              label="상세 주소 (선택)"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="1층 105호"
            />

            {/* 자동 변환된 좌표 미리보기 */}
            {lat != null && lng != null && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                ✓ 출퇴근 좌표 자동 등록: <span className="font-mono">{lat}, {lng}</span>
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="open_time"
                type="time"
                label="개점 시간"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />
              <Input
                name="close_time"
                type="time"
                label="마감 시간"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                출퇴근 인정 반경
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-16 text-right font-semibold text-indigo-600">{radius}m</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                매장 위치에서 이 반경 안에서만 직원이 출퇴근 체크인 가능
              </p>
            </div>

            <Input
              name="target"
              label="월 매출 목표 (선택)"
              inputMode="numeric"
              value={target}
              onChange={(e) => {
                const raw = e.target.value.replaceAll(',', '').replace(/\D/g, '');
                if (!raw) return setTarget('');
                setTarget(Number(raw).toLocaleString('ko-KR'));
              }}
              placeholder="30,000,000"
              hint="대시보드에서 진행률을 표시합니다"
            />

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? '등록 중...' : '매장 등록하고 시작하기'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
