'use client';

import { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { AddressSearch } from '@/components/ui/AddressSearch';
import {
  updateStoreInfo,
  updateWageSettings,
  updateNotificationPrefs,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  changePassword,
} from './actions';

/** 사업자등록번호: 입력하는 동안 숫자만 추려 000-00-00000 마스크 적용. */
function formatBizNo(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
/** 형식 검증 — 10자리 숫자 (마스크 후 12자) */
function isValidBizNo(v: string): boolean {
  return /^\d{3}-\d{2}-\d{5}$/.test(v);
}

interface StoreData {
  id: string;
  name: string;
  business_no: string | null;
  business_name: string | null;
  industry: string | null;
  address: string;
  postcode: string | null;
  detail_address: string | null;
  lat: number | null;
  lng: number | null;
  radius_m: number | null;
  open_time: string | null;
  close_time: string | null;
  wage_calc_mode: string | null;
  weekly_holiday_default: boolean | null;
  pay_day_default: number | null;
  tax_filing_mode: string | null;
  monthly_target: number | null;
  updated_at: string;
}

interface ProfileData {
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface NotificationPrefs {
  expense_alert: boolean;
  attendance_alert: boolean;
  notice_alert: boolean;
  important_alert: boolean;
}

type Tab = 'store' | 'account' | 'notifications' | 'payroll' | 'security';

const TABS: { key: Tab; label: string }[] = [
  { key: 'store', label: '매장 정보' },
  { key: 'account', label: '계정 관리' },
  { key: 'notifications', label: '알림 설정' },
  { key: 'payroll', label: '급여/세금 설정' },
  { key: 'security', label: '보안' },
];

export function SettingsClient({
  store, profile, prefs,
}: {
  store: StoreData;
  profile: ProfileData;
  prefs: NotificationPrefs;
}) {
  const [tab, setTab] = useState<Tab>('store');
  const [savedAt, setSavedAt] = useState<Date>(new Date(store.updated_at));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_240px]">
      <aside className="rounded-xl border border-slate-200 bg-slate-900 p-2">
        <ul className="space-y-1">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={
                    'flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition ' +
                    (active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800')
                  }
                >
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="space-y-4">
        {tab === 'store' && (
          <StoreForm store={store} onSaved={(d) => setSavedAt(d)} />
        )}
        {tab === 'account' && (
          <AccountForm profile={profile} onSaved={(d) => setSavedAt(d)} />
        )}
        {tab === 'notifications' && (
          <NotificationForm prefs={prefs} onSaved={(d) => setSavedAt(d)} />
        )}
        {tab === 'payroll' && <PayrollForm store={store} onSaved={(d) => setSavedAt(d)} />}
        {tab === 'security' && <SecurityForm onSaved={(d) => setSavedAt(d)} />}
      </div>

      <aside className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">최근 저장 정보</h3>
          <div className="mt-3 flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">✓</span>
            <div className="text-xs">
              <p className="font-medium text-slate-700">모든 설정이 저장되었습니다.</p>
              <p className="mt-1 text-slate-400">최근 저장 시간</p>
              <p className="mt-0.5 font-mono text-slate-600">
                {savedAt.toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">연동 상태</h3>
          <ul className="mt-3 space-y-2 text-xs">
            <ConnectStatus label="카드사" status="준비 중" />
            <ConnectStatus label="배달앱" status="준비 중" />
            <ConnectStatus label="세무 연동" status="준비 중" />
          </ul>
        </div>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 매장 정보 (주소 검색 + GPS 좌표)
// ─────────────────────────────────────────────────────────────────────────────
function StoreForm({ store, onSaved }: { store: StoreData; onSaved: (d: Date) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(store.name);
  const [businessNo, setBusinessNo] = useState(store.business_no ?? '');
  const [businessName, setBusinessName] = useState(store.business_name ?? '');
  const [industry, setIndustry] = useState(store.industry ?? '');
  const [address, setAddress] = useState(store.address);
  const [postcode, setPostcode] = useState(store.postcode ?? '');
  const [detailAddress, setDetailAddress] = useState(store.detail_address ?? '');
  const [lat, setLat] = useState<number | null>(store.lat);
  const [lng, setLng] = useState<number | null>(store.lng);
  const [radius, setRadius] = useState(store.radius_m ?? 100);
  const [openTime, setOpenTime] = useState(store.open_time?.slice(0, 5) ?? '');
  const [closeTime, setCloseTime] = useState(store.close_time?.slice(0, 5) ?? '');
  const [monthlyTarget, setMonthlyTarget] = useState<number>(store.monthly_target ?? 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateStoreInfo({
        name,
        business_no: businessNo,
        business_name: businessName,
        industry,
        address,
        postcode,
        detail_address: detailAddress,
        lat,
        lng,
        radius_m: radius,
        open_time: openTime,
        close_time: closeTime,
        monthly_target: monthlyTarget,
      });
      if ('error' in result) setError(result.error);
      else {
        onSaved(new Date());
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        
        <div>
          <h2 className="text-base font-bold text-slate-900">매장 정보</h2>
          <p className="text-xs text-slate-500">매장 기본 정보 + GPS 출퇴근 좌표를 관리합니다.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input label="매장명 *" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />
        <Input
          label="사업자등록번호"
          value={businessNo}
          onChange={(e) => setBusinessNo(formatBizNo(e.target.value))}
          placeholder="000-00-00000"
          maxLength={12}
          inputMode="numeric"
          hint={businessNo && !isValidBizNo(businessNo) ? '10자리 숫자를 입력하세요 (000-00-00000)' : undefined}
        />
        <Input label="사업자명" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={50} />
        <div>
          <label className="block text-sm font-medium text-slate-700">업종</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">선택 안 함</option>
            <option value="restaurant">외식업</option>
            <option value="retail">소매업</option>
            <option value="beauty">미용·뷰티</option>
            <option value="service">서비스업</option>
            <option value="other">기타</option>
          </select>
        </div>

        <div className="md:col-span-2">
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
        </div>

        <Input
          label="상세 주소"
          value={detailAddress}
          onChange={(e) => setDetailAddress(e.target.value)}
          maxLength={50}
          className="md:col-span-2"
        />

        {/* 출퇴근 좌표 + 반경 */}
        <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
          <p className="text-sm font-medium text-slate-800">📍 출퇴근 좌표</p>
          <p className="mt-0.5 text-xs text-slate-500">
            위 주소를 기준으로 자동 등록됩니다. 직원 출퇴근 인증에 사용돼요.
          </p>
          {lat != null && lng != null ? (
            <p className="mt-2 font-mono text-[11px] text-emerald-700">
              ✓ 등록됨: {lat}, {lng}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-amber-700">
              ⚠ 좌표 미설정 — 주소 검색을 다시 시도해주세요. 검색 후에도 좌표가 잡히지 않으면 더 구체적인 주소(도로명+번지)를 입력해보세요.
            </p>
          )}
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-700">출퇴근 인정 반경</label>
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
              <span className="w-16 text-right font-semibold text-blue-600">{radius}m</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              매장 위치에서 이 반경 안에서만 직원이 출퇴근 가능합니다.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">영업 시작</label>
          <input
            type="time"
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">영업 종료</label>
          <input
            type="time"
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* 월 매출 목표 */}
        <div className="md:col-span-2">
          <MoneyInput
            label="월 매출 목표 (선택)"
            value={monthlyTarget}
            onChange={setMonthlyTarget}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            대시보드에서 월 목표 진행률(%)을 표시합니다. 0원으로 두면 목표 미설정으로 처리됩니다.
          </p>
        </div>
      </div>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">⚠ {error}</p>}
      {success && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ 저장되었습니다.</p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? '저장 중…' : '저장하기'}
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 계정 관리 (사진 업로드 + 이름·전화 수정)
// ─────────────────────────────────────────────────────────────────────────────
function AccountForm({ profile, onSaved }: { profile: ProfileData; onSaved: (d: Date) => void }) {
  const [pending, startTransition] = useTransition();
  const [photoPending, startPhoto] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateProfile({ name, phone });
      if ('error' in result) setError(result.error);
      else {
        onSaved(new Date());
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('5MB 이하의 이미지만 업로드 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      startPhoto(async () => {
        setError(null);
        const result = await uploadAvatar({ dataUrl });
        if ('error' in result) {
          setError(result.error);
          return;
        }
        // 즉시 미리보기로 dataURL 사용 (signed/public URL은 다음 새로고침에 반영)
        setAvatarUrl(dataUrl);
        onSaved(new Date());
      });
    };
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    if (!confirm('프로필 사진을 제거하시겠어요?')) return;
    startPhoto(async () => {
      const result = await removeAvatar();
      if ('error' in result) setError(result.error);
      else {
        setAvatarUrl(null);
        onSaved(new Date());
      }
    });
  }

  const initial = name.charAt(0) || profile.email.charAt(0) || '?';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        
        <div>
          <h2 className="text-base font-bold text-slate-900">계정 관리</h2>
          <p className="text-xs text-slate-500">프로필 사진과 기본 정보를 관리합니다.</p>
        </div>
      </div>

      {/* 사진 영역 */}
      <div className="mt-5 flex items-center gap-5 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-violet-500 text-2xl font-bold text-white">
              {initial}
            </div>
          )}
          {photoPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">프로필 사진</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            사이드바·챗봇·드라이브 등 모든 화면에 반영됩니다. (PNG·JPG·WEBP, 5MB 이하)
          </p>
          <div className="mt-2 flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoPending}
              className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {avatarUrl ? '변경' : '+ 사진 업로드'}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={photoPending}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                제거
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          required
        />
        <Input label="이메일" value={profile.email} disabled hint="이메일은 보안상 변경할 수 없습니다." />
        <PhoneInput
          label="휴대폰"
          value={phone}
          onChange={setPhone}
          className="md:col-span-2"
        />
      </div>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">⚠ {error}</p>}
      {success && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ 저장되었습니다.</p>
      )}

      <div className="mt-5 flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? '저장 중…' : '저장하기'}
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 알림 설정
// ─────────────────────────────────────────────────────────────────────────────
function NotificationForm({ prefs, onSaved }: { prefs: NotificationPrefs; onSaved: (d: Date) => void }) {
  const [pending, startTransition] = useTransition();
  const [expense, setExpense] = useState(prefs.expense_alert);
  const [attendance, setAttendance] = useState(prefs.attendance_alert);
  const [notice, setNotice] = useState(prefs.notice_alert);
  const [important, setImportant] = useState(prefs.important_alert);
  const [error, setError] = useState<string | null>(null);

  function save(updater: () => void) {
    updater();
    setError(null);
    startTransition(async () => {
      const result = await updateNotificationPrefs({
        expense_alert: expense,
        attendance_alert: attendance,
        notice_alert: notice,
        important_alert: important,
      });
      if ('error' in result) setError(result.error);
      else onSaved(new Date());
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        
        <div>
          <h2 className="text-base font-bold text-slate-900">알림 설정</h2>
          <p className="text-xs text-slate-500">중요한 알림을 놓치지 않도록 설정하세요.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Toggle label="비용 미입력 알림" desc="비용 미입력 항목 알림" checked={expense} onChange={(v) => save(() => setExpense(v))} pending={pending} />
        <Toggle label="직원 출퇴근 알림" desc="직원 출퇴근 현황 알림" checked={attendance} onChange={(v) => save(() => setAttendance(v))} pending={pending} />
        <Toggle label="공지 알림" desc="공지사항 및 업데이트 알림" checked={notice} onChange={(v) => save(() => setNotice(v))} pending={pending} />
        <Toggle label="중요 알림" desc="긴급 보안·계정 관련" checked={important} onChange={(v) => save(() => setImportant(v))} pending={pending} />
      </div>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function Toggle({
  label, desc, checked, onChange, pending,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={pending}
        className={
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ' +
          (checked ? 'bg-blue-600' : 'bg-slate-300')
        }
        aria-pressed={checked}
      >
        <span
          className={
            'inline-block h-4 w-4 transform rounded-full bg-white transition ' +
            (checked ? 'translate-x-6' : 'translate-x-1')
          }
        />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 급여/세금 설정
// ─────────────────────────────────────────────────────────────────────────────
function PayrollForm({ store, onSaved }: { store: StoreData; onSaved: (d: Date) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'hourly' | 'monthly'>(
    (store.wage_calc_mode as 'hourly' | 'monthly') ?? 'hourly',
  );
  const [weekly, setWeekly] = useState(store.weekly_holiday_default ?? true);
  const [payDay, setPayDay] = useState(store.pay_day_default ?? 25);
  const [taxMode, setTaxMode] = useState<'simple' | 'general'>(
    (store.tax_filing_mode as 'simple' | 'general') ?? 'simple',
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateWageSettings({
        wage_calc_mode: mode,
        weekly_holiday_default: weekly,
        pay_day_default: payDay,
        tax_filing_mode: taxMode,
      });
      if ('error' in result) setError(result.error);
      else onSaved(new Date());
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        
        <div>
          <h2 className="text-base font-bold text-slate-900">급여/세금 설정</h2>
          <p className="text-xs text-slate-500">급여 계산 및 세금 관련 설정을 관리하세요.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">시급 계산 기준</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'hourly' | 'monthly')}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="hourly">기본 시급</option>
            <option value="monthly">월급제</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">주휴수당 반영</label>
          <select
            value={weekly ? '1' : '0'}
            onChange={(e) => setWeekly(e.target.value === '1')}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="1">반영함</option>
            <option value="0">반영 안 함</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">급여일</label>
          <select
            value={payDay}
            onChange={(e) => setPayDay(Number(e.target.value))}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {Array.from({ length: 31 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>매월 {i + 1}일</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">세금 신고 방식</label>
          <select
            value={taxMode}
            onChange={(e) => setTaxMode(e.target.value as 'simple' | 'general')}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="simple">간편장부 기준</option>
            <option value="general">복식부기 기준</option>
          </select>
        </div>
      </div>

      <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-900">
        ⓘ 급여 및 세금 정보는 근태 및 급여 계산, 세무 리포트에 반영됩니다.
      </p>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? '저장 중…' : '저장하기'}
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 보안 (비밀번호 변경)
// ─────────────────────────────────────────────────────────────────────────────
function SecurityForm({ onSaved }: { onSaved: (d: Date) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (next !== confirm) {
      setError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    startTransition(async () => {
      const result = await changePassword({ currentPassword: current, newPassword: next });
      if ('error' in result) setError(result.error);
      else {
        setCurrent(''); setNext(''); setConfirm('');
        setSuccess(true);
        onSaved(new Date());
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          
          <div>
            <h2 className="text-base font-bold text-slate-900">비밀번호 변경</h2>
            <p className="text-xs text-slate-500">정기적으로 비밀번호를 변경하면 보안이 강화됩니다.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <Input
            type="password"
            label="현재 비밀번호"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Input
            type="password"
            label="새 비밀번호 (8자 이상)"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Input
            type="password"
            label="새 비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">⚠ {error}</p>}
        {success && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            ✓ 비밀번호가 변경되었습니다.
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <Button type="submit" size="sm" disabled={pending || !current || next.length < 8}>
            {pending ? '변경 중…' : '비밀번호 변경'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ConnectStatus({ label, status }: { label: string; status: string }) {
  return (
    <li className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{status}</span>
    </li>
  );
}
