import { NDAWizard } from './NDAWizard';

export const metadata = {
  title: '비밀유지서약서 작성 · 리테일메이트',
};

export default function NewNDAPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">비밀유지서약서 작성</h1>
        <p className="mt-1 text-sm text-slate-500">
          영업비밀법에 따른 비밀유지 및 손해배상 서약서. 직원 휴대폰으로 서명 링크가 발송됩니다.
        </p>
        <div className="mt-6">
          <NDAWizard />
        </div>
      </div>
    </div>
  );
}
