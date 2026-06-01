import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export const metadata = { title: '개인정보처리방침 · 리테일메이트' };

const UPDATED = '2026년 6월 1일';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F5F4FC] px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-block"><Logo size="md" /></Link>
        <h1 className="mt-6 text-2xl font-extrabold text-slate-900">개인정보처리방침</h1>
        <p className="mt-1 text-sm text-slate-500">시행일: {UPDATED}</p>

        <div className="mt-6 space-y-7 text-[14px] leading-relaxed text-slate-700">
          <p>리테일메이트(이하 “회사”)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 소중히 다룹니다. 본 방침은 리테일메이트 서비스(웹·모바일 앱, retailmate.io)에 적용됩니다.</p>

          <Section n="1" title="수집하는 개인정보 항목">
            <ul className="list-disc space-y-1 pl-5">
              <li><b>계정 정보</b>: 이메일, 이름, 휴대폰번호, (소셜 로그인 시) 카카오 계정 식별자·닉네임</li>
              <li><b>매장·운영 정보</b>: 매장명·업종·주소, 매출·지출·근태·급여·근로계약서 등 사장님이 입력한 운영 데이터</li>
              <li><b>직원 정보</b>: 직원 이름·연락처·근로계약 내용·출퇴근 기록(고용 관리 목적, 매장 관리자가 입력·열람)</li>
              <li><b>위치 정보</b>: GPS 기반 출퇴근 체크 시점의 위치(이용자가 명시적으로 동의한 경우에만 수집)</li>
              <li><b>기기·이용 정보</b>: 푸시 알림 토큰, 접속 로그, 기기/브라우저 정보</li>
            </ul>
          </Section>

          <Section n="2" title="수집·이용 목적">
            <p>회원 식별 및 로그인, 매장 운영 관리(매출·지출·급여·근태·계약), AI 인사이트·디자인 생성, 알림 발송, 서비스 개선 및 문의 응대, 법령상 의무 이행을 위해 이용합니다.</p>
          </Section>

          <Section n="3" title="보유 및 이용기간">
            <p>원칙적으로 회원 탈퇴 시 지체 없이 파기합니다. 다만 관계 법령(전자상거래법, 근로기준법 등)에서 정한 경우 해당 기간 동안 보관합니다. 이용자는 설정 화면에서 직접 계정 및 데이터를 삭제(탈퇴)할 수 있습니다.</p>
          </Section>

          <Section n="4" title="처리위탁 및 제3자 제공">
            <p>서비스 제공을 위해 아래 업체에 개인정보 처리를 위탁합니다. 회사는 이용자의 개인정보를 동의 없이 제3자에게 판매하지 않습니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><b>Supabase</b> — 데이터베이스·인증·파일 저장</li>
              <li><b>Vercel</b> — 애플리케이션 호스팅</li>
              <li><b>OpenRouter(및 연결 AI 모델)</b> — AI 챗봇·이미지 생성. 매장 운영 데이터의 일부가 분석을 위해 전송되며, 직원 이름·연락처 등은 마스킹·최소화하여 전송합니다.</li>
              <li><b>SOLAPI</b> — 휴대폰 본인확인 문자(SMS) 발송</li>
              <li><b>카카오</b> — 소셜 로그인(이용 시)</li>
            </ul>
          </Section>

          <Section n="5" title="위치정보">
            <p>GPS 출퇴근 기능은 이용자가 동의한 경우에만 작동하며, 출퇴근 기록 검증 목적으로만 사용됩니다. 동의는 언제든지 철회할 수 있고, 철회 시 해당 기능 사용이 제한될 수 있습니다.</p>
          </Section>

          <Section n="6" title="알림(푸시)">
            <p>설정에서 알림을 켠 경우, 마감 리마인더·AI 브리핑·근태/공지 알림 등을 발송하기 위해 기기 푸시 토큰을 저장합니다. 알림은 설정에서 언제든 끌 수 있습니다.</p>
          </Section>

          <Section n="7" title="이용자의 권리">
            <p>이용자는 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있으며, 설정 화면에서 직접 계정을 탈퇴(전체 데이터 삭제)할 수 있습니다.</p>
          </Section>

          <Section n="8" title="아동의 개인정보">
            <p>본 서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 해당 정보를 의도적으로 수집하지 않습니다.</p>
          </Section>

          <Section n="9" title="개인정보 보호책임자 및 문의">
            <p>개인정보 관련 문의: <a href="mailto:gkehd6000@gmail.com" className="font-semibold text-[#6366F1]">gkehd6000@gmail.com</a></p>
          </Section>

          <p className="rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
            본 방침은 서비스 정책 변경 시 개정될 수 있으며, 중요한 변경은 서비스 내 공지를 통해 안내합니다.
          </p>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-5 text-[13px]">
          <Link href="/terms" className="font-semibold text-[#6366F1] hover:underline">이용약관 보기 →</Link>
        </div>
      </div>
    </main>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[16px] font-bold text-slate-900">{n}. {title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
