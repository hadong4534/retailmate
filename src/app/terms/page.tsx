import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export const metadata = { title: '이용약관 · 리테일메이트' };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F5F4FC] px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-block"><Logo size="md" /></Link>
        <h1 className="mt-6 text-2xl font-extrabold text-slate-900">이용약관</h1>
        <p className="mt-1 text-sm text-slate-500">시행일: 2026년 6월 1일</p>

        <div className="mt-6 space-y-7 text-[14px] leading-relaxed text-slate-700">
          <S n="1" t="목적">
            본 약관은 리테일메이트(이하 “서비스”)의 이용 조건 및 회사와 이용자 간 권리·의무를 규정합니다.
          </S>
          <S n="2" t="서비스 내용">
            서비스는 매출·지출 기록, 리포트, 직원·근태·급여 관리, 근로계약서 작성·전자서명, AI 챗봇·디자인 생성 등 매장 운영 관리 기능을 제공합니다. 회사는 서비스의 내용을 개선을 위해 변경할 수 있습니다.
          </S>
          <S n="3" t="계정과 권한">
            이용자는 정확한 정보로 가입해야 하며 계정 보안에 책임이 있습니다. 매장에는 사장(소유자)·매니저·직원 권한이 있으며, 매니저는 사장이 위임한 범위에서 관리 기능을 사용할 수 있습니다.
          </S>
          <S n="4" t="이용자의 의무">
            이용자는 타인의 권리를 침해하거나 법령을 위반하는 목적으로 서비스를 사용해서는 안 됩니다. 직원 정보 등 타인의 개인정보를 입력·관리할 경우 관련 법령을 준수해야 합니다.
          </S>
          <S n="5" t="AI 생성물">
            AI로 생성된 텍스트·이미지는 참고용이며, 이용자는 상업적 사용 전 적절성·권리 침해 여부를 확인할 책임이 있습니다.
          </S>
          <S n="6" t="면책 (중요)">
            급여 계산, 4대보험·원천징수·세금 추정, AI 인사이트 등은 <b>참고용 추정치</b>이며 법적·세무적 효력을 갖지 않습니다. 실제 신고·지급·법적 판단은 노무사·세무사 등 전문가의 검토를 거쳐야 합니다. 회사는 이로 인한 결과에 대해 책임지지 않습니다.
          </S>
          <S n="7" t="해지 및 탈퇴">
            이용자는 언제든지 설정 화면에서 탈퇴할 수 있으며, 탈퇴 시 데이터는 개인정보처리방침에 따라 처리됩니다.
          </S>
          <S n="8" t="준거법">
            본 약관은 대한민국 법률에 따라 해석되며, 분쟁은 관련 법령이 정한 절차에 따릅니다.
          </S>
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
            본 약관은 표준 템플릿을 바탕으로 작성되었습니다. 정식 서비스 운영 전 법률 전문가의 검토를 권장합니다.
          </p>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-5 text-[13px]">
          <Link href="/privacy" className="font-semibold text-[#6366F1] hover:underline">개인정보처리방침 보기 →</Link>
        </div>
      </div>
    </main>
  );
}

function S({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[16px] font-bold text-slate-900">제{n}조 ({t})</h2>
      <p className="mt-2">{children}</p>
    </section>
  );
}
