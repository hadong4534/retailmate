'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneInput, formatKoreanPhone } from '@/components/ui/PhoneInput';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { createClient } from '@/lib/supabase/client';
import { formatWon } from '@/lib/utils';
import { submitEmployeeSignature } from './actions';

const DAY_KO: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목',
  fri: '금', sat: '토', sun: '일',
};

const TYPE_KO: Record<string, string> = {
  fulltime: '정규직',
  parttime: '단시간',
  daily: '일용직',
};

const WAGE_KO: Record<string, string> = {
  hourly: '시급',
  monthly: '월급',
  daily: '일급',
};

interface ContractData {
  id: string;
  contract_type: string;
  invite_name: string | null;
  invite_phone: string | null;
  work_start_date: string;
  work_end_date: string | null;
  workplace_address: string;
  job_description: string;
  work_days: string[];
  work_start_time: string;
  work_end_time: string;
  break_minutes: number;
  wage_type: string;
  wage_amount: number;
  weekly_holiday_allowance: boolean;
  social_insurance: {
    national_pension: boolean;
    health_insurance: boolean;
    employment_insurance: boolean;
    industrial_accident: boolean;
  };
  pay_day: number;
  pay_method: string | null;
  annual_leave_policy: string | null;
  additional_terms: string | null;
}

interface StoreData {
  name: string;
  address: string;
  business_no: string | null;
}

interface Props {
  token: string;
  contract: ContractData;
  store: StoreData;
  ownerName: string;
  currentUserEmail: string | null;
}

type Phase = 'auth' | 'review' | 'done';

export function SignFlow({
  token,
  contract,
  store,
  ownerName,
  currentUserEmail,
}: Props) {
  const [phase, setPhase] = useState<Phase>(currentUserEmail ? 'review' : 'auth');
  const [signedContractId, setSignedContractId] = useState<string | null>(null);

  if (phase === 'auth') {
    return (
      <AuthStep
        invitePhone={contract.invite_phone ?? ''}
        inviteName={contract.invite_name ?? ''}
        onAuthed={() => setPhase('review')}
      />
    );
  }

  if (phase === 'review') {
    return (
      <ReviewStep
        token={token}
        contract={contract}
        store={store}
        ownerName={ownerName}
        currentUserEmail={currentUserEmail}
        onSigned={(contractId) => {
          setSignedContractId(contractId);
          setPhase('done');
        }}
      />
    );
  }

  return <DoneStep storeName={store.name} contractId={signedContractId} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH STEP — 회원가입(SMS 인증 포함) 또는 로그인 (카카오 옵션 포함)
// ─────────────────────────────────────────────────────────────────────────────
type SmsStage = 'idle' | 'sent' | 'verified';

function AuthStep({
  invitePhone,
  inviteName,
  onAuthed,
}: {
  invitePhone: string;
  inviteName: string;
  onAuthed: () => void;
}) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(inviteName);
  const [phone, setPhone] = useState(formatKoreanPhone(invitePhone));

  // SMS 인증 상태
  const [smsCode, setSmsCode] = useState('');
  const [smsStage, setSmsStage] = useState<SmsStage>('idle');
  const [smsLoading, setSmsLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const phoneDigits = phone.replace(/\D/g, '');
  const isValidPhone = /^010\d{7,8}$/.test(phoneDigits);

  async function handleSendSms() {
    setError(null);
    setInfo(null);
    if (!isValidPhone) {
      setError('휴대폰 번호 형식이 올바르지 않습니다.');
      return;
    }
    setSmsLoading(true);
    try {
      const res = await fetch('/api/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '인증번호 발송에 실패했습니다.');
        return;
      }
      setSmsStage('sent');
      setInfo('인증번호를 발송했어요. 5분 이내에 입력해주세요.');
    } catch {
      setError('인증번호 발송에 실패했습니다.');
    } finally {
      setSmsLoading(false);
    }
  }

  async function handleVerifySms() {
    setError(null);
    setInfo(null);
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits, code: smsCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '인증 실패');
        return;
      }
      setSmsStage('verified');
      setInfo('휴대폰 번호가 확인되었어요.');
    } catch {
      setError('인증 처리 중 오류가 발생했습니다.');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    try {
      if (mode === 'signup') {
        if (smsStage !== 'verified') {
          setError('휴대폰 인증을 먼저 완료해주세요.');
          return;
        }
        if (!name.trim()) {
          setError('이름을 입력해주세요.');
          return;
        }
        if (password.length < 8) {
          setError('비밀번호는 8자 이상 입력해주세요.');
          return;
        }
        // 사장님 가입과 동일한 SMS 검증 흐름 — service-role로 영수증 확인 후 user 생성.
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name: name.trim(),
            phone: phoneDigits,
            accountType: 'employee',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? '가입에 실패했습니다.');
          return;
        }
        // 가입 성공 → 자동 로그인
        const { error: signinErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signinErr) {
          setError('가입은 됐지만 자동 로그인에 실패했습니다. "계정이 있어요" 탭으로 로그인해주세요.');
          return;
        }
        onAuthed();
      } else {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginErr) {
          setError(translateAuthError(loginErr.message));
          return;
        }
        onAuthed();
      }
    } finally {
      setPending(false);
    }
  }

  function handleKakao() {
    // 카카오 OAuth 후 같은 sign 페이지로 복귀
    const next = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/kakao/start?next=${encodeURIComponent(next)}`;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        <p className="font-semibold">근로계약서 서명 페이지</p>
        <p className="mt-1 text-xs">
          본인 확인을 위해 회원가입 또는 로그인이 필요합니다. 가입 후 약관 동의·서명 단계로 이어집니다.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex gap-1 rounded-md bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={
              'flex-1 rounded px-3 py-1.5 text-sm font-medium transition ' +
              (mode === 'signup' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600')
            }
          >
            처음이에요
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={
              'flex-1 rounded px-3 py-1.5 text-sm font-medium transition ' +
              (mode === 'login' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600')
            }
          >
            계정이 있어요
          </button>
        </div>

        {/* 카카오 옵션 — signup/login 둘 다 동일 endpoint */}
        <button
          type="button"
          onClick={handleKakao}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] px-4 text-sm font-semibold text-[#3C1E1E] shadow-sm transition active:scale-[0.98] hover:brightness-95"
        >
          <KakaoIcon />
          {mode === 'signup' ? '카카오로 시작하기' : '카카오로 로그인'}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>또는 이메일로 {mode === 'signup' ? '가입' : '로그인'}</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Input
              label="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="박직원"
              maxLength={20}
            />
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-700">휴대폰 번호</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatKoreanPhone(e.target.value));
                    if (smsStage === 'verified') setSmsStage('idle');
                  }}
                  placeholder="010-0000-0000"
                  maxLength={13}
                  disabled={smsStage === 'verified'}
                  className="h-11 flex-1 rounded-md border border-slate-300 px-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleSendSms}
                  disabled={!isValidPhone || smsLoading || smsStage === 'verified'}
                  className="h-11 shrink-0 rounded-md border border-blue-600 px-3 text-sm font-semibold text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  {smsStage === 'verified' ? '인증완료' : smsLoading ? '발송 중…' : smsStage === 'sent' ? '재발송' : '인증번호 받기'}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && smsStage !== 'idle' && (
            <div>
              <label className="block text-sm font-medium text-slate-700">인증번호 (6자리)</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  disabled={smsStage === 'verified'}
                  className="h-11 flex-1 rounded-md border border-slate-300 px-3 text-base tracking-widest font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleVerifySms}
                  disabled={smsStage !== 'sent' || smsCode.length !== 6 || verifyLoading}
                  className="h-11 shrink-0 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {smsStage === 'verified' ? '확인됨' : verifyLoading ? '확인 중…' : '확인'}
                </button>
              </div>
            </div>
          )}

          <Input
            label="이메일"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <Input
            label={mode === 'signup' ? '비밀번호 (8자 이상)' : '비밀번호'}
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {info && !error && (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">{info}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? '처리 중…' : mode === 'signup' ? '가입하고 계속' : '로그인하고 계속'}
          </Button>
        </form>
      </div>

      <p className="px-2 text-center text-[11px] text-slate-500">
        가입 시 리테일메이트 이용약관 및 개인정보 처리방침에 동의한 것으로 간주합니다. 다음 단계에서 세부 약관 동의를 받습니다.
      </p>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4C6.477 4 2 7.477 2 11.75c0 2.73 1.793 5.13 4.5 6.51L5.4 22l4.42-2.45c.708.105 1.43.16 2.18.16 5.523 0 10-3.477 10-7.75S17.523 4 12 4Z"
        fill="#3C1E1E"
      />
    </svg>
  );
}

function translateAuthError(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (/User already registered/i.test(msg)) return '이미 가입된 이메일입니다. "계정이 있어요" 탭으로 로그인해주세요.';
  if (/Password should be at least/i.test(msg)) return '비밀번호는 6자 이상 입력해주세요.';
  if (/Email rate limit/i.test(msg)) return '잠시 후 다시 시도해주세요. (이메일 발송 제한)';
  if (/email_address_invalid|invalid email/i.test(msg)) return '이메일 주소를 확인해주세요.';
  return msg;
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW STEP — 계약 내용 확인 + 동의 + 서명
// ─────────────────────────────────────────────────────────────────────────────
function ReviewStep({
  token,
  contract,
  store,
  ownerName,
  currentUserEmail,
  onSigned,
}: {
  token: string;
  contract: ContractData;
  store: StoreData;
  ownerName: string;
  currentUserEmail: string | null;
  onSigned: (contractId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [gps, setGps] = useState(false);

  const insurance = Object.entries(contract.social_insurance)
    .filter(([, v]) => v)
    .map(([k]) => {
      const map: Record<string, string> = {
        national_pension: '국민연금',
        health_insurance: '건강보험',
        employment_insurance: '고용보험',
        industrial_accident: '산재보험',
      };
      return map[k];
    })
    .join(', ');

  function handleSubmit() {
    setError(null);
    if (!terms || !privacy) {
      setError('필수 약관 2개에 모두 동의해주세요.');
      return;
    }
    if (!signature) {
      setError('서명을 입력해주세요.');
      return;
    }
    startTransition(async () => {
      const result = await submitEmployeeSignature({
        token,
        signatureDataUrl: signature,
        consents: { terms, privacy, gps_location: gps },
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      onSigned(result.contractId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-500">서명 진행자</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">
          {currentUserEmail}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">계약 내용</h2>
        <div className="mt-3 space-y-1.5 text-sm">
          <Row label="사업장" value={store.name} />
          <Row label="주소" value={store.address} />
          <Row label="대표자" value={ownerName} />
          <Row label="계약 형태" value={TYPE_KO[contract.contract_type] ?? contract.contract_type} />
          <Row
            label="근로 기간"
            value={
              contract.work_end_date
                ? `${contract.work_start_date} ~ ${contract.work_end_date}`
                : `${contract.work_start_date} ~ (정규)`
            }
          />
          <Row label="근무 장소" value={contract.workplace_address} />
          <Row label="담당 업무" value={contract.job_description} />
          <Row
            label="근무 요일"
            value={contract.work_days.map((d) => DAY_KO[d] ?? d).join(', ')}
          />
          <Row
            label="근무 시간"
            value={`${contract.work_start_time.slice(0, 5)} ~ ${contract.work_end_time.slice(0, 5)} (휴게 ${contract.break_minutes}분)`}
          />
          <Row
            label={WAGE_KO[contract.wage_type] ?? '임금'}
            value={formatWon(contract.wage_amount)}
          />
          <Row label="주휴수당" value={contract.weekly_holiday_allowance ? '포함' : '미포함'} />
          <Row label="4대보험" value={insurance || '미가입'} />
          <Row label="임금 지급" value={`매월 ${contract.pay_day}일 · ${contract.pay_method ?? '계좌이체'}`} />
          {contract.annual_leave_policy && (
            <Row label="연차" value={contract.annual_leave_policy} />
          )}
          {contract.additional_terms && (
            <Row label="기타 약정" value={contract.additional_terms} />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-900">동의 항목</h3>
        <div className="mt-3 space-y-2 text-sm">
          <CheckItem
            checked={terms}
            onChange={setTerms}
            required
            label="위 계약 내용에 동의합니다"
          />
          <CheckItem
            checked={privacy}
            onChange={setPrivacy}
            required
            label="개인정보 수집·이용에 동의합니다"
            sub="이름·연락처·이메일은 근로계약 관리 목적으로 이용되며, 계약 종료 후 5년간 보관됩니다."
          />
          <CheckItem
            checked={gps}
            onChange={setGps}
            label="위치정보 수집·이용에 동의합니다 (GPS 출퇴근용)"
            sub="동의 거부 시 GPS 출퇴근 기능을 사용할 수 없습니다. 「위치정보의 보호 및 이용 등에 관한 법률」에 따릅니다."
            optional
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-900">직원 서명</h3>
        <p className="mt-1 text-xs text-slate-500">
          마우스 또는 손가락으로 서명해주세요. 서명 완료 시 즉시 계약이 체결됩니다.
        </p>
        <div className="mt-3">
          <SignaturePad onChange={setSignature} />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={pending || !terms || !privacy || !signature}
      >
        {pending ? '서명 처리 중…' : '동의하고 서명 완료'}
      </Button>

      <p className="text-center text-[11px] text-slate-500">
        본 서명은 「전자서명법」에 따른 전자서명으로, 종이 서명과 동일한 법적 효력을 가집니다.
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

function CheckItem({
  checked,
  onChange,
  label,
  sub,
  required,
  optional,
}: {
  checked: boolean;
  onChange: (b: boolean) => void;
  label: string;
  sub?: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 hover:bg-slate-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0"
      />
      <span className="flex-1">
        <span className="font-medium text-slate-900">
          {required && <span className="mr-1 text-red-500">[필수]</span>}
          {optional && <span className="mr-1 text-slate-400">[선택]</span>}
          {label}
        </span>
        {sub && <span className="mt-0.5 block text-xs text-slate-500">{sub}</span>}
      </span>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DONE STEP — 서명 완료
// ─────────────────────────────────────────────────────────────────────────────
function DoneStep({
  storeName,
  contractId,
}: {
  storeName: string;
  contractId: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-3 text-xl font-bold text-emerald-900">
          서명이 완료되었습니다
        </h1>
        <p className="mt-2 text-sm text-emerald-800">
          <strong>{storeName}</strong> 직원으로 등록되었습니다.
        </p>
      </div>

      {contractId && (
        <a
          href={`/contracts/${contractId}/view`}
          className="block rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          📄 내 계약서 보기 / 인쇄
        </a>
      )}

      <div className="rounded-md bg-blue-50 px-4 py-3 text-xs text-blue-900">
        [인쇄 / PDF 저장] 버튼으로 PDF로 저장해 보관하세요. 자동 PDF 다운로드는 다음 업데이트에서 추가됩니다.
      </div>
    </div>
  );
}
