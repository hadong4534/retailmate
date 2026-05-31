'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardCopy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { todayInKST } from '@/lib/utils';
import { createNDA, type NDAFormData } from '../../actions';

/**
 * 비밀유지서약서(NDA) 작성 마법사.
 * 일반 근로계약서와 별개 — 임금·근로시간 등 묻지 않음.
 *
 * 흐름:
 *  Step 1) 직원 정보 + NDA 조건
 *  Step 2) 사장 서명 + 서명링크 발송
 *  Done)  서명링크 표시 + 복사·SMS 보내기 안내
 */

const DEFAULT_DATA: NDAFormData = {
  invite_name: '',
  invite_phone: '',
  effective_date: todayInKST(),
  retention_years: 3,
  extra_scope: '',
};

export function NDAWizard() {
  const router = useRouter();
  const [data, setData] = useState<NDAFormData>(DEFAULT_DATA);
  const [step, setStep] = useState<1 | 2 | 'done'>(1);
  const [signature, setSignature] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ contractId: string; signToken: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof NDAFormData>(key: K, value: NDAFormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const step1Valid = useMemo(() => {
    return (
      data.invite_name.trim().length > 0 &&
      data.invite_phone.replace(/\D/g, '').length >= 10 &&
      data.effective_date.length > 0 &&
      data.retention_years >= 1 &&
      data.retention_years <= 10
    );
  }, [data]);

  const step2Valid = signature.length > 0;

  async function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await createNDA(data, signature);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.contractId && res.signToken && res.expiresAt) {
        setResult({ contractId: res.contractId, signToken: res.signToken, expiresAt: res.expiresAt });
        setStep('done');
      }
    });
  }

  // Done step
  if (step === 'done' && result) {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/contracts/${result.contractId}/sign?token=${result.signToken}`;
    const expiresStr = new Date(result.expiresAt).toLocaleDateString('ko-KR');

    async function copy() {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }

    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-lg font-bold text-emerald-900">서약서 발송 준비 완료</h2>
          <p className="mt-2 text-sm text-emerald-800">
            아래 서명 링크를 직원에게 전달하세요. 직원이 링크를 통해 서명하면 비밀유지서약서가 완성됩니다.
          </p>
        </div>

        <div className="rounded-xl border border-[#EAECF5] bg-white p-5">
          <label className="text-xs font-medium text-slate-500">서명 링크 (7일 후 만료)</label>
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
              href={`sms:?body=${encodeURIComponent(`[리테일메이트] 비밀유지서약서 서명 링크 (${expiresStr} 만료)\n${url}`)}`}
              className="inline-flex h-9 items-center rounded-md border border-[#E3E5F0] px-3 text-sm font-medium text-slate-700"
            >
              문자로 보내기
            </a>
          </div>
        </div>

        <div className="flex justify-between">
          <Link
            href="/contracts"
            className="inline-flex h-10 items-center rounded-md border border-[#E3E5F0] px-4 text-sm font-medium text-slate-700"
          >
            계약서 목록으로
          </Link>
          <button
            type="button"
            onClick={() => {
              setData(DEFAULT_DATA);
              setSignature('');
              setStep(1);
              setResult(null);
              router.refresh();
            }}
            className="inline-flex h-10 items-center rounded-md bg-[#7177EE] px-4 text-sm font-semibold text-white"
          >
            새 서약서 작성
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-3 text-sm">
        {[1, 2].map((n) => {
          const active = step === n || (step === 2 && n === 1);
          const done = step === 2 && n === 1;
          return (
            <div key={n} className="flex items-center gap-2">
              <span
                className={
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ' +
                  (done
                    ? 'bg-emerald-500 text-white'
                    : active
                    ? 'bg-[#7177EE] text-white'
                    : 'bg-slate-200 text-slate-500')
                }
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.4} /> : n}
              </span>
              <span className={active ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                {n === 1 ? '직원 정보 + 조건' : '사장님 서명'}
              </span>
              {n === 1 && <span className="text-slate-300">›</span>}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="space-y-5 rounded-xl border border-[#EAECF5] bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">Step 1 · 직원 정보 + NDA 조건</h2>

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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">시행일</label>
              <input
                type="date"
                value={data.effective_date}
                onChange={(e) => update('effective_date', e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                퇴직 후 유지기간 (년)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={data.retention_years}
                onChange={(e) => update('retention_years', Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
              />
              <p className="mt-1 text-[11px] text-slate-400">일반적으로 1~3년 권장. 너무 길면 법원이 무효 판단할 수 있어요.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              비밀정보 범위 추가 정의 <span className="text-xs text-slate-400">(선택)</span>
            </label>
            <textarea
              value={data.extra_scope}
              onChange={(e) => update('extra_scope', e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="기본 4가지(매출·레시피·인사·기술정보) 외 추가로 보호하고 싶은 정보 예: 신메뉴 개발 계획, 거래처 단가표 등"
              className="mt-1 w-full rounded-md border border-[#E3E5F0] px-3 py-2 text-sm text-slate-900 focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
            />
            <p className="mt-1 text-[11px] text-slate-400">비워두면 기본 범위(매장 운영 데이터·레시피·인사·기술정보)만 적용</p>
          </div>

          <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
            <strong>주요 조항</strong>: 영업비밀법 제18조(10년 이하 징역·5억 벌금) · 무단이탈 시 내용증명·민사·형사고소 검토 가능
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={() => setStep(2)} disabled={!step1Valid}>
              다음
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 rounded-xl border border-[#EAECF5] bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">Step 2 · 사장님 서명</h2>
          <p className="text-sm text-slate-500">
            아래 영역에 서명해주세요. 서명 후 [서명 완료 + 직원에게 전송]을 누르면 직원에게 보낼 서명 링크가 만들어집니다.
          </p>
          <SignaturePad onChange={(v) => setSignature(v ?? '')} />

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex h-10 items-center rounded-md border border-[#E3E5F0] px-4 text-sm font-medium text-slate-700"
            >
              이전
            </button>
            <Button type="button" onClick={handleSubmit} disabled={!step2Valid || pending}>
              {pending ? '생성 중...' : '서명 완료 + 직원에게 전송'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
