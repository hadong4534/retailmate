'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardCopy, Check, MessageSquare, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { todayInKST, formatWon } from '@/lib/utils';
import {
  createContract,
  type ContractFormData,
  type WeekDay,
} from '../actions';

const DAYS: { key: WeekDay; label: string }[] = [
  { key: 'mon', label: '월' },
  { key: 'tue', label: '화' },
  { key: 'wed', label: '수' },
  { key: 'thu', label: '목' },
  { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
  { key: 'sun', label: '일' },
];

const WEEKDAY_LABEL: Record<WeekDay, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};

const initial: ContractFormData = {
  invite_name: '',
  invite_phone: '',
  contract_type: 'parttime',
  work_start_date: todayInKST(),
  work_end_date: null,
  workplace_address: '',
  job_description: '',
  work_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  work_start_time: '09:00',
  work_end_time: '18:00',
  break_minutes: 60,
  wage_type: 'hourly',
  wage_amount: 0,
  weekly_holiday_allowance: true,
  social_insurance: {
    national_pension: true,
    health_insurance: true,
    employment_insurance: true,
    industrial_accident: true,
  },
  pay_day: 10,
  pay_method: '계좌이체',
  annual_leave_policy: '',
  additional_terms: '',
};

export function ContractWizard({
  defaultWorkplaceAddress,
  initialContractType,
}: {
  defaultWorkplaceAddress: string;
  initialContractType?: 'fulltime' | 'parttime' | 'daily';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [data, setData] = useState<ContractFormData>({
    ...initial,
    contract_type: initialContractType ?? initial.contract_type,
    workplace_address: defaultWorkplaceAddress,
    // 정규직은 기본적으로 기간 종료일 없음, 4대보험 모두 가입
    // 단시간/계약직은 4대보험 기본 OFF
    social_insurance: {
      national_pension: initialContractType === 'fulltime',
      health_insurance: initialContractType === 'fulltime',
      employment_insurance: initialContractType === 'fulltime',
      industrial_accident: true, // 산재는 모든 근로자 의무
    },
    wage_type: initialContractType === 'fulltime' ? 'monthly'
      : initialContractType === 'daily' ? 'monthly'
      : 'hourly',
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{
    contractId: string;
    signToken: string;
    expiresAt: string | null;
  } | null>(null);

  function update<K extends keyof ContractFormData>(key: K, value: ContractFormData[K]) {
    setData((d) => {
      const next = { ...d, [key]: value } as ContractFormData;
      if (key === 'contract_type') {
        const t = value as 'fulltime' | 'parttime' | 'daily';
        // 고용형태별 합리적 기본값 자동조정
        next.wage_type = t === 'parttime' ? 'hourly' : 'monthly';
        next.social_insurance = {
          national_pension: t === 'fulltime',
          health_insurance: t === 'fulltime',
          employment_insurance: t === 'fulltime',
          industrial_accident: true, // 산재는 전 근로자 의무
        };
        if (t === 'fulltime') next.work_end_date = null; // 정규직은 기간 없음
      }
      return next;
    });
  }

  function toggleDay(d: WeekDay) {
    setData((s) => ({
      ...s,
      work_days: s.work_days.includes(d)
        ? s.work_days.filter((x) => x !== d)
        : [...s.work_days, d],
    }));
  }

  function validateStep(s: 1 | 2 | 3): string | null {
    if (s === 1) {
      if (!data.invite_name.trim()) return '직원 이름을 입력해주세요.';
      if (!data.invite_phone.trim()) return '직원 휴대폰 번호를 입력해주세요.';
      if (!data.work_start_date) return '근로 시작일을 선택해주세요.';
      if (!data.workplace_address.trim()) return '근무 장소를 입력해주세요.';
      if (!data.job_description.trim()) return '담당 업무를 입력해주세요.';
      if (data.contract_type === 'daily' && !data.work_end_date) return '계약직(기간제)은 근로 종료일을 입력해주세요.';
    }
    if (s === 2) {
      if (data.work_days.length === 0) return '근무 요일을 1개 이상 선택해주세요.';
      if (!data.work_start_time || !data.work_end_time) return '근무 시간을 입력해주세요.';
    }
    if (s === 3) {
      if (data.wage_amount <= 0) return '임금 금액을 입력해주세요.';
      if (data.pay_day < 1 || data.pay_day > 31) return '임금 지급일을 확인해주세요.';
    }
    return null;
  }

  function next() {
    setError(null);
    if (step < 4) {
      const err = validateStep(step as 1 | 2 | 3);
      if (err) {
        setError(err);
        return;
      }
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    }
  }

  function prev() {
    setError(null);
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
  }

  function handleSubmit() {
    setError(null);
    if (!signature) {
      setError('사장님 서명을 입력해주세요.');
      return;
    }
    startTransition(async () => {
      const result = await createContract(data, signature);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.contractId && result.signToken) {
        setIssued({
          contractId: result.contractId,
          signToken: result.signToken,
          expiresAt: result.expiresAt ?? null,
        });
      }
    });
  }

  if (issued) {
    return (
      <IssuedCard
        contractId={issued.contractId}
        signToken={issued.signToken}
        expiresAt={issued.expiresAt}
        employeeName={data.invite_name}
        onDone={() => router.push('/contracts')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Stepper current={step} />

      {step === 1 && <Step1 data={data} update={update} />}
      {step === 2 && (
        <Step2 data={data} update={update} toggleDay={toggleDay} />
      )}
      {step === 3 && <Step3 data={data} update={update} />}
      {step === 4 && (
        <Step4
          data={data}
          signature={signature}
          onSignatureChange={setSignature}
        />
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={step === 1 ? () => router.back() : prev}
          disabled={pending}
        >
          {step === 1 ? '취소' : '이전'}
        </Button>
        {step < 4 ? (
          <Button type="button" size="lg" className="flex-[2]" onClick={next}>
            다음 →
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="flex-[2]"
            onClick={handleSubmit}
            disabled={pending || !signature}
          >
            {pending ? '발급 중…' : '서명 후 직원 링크 발급'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  const labels = ['기본 정보', '근무 시간', '임금', '미리보기·서명'];
  return (
    <div>
      <ol className="flex items-center gap-1 text-xs">
        {labels.map((label, i) => {
          const idx = i + 1;
          const active = idx === current;
          const done = idx < current;
          return (
            <li
              key={label}
              className={
                'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-2 sm:gap-2 sm:px-3 ' +
                (active
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-[#EAECF5] bg-white text-slate-500')
              }
            >
              <span className={
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ' +
                (active
                  ? 'bg-[#7177EE] text-white'
                  : done
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600')
              }>
                {done ? '✓' : idx}
              </span>
              {/* 모바일은 active만 라벨 표시(공간 절약), PC는 모든 라벨 표시 */}
              <span className={active ? 'truncate text-[11px] font-semibold sm:text-xs' : 'hidden sm:inline'}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {/* 모바일 추가 안내 — 현재 step의 풀 라벨 */}
      <p className="mt-2 text-center text-[12px] font-medium text-slate-600 sm:hidden">
        Step {current} · {labels[current - 1]}
      </p>
    </div>
  );
}

function Step1({
  data,
  update,
}: {
  data: ContractFormData;
  update: <K extends keyof ContractFormData>(key: K, value: ContractFormData[K]) => void;
}) {
  return (
    <div className="space-y-5 rounded-xl border border-[#EAECF5] bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">Step 1 · 기본 정보</h2>

      <TypeBanner type={data.contract_type} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="직원 이름"
          value={data.invite_name}
          onChange={(e) => update('invite_name', e.target.value)}
          placeholder="박직원"
          maxLength={20}
        />
        <PhoneInput
          label="휴대폰"
          value={data.invite_phone}
          onChange={(v) => update('invite_phone', v)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">계약 형태</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([
            ['fulltime', '정규직'],
            ['parttime', '단시간'],
            ['daily', '계약직'],
          ] as const).map(([v, l]) => {
            const active = data.contract_type === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => update('contract_type', v)}
                className={
                  'rounded-md border px-3 py-2 text-sm font-medium transition ' +
                  (active
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-[#EAECF5] bg-white text-slate-700 hover:bg-slate-50')
                }
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">📅 근로 시작일</label>
          <input
            type="date"
            value={data.work_start_date}
            onChange={(e) => update('work_start_date', e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            📅 근로 종료일{' '}
            {data.contract_type === 'daily'
              ? <span className="text-xs font-semibold text-[#5961E6]">(계약직 필수)</span>
              : <span className="text-xs text-slate-400">(정규직은 비워두기)</span>}
          </label>
          <input
            type="date"
            value={data.work_end_date ?? ''}
            min={data.work_start_date}
            onChange={(e) => update('work_end_date', e.target.value || null)}
            className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          />
        </div>
      </div>

      <Input
        label="근무 장소"
        value={data.workplace_address}
        onChange={(e) => update('workplace_address', e.target.value)}
        hint="기본값은 매장 주소입니다."
        maxLength={100}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700">💼 담당 업무</label>
        <textarea
          value={data.job_description}
          onChange={(e) => update('job_description', e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="홀 서빙, 매장 정리, 음료 제조 등"
          className="mt-1 w-full rounded-md border border-[#E3E5F0] px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
        />
      </div>
    </div>
  );
}

function Step2({
  data,
  update,
  toggleDay,
}: {
  data: ContractFormData;
  update: <K extends keyof ContractFormData>(key: K, value: ContractFormData[K]) => void;
  toggleDay: (d: WeekDay) => void;
}) {
  return (
    <div className="space-y-5 rounded-xl border border-[#EAECF5] bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">Step 2 · 근무 시간</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700">📅 근무 요일</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const active = data.work_days.includes(d.key);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => toggleDay(d.key)}
                className={
                  'h-10 w-10 rounded-md border text-sm font-semibold transition ' +
                  (active
                    ? 'border-indigo-400 bg-[#7177EE] text-white'
                    : 'border-[#EAECF5] bg-white text-slate-600 hover:bg-slate-50')
                }
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">⏰ 시작 시간</label>
          <input
            type="time"
            value={data.work_start_time}
            onChange={(e) => update('work_start_time', e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">⏰ 종료 시간</label>
          <input
            type="time"
            value={data.work_end_time}
            onChange={(e) => update('work_end_time', e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">☕ 휴게 시간 (분)</label>
          <input
            type="number"
            min={0}
            max={480}
            inputMode="numeric"
            value={data.break_minutes}
            onChange={(e) => update('break_minutes', Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          />
        </div>
      </div>
    </div>
  );
}

function Step3({
  data,
  update,
}: {
  data: ContractFormData;
  update: <K extends keyof ContractFormData>(key: K, value: ContractFormData[K]) => void;
}) {
  function toggleInsurance(key: keyof ContractFormData['social_insurance']) {
    update('social_insurance', {
      ...data.social_insurance,
      [key]: !data.social_insurance[key],
    });
  }

  return (
    <div className="space-y-5 rounded-xl border border-[#EAECF5] bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">Step 3 · 임금</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700">💰 임금 형태</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([
            ['hourly', '시급'],
            ['monthly', '월급'],
            ['daily', '일급'],
          ] as const).map(([v, l]) => {
            const active = data.wage_type === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => update('wage_type', v)}
                className={
                  'rounded-md border px-3 py-2 text-sm font-medium transition ' +
                  (active
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-[#EAECF5] bg-white text-slate-700 hover:bg-slate-50')
                }
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <MoneyInput
        label="금액"
        value={data.wage_amount}
        onChange={(n) => update('wage_amount', n)}
        size="lg"
      />
      {data.wage_type === 'hourly' && data.wage_amount > 0 && data.wage_amount < 10320 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          2026년 최저시급(10,320원) 미만이에요. 금액을 확인해주세요.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={data.weekly_holiday_allowance}
          onChange={(e) => update('weekly_holiday_allowance', e.target.checked)}
          className="h-4 w-4"
        />
        주휴수당 포함
      </label>

      <div>
        <label className="block text-sm font-medium text-slate-700">🛡 4대보험 가입</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([
            ['national_pension', '국민연금'],
            ['health_insurance', '건강보험'],
            ['employment_insurance', '고용보험'],
            ['industrial_accident', '산재보험'],
          ] as const).map(([k, l]) => (
            <label
              key={k}
              className="flex items-center gap-2 rounded-md border border-[#EAECF5] bg-white px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={data.social_insurance[k]}
                onChange={() => toggleInsurance(k)}
                className="h-4 w-4"
              />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">임금 지급일 (매월)</label>
          <input
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            // value가 0이면 빈 칸 표시 — 사용자가 1을 지우고 새 숫자(2~9 등)를 자유롭게 입력할 수 있게 한다.
            value={data.pay_day === 0 ? '' : data.pay_day}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                update('pay_day', 0); // 빈 상태 일시 허용 — 다음 step 진입 시 검증 (line 121)
                return;
              }
              const n = Number(v);
              if (Number.isNaN(n)) return;
              // 입력 중에는 31 상한만 적용. 1 강제는 onBlur에서.
              update('pay_day', Math.min(31, n));
            }}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (!n || n < 1) update('pay_day', 1);
              else if (n > 31) update('pay_day', 31);
            }}
            className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
          />
        </div>
        <Input
          label="지급 방법"
          value={data.pay_method}
          onChange={(e) => update('pay_method', e.target.value)}
          maxLength={30}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          🏖 연차 정책 <span className="text-xs text-slate-400">(선택)</span>
        </label>
        <textarea
          value={data.annual_leave_policy}
          onChange={(e) => update('annual_leave_policy', e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="근로기준법에 따라 부여"
          className="mt-1 w-full rounded-md border border-[#E3E5F0] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          부가 조항 <span className="text-xs text-slate-400">(선택)</span>
        </label>
        <textarea
          value={data.additional_terms}
          onChange={(e) => update('additional_terms', e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="복리후생, 비밀유지 등"
          className="mt-1 w-full rounded-md border border-[#E3E5F0] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
        />
      </div>
    </div>
  );
}

function Step4({
  data,
  signature,
  onSignatureChange,
}: {
  data: ContractFormData;
  signature: string | null;
  onSignatureChange: (s: string | null) => void;
}) {
  const wageLabel = data.wage_type === 'hourly' ? '시급' : data.wage_type === 'monthly' ? '월급' : '일급';
  const typeLabel = data.contract_type === 'fulltime' ? '정규직' : data.contract_type === 'parttime' ? '단시간' : '계약직';
  const insuranceList = useMemo(() => {
    const map = {
      national_pension: '국민연금',
      health_insurance: '건강보험',
      employment_insurance: '고용보험',
      industrial_accident: '산재보험',
    } as const;
    return Object.entries(data.social_insurance)
      .filter(([, v]) => v)
      .map(([k]) => map[k as keyof typeof map]);
  }, [data.social_insurance]);

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-[#EAECF5] bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Step 4 · 미리보기</h2>

        <Row label="직원" value={`${data.invite_name} (${data.invite_phone})`} />
        <Row label="계약 형태" value={typeLabel} />
        <Row
          label="근로 기간"
          value={
            data.work_end_date
              ? `${data.work_start_date} ~ ${data.work_end_date}`
              : `${data.work_start_date} ~ (정규)`
          }
        />
        <Row label="근무 장소" value={data.workplace_address} />
        <Row label="담당 업무" value={data.job_description} />
        <Row
          label="근무 요일"
          value={data.work_days.map((d) => WEEKDAY_LABEL[d]).join(', ')}
        />
        <Row
          label="근무 시간"
          value={`${data.work_start_time} ~ ${data.work_end_time} (휴게 ${data.break_minutes}분)`}
        />
        <Row label={wageLabel} value={formatWon(data.wage_amount)} />
        <Row
          label="주휴수당"
          value={data.weekly_holiday_allowance ? '포함' : '미포함'}
        />
        <Row label="4대보험" value={insuranceList.join(', ') || '미가입'} />
        <Row
          label="임금 지급"
          value={`매월 ${data.pay_day}일 · ${data.pay_method}`}
        />
        {data.annual_leave_policy && <Row label="연차" value={data.annual_leave_policy} />}
        {data.additional_terms && <Row label="부가 조항" value={data.additional_terms} />}
      </div>

      <div className="rounded-xl border border-[#EAECF5] bg-white p-5">
        <h3 className="text-base font-semibold text-slate-900">사장 서명</h3>
        <p className="mt-1 text-xs text-slate-500">
          마우스 또는 손가락으로 서명해주세요. 서명 완료 후 직원에게 보낼 링크가 발급됩니다.
        </p>
        <div className="mt-3">
          <SignaturePad onChange={onSignatureChange} />
        </div>
      </div>

      <p className="rounded-md bg-amber-50 px-4 py-3 text-xs text-amber-900">
        ⚠ 표준 양식 기반의 자동 작성본입니다. 실제 운영 전 노무사 검토를 권장합니다.
        발급된 링크는 시간 제한 없이 유효하며, 직원이 가입 + 서명을 완료하면 자동으로 직원으로 등록됩니다.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2 border-b border-slate-100 py-1.5 last:border-b-0">
      <span className="w-24 shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-900">{value}</span>
    </div>
  );
}

function IssuedCard({
  contractId,
  signToken,
  expiresAt,
  employeeName,
  onDone,
}: {
  contractId: string;
  signToken: string;
  expiresAt: string | null;
  employeeName: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/contracts/${signToken}/sign`;
  }, [signToken]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 링크를 복사하세요', url);
    }
  }

  // 만료일은 null일 때 무기한.
  const expires = expiresAt ? new Date(expiresAt) : null;
  const expiresStr = expires ? `${expires.getMonth() + 1}월 ${expires.getDate()}일까지` : '무기한';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <h2 className="mt-3 text-xl font-bold text-emerald-900">
          서명 링크가 발급되었습니다
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          아래 링크를 <strong>{employeeName}</strong>님에게 카카오톡/문자로 보내주세요.
        </p>
      </div>

      <div className="rounded-xl border border-[#EAECF5] bg-white p-5">
        <label className="text-xs font-medium text-slate-500">서명 링크 (시간 제한 없음)</label>
        <div className="mt-2 break-all rounded-md border border-[#EAECF5] bg-slate-50 px-3 py-3 font-mono text-xs text-slate-800">
          {url}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={copy}>
            <span className="inline-flex items-center gap-1.5">
              {copied ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <ClipboardCopy className="h-4 w-4" strokeWidth={2.2} />}
              {copied ? '복사됨' : '링크 복사'}
            </span>
          </Button>
          <a
            href={`sms:?body=${encodeURIComponent(`[리테일메이트] 근로계약서 서명 링크\n${url}\n링크가 안 열리면 사장님께 다시 요청해주세요.`)}`}
          >
            <Button type="button" size="sm" variant="secondary">
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" strokeWidth={2.2} />
                문자로 보내기
              </span>
            </Button>
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          유효기간: {expires ? expires.toLocaleString('ko-KR') : '시간 제한 없음'}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md bg-indigo-50 px-4 py-3 text-xs text-indigo-900">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" strokeWidth={2.2} />
        <span>
          직원이 링크를 열면 회원가입 → 동의 → 서명 → 자동 직원 등록 순으로 진행됩니다.
          서명 완료 후 양측 보관함에서 PDF를 확인할 수 있습니다.
        </span>
      </div>

      <div className="flex gap-3">
        <Link href={`/contracts`} className="flex-1">
          <Button type="button" variant="secondary" size="lg" className="w-full">
            계약서 목록으로
          </Button>
        </Link>
        <Button
          type="button"
          size="lg"
          className="flex-1"
          onClick={onDone}
        >
          확인
        </Button>
      </div>
      <p className="text-center text-[10px] text-slate-400">계약 ID: {contractId}</p>
    </div>
  );
}

/** 종류별 안내 배너 — Step 1 상단에 표시 */
function TypeBanner({ type }: { type: 'fulltime' | 'parttime' | 'daily' }) {
  const meta = {
    fulltime: {
      tone: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      title: '정규직',
      desc: '기간의 정함 없음. 4대보험 의무 가입. 퇴직금 발생(1년 이상 근로).',
    },
    parttime: {
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      title: '단시간(파트타임)',
      desc: '1주 근로시간이 통상근로자보다 짧음. 임금은 비례 산정. 4대보험은 15시간/1개월 이상 시 적용.',
    },
    daily: {
      tone: 'bg-amber-50 border-amber-200 text-amber-900',
      title: '계약직(기간제)',
      desc: '근로 종료일 필수. 2년 초과 시 무기계약직 전환. 만료일 30일 전 갱신 의사 통보.',
    },
  }[type];
  return (
    <div className={`rounded-md border px-3 py-2.5 text-xs ${meta.tone}`}>
      <strong className="block text-sm">선택된 종류: {meta.title}</strong>
      <span className="mt-0.5 block">{meta.desc}</span>
    </div>
  );
}
