import { redirect } from 'next/navigation';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderContractHTML } from '@/lib/contract/template';
import type { LaborContract, Store, Profile } from '@/types/database';
import { PrintToolbar } from './PrintToolbar';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '근로계약서 · 리테일메이트',
};

export default async function ContractViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/contracts/${id}/view`);
  }

  // RLS 적용된 client로 조회 → 사장 또는 employee 본인만 접근
  const { data: contract } = await supabase
    .from('labor_contracts')
    .select('*')
    .eq('id', id)
    .maybeSingle<LaborContract>();

  if (!contract) {
    return (
      <ErrorScreen
        title="계약서를 찾을 수 없습니다"
        message="권한이 없거나 삭제된 계약서입니다."
      />
    );
  }

  // 매장·사장·직원 정보는 admin client로 (직원이 사장 profile 못 보는 RLS 우회)
  const admin = createAdminClient();
  const { data: store } = await admin
    .from('stores')
    .select('*')
    .eq('id', contract.store_id)
    .maybeSingle<Store>();
  if (!store) {
    return <ErrorScreen title="매장 정보 없음" message="매장이 삭제되었습니다." />;
  }

  const { data: storeOwnerProfile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', store.owner_id)
    .maybeSingle<Profile>();

  let employeeProfile: Profile | null = null;
  if (contract.employee_id) {
    const { data } = await admin
      .from('profiles')
      .select('*')
      .eq('id', contract.employee_id)
      .maybeSingle<Profile>();
    employeeProfile = data;
  }

  const employeeForTemplate: Profile = employeeProfile ?? {
    id: 'pending',
    email: '(서명 전)',
    name: contract.invite_name ?? '(직원 미가입)',
    phone: contract.invite_phone,
    role: 'employee',
    avatar_url: null,
    created_at: contract.created_at,
    updated_at: contract.created_at,
  };

  const ownerForTemplate: Profile = storeOwnerProfile ?? {
    id: store.owner_id,
    email: '',
    name: '(대표자명)',
    phone: null,
    role: 'owner',
    avatar_url: null,
    created_at: contract.created_at,
    updated_at: contract.created_at,
  };

  const html = renderContractHTML({
    contract,
    store,
    owner: ownerForTemplate,
    employee: employeeForTemplate,
  });

  // <body>...</body> 부분만 추출 (전체 HTML 문서 대신 페이지에 인라인)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  const inner = bodyMatch ? bodyMatch[1] : html;
  const styles = styleMatch ? styleMatch[1] : '';

  const isOwner = user.id === store.owner_id;
  const backHref = isOwner ? '/contracts' : '/dashboard';

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <PrintToolbar
        backHref={backHref}
        contractId={contract.id}
        hasPdf={!!contract.pdf_url}
      />

      <style dangerouslySetInnerHTML={{ __html: scopedStyles(styles) }} />

      <div className="mx-auto max-w-4xl py-6 print:py-0">
        <div
          className="contract-print-area mx-auto bg-white p-8 shadow-sm print:p-0 print:shadow-none lg:p-12"
          dangerouslySetInnerHTML={{ __html: inner }}
        />
      </div>

      <p className="mx-auto flex max-w-4xl items-center justify-center gap-1.5 px-4 pb-6 text-center text-xs text-slate-400 print:hidden">
        <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.2} />
        [인쇄 / PDF 저장] 버튼을 눌러 PDF로 저장하세요. 자동 PDF 생성·다운로드는 다음 업데이트에서 추가됩니다.
      </p>
    </div>
  );
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 px-8 py-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <h1 className="mt-3 text-xl font-bold text-red-900">{title}</h1>
        <p className="mt-2 text-sm text-red-800">{message}</p>
      </div>
    </div>
  );
}

/** template.ts의 <style>을 .contract-print-area 스코프 안으로 묶어 다른 페이지에 영향 안 주게 */
function scopedStyles(raw: string): string {
  return `
    .contract-print-area { font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif; font-size: 11pt; line-height: 1.6; color: #111; }
    .contract-print-area h1 { text-align: center; font-size: 20pt; margin: 0 0 4pt 0; letter-spacing: 8pt; }
    .contract-print-area .subtitle { text-align: center; font-size: 10pt; color: #555; margin-bottom: 18pt; }
    .contract-print-area .intro { margin: 12pt 0 18pt 0; padding: 10pt 12pt; background: #f8fafc; border-left: 3px solid #2563eb; font-size: 10pt; }
    .contract-print-area table.contract { width: 100%; border-collapse: collapse; margin-top: 10pt; }
    .contract-print-area table.contract th, .contract-print-area table.contract td { border: 1px solid #999; padding: 6pt 8pt; vertical-align: top; text-align: left; }
    .contract-print-area table.contract th { width: 22%; background: #f1f5f9; font-weight: 600; }
    .contract-print-area .clause-title { margin-top: 16pt; font-weight: 700; font-size: 12pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; }
    .contract-print-area .clause-body { margin: 6pt 0 12pt 0; padding-left: 8pt; font-size: 10.5pt; }
    .contract-print-area .signature-row { display: flex; justify-content: space-between; margin-top: 30pt; gap: 20pt; }
    .contract-print-area .sig-box { flex: 1; border: 1px solid #999; padding: 12pt; min-height: 100pt; }
    .contract-print-area .sig-box .label { font-weight: 700; margin-bottom: 6pt; }
    .contract-print-area .sig-box .meta { font-size: 9.5pt; color: #555; line-height: 1.5; }
    .contract-print-area .sig-box .sig-area { margin-top: 16pt; min-height: 60pt; border-bottom: 1px solid #ccc; }
    .contract-print-area .sig-placeholder { color: #999; font-size: 10pt; }
    .contract-print-area .footer { margin-top: 20pt; padding-top: 10pt; border-top: 1px dashed #ccc; font-size: 9pt; color: #555; text-align: center; }
    .contract-print-area .badge { display: inline-block; padding: 2pt 8pt; background: #2563eb; color: white; border-radius: 999px; font-size: 9pt; margin-left: 8pt; }
    @media print {
      @page { size: A4; margin: 20mm 18mm; }
      body { background: white !important; }
    }
    /* unused raw: ${raw.length} */
  `;
}
