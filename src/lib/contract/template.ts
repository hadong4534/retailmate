/**
 * 근로계약서 표준 양식 — HTML 템플릿
 *
 * 출처: 고용노동부 표준근로계약서 (정규직/단시간/일용직)
 * 법적 근거: 근로기준법 제17조 (근로조건의 명시), 시행령 제8조
 * 주의: 본 템플릿은 참고용이며, 실제 적용 시 노무사 검수 권장
 */

import type { LaborContract, Profile, Store } from '@/types/database';
import { scheduleTimeText, scheduleWeeklyHours } from '@/lib/contract/schedule';

export interface ContractTemplateData {
  contract: LaborContract;
  store: Store;
  owner: Profile;
  employee: Profile;
}

const DAY_KO: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목',
  fri: '금', sat: '토', sun: '일',
};

const CONTRACT_TYPE_KO: Record<string, string> = {
  fulltime: '정규직 (기간의 정함이 없는 근로계약)',
  parttime: '단시간 근로자 (시간제)',
  daily: '계약직 (기간제)',
  nda: '비밀유지 및 손해배상 서약서',
};

const WAGE_TYPE_KO: Record<string, string> = {
  hourly: '시급',
  monthly: '월급',
  daily: '일급',
};

function formatWorkDays(days: string[]): string {
  if (!days || days.length === 0) return '-';
  return days.map((d) => DAY_KO[d] ?? d).join(', ') + '요일';
}

function formatDate(d: string | null): string {
  if (!d) return '________________';
  const date = new Date(d);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

function formatTime(t: string): string {
  // "09:00:00" → "09시 00분"
  const [h, m] = t.split(':');
  return `${h}시 ${m}분`;
}

/**
 * 계약서 HTML 생성 — contract_type에 따라 적절한 렌더러로 분기.
 *
 * - fulltime/parttime/daily: renderLaborContractHTML (기존 근로계약서)
 * - nda: renderNDAHTML (비밀유지 서약서)
 */
/** HTML 이스케이프 — dangerouslySetInnerHTML로 렌더되므로 사용자 입력은 반드시 거친다(XSS 방지). */
function esc(v: string | number | null | undefined): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderContractHTML(data: ContractTemplateData): string {
  if (data.contract.contract_type === 'nda') {
    return renderNDAHTML(data);
  }
  return renderLaborContractHTML(data);
}

/**
 * 근로계약서 HTML (정규직/파트타임/계약직 공통 본문 + 부제 차별화)
 */
function renderLaborContractHTML(data: ContractTemplateData): string {
  const { contract, store, owner, employee } = data;

  const insurance = contract.social_insurance;
  const insuranceList = [
    insurance.national_pension && '국민연금',
    insurance.health_insurance && '건강보험',
    insurance.employment_insurance && '고용보험',
    insurance.industrial_accident && '산재보험',
  ].filter(Boolean).join(', ') || '미가입';

  const ownerSig = contract.owner_signature_image
    ? `<img src="${contract.owner_signature_image}" alt="사장 서명" style="max-height: 60px;" />`
    : '<span class="sig-placeholder">(서명/날인)</span>';

  const employeeSig = contract.employee_signature_image
    ? `<img src="${contract.employee_signature_image}" alt="직원 서명" style="max-height: 60px;" />`
    : '<span class="sig-placeholder">(서명/날인)</span>';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>표준근로계약서 — ${esc(employee.name)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #111;
    margin: 0;
  }
  h1 {
    text-align: center;
    font-size: 20pt;
    margin: 0 0 4pt 0;
    letter-spacing: 8pt;
  }
  .subtitle {
    text-align: center;
    font-size: 10pt;
    color: #555;
    margin-bottom: 18pt;
  }
  .intro {
    margin: 12pt 0 18pt 0;
    padding: 10pt 12pt;
    background: #f8fafc;
    border-left: 3px solid #7177EE;
    font-size: 10pt;
  }
  .party-line { margin: 8pt 0; }
  .party-line strong { display: inline-block; min-width: 80pt; }
  table.contract {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10pt;
  }
  table.contract th, table.contract td {
    border: 1px solid #999;
    padding: 6pt 8pt;
    vertical-align: top;
    text-align: left;
  }
  table.contract th {
    width: 22%;
    background: #f1f5f9;
    font-weight: 600;
  }
  .clause-title {
    margin-top: 16pt;
    font-weight: 700;
    font-size: 12pt;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4pt;
  }
  .clause-body { margin: 6pt 0 12pt 0; padding-left: 8pt; font-size: 10.5pt; }
  .signature-row {
    display: flex;
    justify-content: space-between;
    margin-top: 30pt;
    gap: 20pt;
  }
  .sig-box {
    flex: 1;
    border: 1px solid #999;
    padding: 12pt;
    min-height: 100pt;
  }
  .sig-box .label { font-weight: 700; margin-bottom: 6pt; }
  .sig-box .meta { font-size: 9.5pt; color: #555; line-height: 1.5; }
  .sig-box .sig-area { margin-top: 16pt; min-height: 60pt; border-bottom: 1px solid #ccc; }
  .sig-placeholder { color: #999; font-size: 10pt; }
  .footer {
    margin-top: 20pt;
    padding-top: 10pt;
    border-top: 1px dashed #ccc;
    font-size: 9pt;
    color: #555;
    text-align: center;
  }
  .badge {
    display: inline-block;
    padding: 2pt 8pt;
    background: #7177EE;
    color: white;
    border-radius: 999px;
    font-size: 9pt;
    margin-left: 8pt;
  }
</style>
</head>
<body>

<h1>표준근로계약서</h1>
<div class="subtitle">${CONTRACT_TYPE_KO[contract.contract_type]}</div>

<div class="intro">
  <strong>사용자</strong> ${esc(store.name)} 대표 <strong>${esc(owner.name)}</strong>(이하 "사업주")와<br />
  <strong>근로자</strong> <strong>${esc(employee.name)}</strong>(이하 "근로자")은 다음과 같이 근로계약을 체결한다.
</div>

<table class="contract">
  <tr>
    <th>1. 근로계약기간</th>
    <td>
      ${formatDate(contract.work_start_date)}
      ${contract.work_end_date ? ` ~ ${formatDate(contract.work_end_date)}` : ' 부터 (기간의 정함 없음)'}
    </td>
  </tr>
  <tr>
    <th>2. 근무 장소</th>
    <td>${esc(contract.workplace_address)}</td>
  </tr>
  <tr>
    <th>3. 업무의 내용</th>
    <td>${esc(contract.job_description).replace(/\n/g, '<br/>')}</td>
  </tr>
  <tr>
    <th>4. 소정근로일</th>
    <td>${formatWorkDays(contract.work_days)}</td>
  </tr>
  <tr>
    <th>5. 소정근로시간</th>
    <td>
      ${scheduleTimeText(contract)}
    </td>
  </tr>
  <tr>
    <th>6. 임금</th>
    <td>
      <strong>${WAGE_TYPE_KO[contract.wage_type]}</strong>:
      <strong style="color:#7177EE">${formatMoney(contract.wage_amount)}원</strong><br />
      주휴수당: ${contract.weekly_holiday_allowance ? '포함' : '미포함'}<br />
      지급일: 매월 ${contract.pay_day}일<br />
      지급방법: ${esc(contract.pay_method ?? '계좌이체')}
    </td>
  </tr>
  <tr>
    <th>7. 사회보험</th>
    <td>${insuranceList}</td>
  </tr>
  <tr>
    <th>8. 연차유급휴가</th>
    <td>${esc(contract.annual_leave_policy ?? '근로기준법에 따라 부여')}</td>
  </tr>
  ${contract.additional_terms ? `
  <tr>
    <th>9. 기타 약정</th>
    <td>${esc(contract.additional_terms).replace(/\n/g, '<br/>')}</td>
  </tr>` : ''}
</table>

${renderTypeSpecificClauses(contract)}

<div class="clause-title">근로계약 일반조건</div>
<div class="clause-body">
  ① 근로자가 정당한 사유 없이 결근하거나 지각하는 경우 사업주는 근로기준법에 따라 임금에서 공제할 수 있다.<br />
  ② 사업주는 근로자에게 매월 임금명세서를 교부한다.<br />
  ③ 본 계약서에 명시되지 않은 사항은 근로기준법, 최저임금법 등 관련 법령에 따른다.<br />
  ④ 본 계약서는 1부씩 사업주와 근로자가 보관한다.
</div>

<div class="clause-title">위치정보 수집·이용에 관한 동의 <span class="badge">선택동의</span></div>
<div class="clause-body">
  근로자는 출퇴근 GPS 인증을 위해 다음 항목의 위치정보 수집·이용에 동의한다.<br />
  • 수집 항목: 출퇴근 시점의 GPS 좌표 (위도/경도)<br />
  • 이용 목적: 매장 반경 내 출퇴근 인증, 근태 관리<br />
  • 보유 기간: 계약 종료 후 1년<br />
  • 거부 권리: 동의를 거부할 수 있으며, 거부 시 GPS 출퇴근 기능 사용이 제한된다.<br />
  ※ 본 동의는 「위치정보의 보호 및 이용 등에 관한 법률」에 따른다.
</div>

<div style="text-align:center; margin-top:24pt; font-size:11pt;">
  계약 체결일: <strong>${formatDate(new Date().toISOString())}</strong>
</div>

<div class="signature-row">
  <div class="sig-box">
    <div class="label">사업주 (사용자)</div>
    <div class="meta">
      사업장명: ${esc(store.name)}<br />
      사업자등록번호: ${esc(store.business_no ?? '________________')}<br />
      주소: ${esc(store.address)}<br />
      대표자: ${esc(owner.name)}
    </div>
    <div class="sig-area">${ownerSig}</div>
  </div>
  <div class="sig-box">
    <div class="label">근로자</div>
    <div class="meta">
      성명: ${esc(employee.name)}<br />
      연락처: ${esc(employee.phone ?? '________________')}<br />
      이메일: ${esc(employee.email)}
    </div>
    <div class="sig-area">${employeeSig}</div>
  </div>
</div>

<div class="footer">
  본 계약서는 「전자서명법」에 따른 전자서명으로 체결된 계약이며, 종이 서명과 동일한 법적 효력을 가집니다.<br />
  서명 일시: 사업주 ${contract.owner_signed_at ?? '________________'} /
  근로자 ${contract.employee_signed_at ?? '________________'}<br />
  생성: 리테일메이트 (RetailMate) — 자영업자 올인원 플랫폼
</div>

</body>
</html>`;
}

/**
 * 빈 양식 (작성 화면 미리보기용 더미 데이터)
 */
export function getEmptyContractPreview(storeName = '(매장명)', ownerName = '(대표자명)'): ContractTemplateData {
  return {
    contract: {
      id: 'preview',
      store_id: 'preview',
      employee_id: 'preview',
      invite_name: null,
      invite_phone: null,
      contract_type: 'fulltime',
      work_start_date: new Date().toISOString().slice(0, 10),
      work_end_date: null,
      workplace_address: '(매장 주소)',
      job_description: '(업무 내용)',
      work_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      work_start_time: '09:00:00',
      work_end_time: '18:00:00',
      break_minutes: 60,
      wage_type: 'hourly',
      wage_amount: 10500,
      weekly_holiday_allowance: true,
      pay_day: 10,
      pay_method: '계좌이체',
      social_insurance: {
        national_pension: true,
        health_insurance: true,
        employment_insurance: true,
        industrial_accident: true,
      },
      annual_leave_policy: null,
      additional_terms: null,
      nda_retention_years: null,
      nda_info_scope: null,
      pdf_url: null,
      status: 'draft',
      sign_token: null,
      sign_token_expires_at: null,
      owner_signed_at: null,
      owner_signature_image: null,
      owner_signed_ip: null,
      owner_signed_user_agent: null,
      employee_signed_at: null,
      employee_signature_image: null,
      employee_signed_ip: null,
      employee_signed_user_agent: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    store: {
      id: 'preview', owner_id: 'preview',
      name: storeName,
      business_no: null,
      industry: null,
      address: '(매장 주소)',
      detail_address: null,
      lat: null, lng: null, radius_m: 100,
      open_time: null, close_time: null, monthly_target: 0,
      postcode: null,
      wage_calc_mode: 'hourly', weekly_holiday_default: true,
      pay_day_default: 25, tax_filing_mode: 'simple',
      business_name: null, logo_path: null,
      brand_color: '#7177EE', brand_slogan: null, brand_description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    owner: {
      id: 'preview', email: 'owner@example.com',
      name: ownerName, phone: null, role: 'owner', avatar_url: null,
      avatar_path: null, phone_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    employee: {
      id: 'preview', email: 'employee@example.com',
      name: '(직원명)', phone: null, role: 'employee', avatar_url: null,
      avatar_path: null, phone_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * 종류별(정규/단시간/계약직) 특약사항 블록.
 * 표 하단에 추가 삽입되어 종류 고유의 법정 조항·문구를 표시한다.
 */
function renderTypeSpecificClauses(
  contract: ContractTemplateData['contract'],
): string {
  if (contract.contract_type === 'fulltime') {
    return `
<div class="clause-title">정규직 특약사항</div>
<div class="clause-body">
  ① 본 계약은 기간의 정함이 없는 근로계약으로, 근로기준법 제23조에 따라 정당한 사유 없이 해고할 수 없다.<br />
  ② 4대보험 가입은 의무이며, 사회보험료의 사용자 분담분은 매월 정상 납부한다.<br />
  ③ 연차유급휴가는 근로기준법 제60조에 따라 1년간 80% 이상 출근 시 15일 부여하며, 매 2년마다 1일씩 가산한다.<br />
  ④ 퇴직 시 근로자퇴직급여보장법에 따라 퇴직금을 지급한다 (계속근로기간 1년 이상).
</div>`;
  }

  if (contract.contract_type === 'parttime') {
    const ws = contract.work_schedule;
    const weekdayHours =
      scheduleWeeklyHours(contract) ??
      computeWeeklyHours(
        contract.work_start_time,
        contract.work_end_time,
        contract.break_minutes,
        contract.work_days.length,
      );
    // 요일별 설정(per_day)은 요일마다 다른 시간으로, 일/주 N시간 모드는 요약 행으로 표기
    const dayRows =
      ws?.mode === 'per_day' && ws.per_day
        ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
            .filter((d) => ws.per_day![d])
            .map(
              (d) => `<tr>
          <td>${DAY_KO[d] ?? d}요일</td>
          <td>${formatTime(ws.per_day![d].start)}</td>
          <td>${formatTime(ws.per_day![d].end)}</td>
          <td>${contract.break_minutes}분</td>
        </tr>`,
            )
            .join('')
        : ws && (ws.mode === 'daily_hours' || ws.mode === 'weekly_hours')
          ? `<tr><td colspan="4">${scheduleTimeText(contract)} — 요일별 상세 시간은 매장 근무 스케줄표에 따른다.</td></tr>`
          : (contract.work_days as string[])
              .map(
                (d) => `<tr>
          <td>${DAY_KO[d] ?? d}요일</td>
          <td>${formatTime(contract.work_start_time)}</td>
          <td>${formatTime(contract.work_end_time)}</td>
          <td>${contract.break_minutes}분</td>
        </tr>`,
              )
              .join('');
    return `
<div class="clause-title">단시간 근로자 특약사항</div>
<div class="clause-body">
  근로기준법 시행령 별표2에 따라 본 단시간 근로자의 근로일별 근로시간을 다음과 같이 명시한다.
</div>
<table class="contract">
  <tr style="background:#f1f5f9;">
    <th style="width:25%;">요일</th>
    <th style="width:25%;">시작</th>
    <th style="width:25%;">종료</th>
    <th style="width:25%;">휴게</th>
  </tr>
  ${dayRows}
</table>
<div class="clause-body" style="margin-top:8pt;">
  ① 1주 소정근로시간 합계: <strong>약 ${weekdayHours.toFixed(1)}시간</strong><br />
  ② 단시간 근로자의 임금은 통상근로자에 비례하여 산정한다 (근로기준법 시행령 별표2).<br />
  ③ 1주 소정근로시간이 15시간 미만인 경우 주휴수당·퇴직금이 발생하지 않을 수 있다.<br />
  ④ 4대보험 가입은 1주 소정근로시간 15시간 이상 + 1개월 이상 근로 시 의무이다.
</div>`;
  }

  if (contract.contract_type === 'daily') {
    const endDate = contract.work_end_date
      ? formatDate(contract.work_end_date)
      : '________';
    return `
<div class="clause-title">계약직(기간제) 근로자 특약사항</div>
<div class="clause-body">
  ① 본 계약은 <strong>${endDate}</strong>까지 유효하며, 동 기간 만료 시 별도 통지 없이 자동 종료된다.<br />
  ② 「기간제 및 단시간근로자 보호 등에 관한 법률」(기간제법) 제4조에 따라, <strong>2년을 초과하여 계속 근로 시 기간의 정함이 없는 근로계약을 체결한 근로자(무기계약직)로 본다.</strong><br />
  ③ 계약 갱신 의사는 만료일 30일 전까지 서면 또는 전자적 방법으로 통보한다.<br />
  ④ 정당한 사유 없이 계약 기간 중 해지할 수 없으며, 해지 시 근로기준법 제26조에 따른 해고예고 의무를 준수한다.
</div>`;
  }

  return '';
}

/**
 * 단시간 근로자 1주 소정근로시간 추정.
 * 시작·종료 시각 차이 - 휴게시간을 1일 근로시간으로 보고, 근무일 수로 곱한다.
 */
function computeWeeklyHours(
  start: string,
  end: string,
  breakMinutes: number,
  daysPerWeek: number,
): number {
  try {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const dailyMinutes = eh * 60 + em - (sh * 60 + sm) - breakMinutes;
    return Math.max(0, (dailyMinutes / 60) * daysPerWeek);
  } catch {
    return 0;
  }
}

/**
 * 비밀유지 및 손해배상 서약서(NDA) HTML 생성.
 *
 * 본 양식은 일반 NDA에 부정경쟁방지 및 영업비밀보호에 관한 법률(영업비밀법)을
 * 명시적으로 인용하고, 무단이탈 시 사업주가 취할 수 있는 법적 절차를 안내한다.
 *
 * ⚠ 참고용 양식이며, 분쟁시 법원이 일부 조항을 무효 판단할 수 있다.
 *    실제 적용시 노무사·변호사 검토 권장.
 */
function renderNDAHTML(data: ContractTemplateData): string {
  const { contract, store, owner, employee } = data;

  const ownerSig = contract.owner_signature_image
    ? `<img src="${contract.owner_signature_image}" alt="사업주 서명" style="max-height: 60px;" />`
    : '<span class="sig-placeholder">(서명/날인)</span>';

  const employeeSig = contract.employee_signature_image
    ? `<img src="${contract.employee_signature_image}" alt="근로자 서명" style="max-height: 60px;" />`
    : '<span class="sig-placeholder">(서명/날인)</span>';

  const effectiveDate = contract.work_start_date;
  const retentionYears = contract.nda_retention_years ?? 3;
  const extraScope = contract.nda_info_scope ? esc(contract.nda_info_scope.trim()) : undefined;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>비밀유지 및 손해배상 서약서 — ${esc(employee.name)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #111;
    margin: 0;
  }
  h1 {
    text-align: center;
    font-size: 20pt;
    margin: 0 0 4pt 0;
    letter-spacing: 4pt;
  }
  .subtitle {
    text-align: center;
    font-size: 10pt;
    color: #555;
    margin-bottom: 22pt;
  }
  .intro {
    margin: 12pt 0 18pt 0;
    padding: 12pt 14pt;
    background: #f8fafc;
    border-left: 3px solid #7177EE;
    font-size: 10.5pt;
  }
  .party {
    margin: 14pt 0 18pt 0;
    font-size: 10.5pt;
  }
  .party .row { margin: 4pt 0; }
  .party strong { display: inline-block; min-width: 70pt; }
  .clause-title {
    margin-top: 14pt;
    font-weight: 700;
    font-size: 12pt;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4pt;
  }
  .clause-body {
    margin: 6pt 0 12pt 0;
    padding-left: 8pt;
    font-size: 10.5pt;
  }
  .clause-body ol {
    margin: 0 0 0 16pt;
    padding: 0;
  }
  .clause-body li {
    margin: 3pt 0;
  }
  .warn {
    background: #fff7ed;
    border: 1px solid #fdba74;
    padding: 8pt 10pt;
    margin: 8pt 0;
    font-size: 10pt;
    color: #7c2d12;
  }
  .signature-row {
    display: flex;
    justify-content: space-between;
    margin-top: 26pt;
    gap: 20pt;
  }
  .sig-box {
    flex: 1;
    border: 1px solid #999;
    padding: 12pt;
    min-height: 110pt;
  }
  .sig-box .label { font-weight: 700; margin-bottom: 6pt; }
  .sig-box .meta { font-size: 9.5pt; color: #555; line-height: 1.5; }
  .sig-box .sig-area { margin-top: 16pt; min-height: 60pt; border-bottom: 1px solid #ccc; }
  .sig-placeholder { color: #999; font-size: 10pt; }
  .footer {
    margin-top: 18pt;
    padding-top: 10pt;
    border-top: 1px dashed #ccc;
    font-size: 9pt;
    color: #555;
    text-align: center;
  }
</style>
</head>
<body>

<h1>비밀유지 및 손해배상 서약서</h1>
<div class="subtitle">Non-Disclosure &amp; Liability Agreement</div>

<div class="intro">
  본 서약서는 「부정경쟁방지 및 영업비밀보호에 관한 법률」(이하 "영업비밀법") 및
  관련 법령에 따라, 매장 운영 과정에서 알게 된 일체의 영업비밀과 운영정보를
  보호하기 위해 체결된다.
</div>

<div class="party">
  <div class="row"><strong>사업주</strong> ${esc(store.name)} 대표 <strong>${esc(owner.name)}</strong> (이하 "사업주")</div>
  <div class="row"><strong>근로자</strong> <strong>${esc(employee.name)}</strong> (이하 "근로자")</div>
  <div class="row"><strong>시행일</strong> ${formatDate(effectiveDate)}</div>
</div>

<div class="clause-title">제1조 (목적)</div>
<div class="clause-body">
  근로자는 사업주의 매장에서 근무하면서 알게 된 일체의 영업비밀·운영정보를
  외부에 누설하거나 부정한 목적으로 사용하지 않을 것을 서약한다.
</div>

<div class="clause-title">제2조 (비밀정보의 범위)</div>
<div class="clause-body">
  본 서약에서 "비밀정보"라 함은 사업주가 비공개로 관리하는 다음 정보 일체를 의미한다.
  <ol>
    <li>매출·지출·고객정보 등 매장 운영 데이터</li>
    <li>메뉴 레시피, 거래처 정보, 가격·할인 정책</li>
    <li>직원 인사·급여·근태 정보</li>
    <li>매장이 비공개로 관리하는 기술·영업·재무·마케팅 정보</li>
    ${extraScope ? `<li>${extraScope.replace(/\n/g, '<br/>')}</li>` : ''}
  </ol>
</div>

<div class="clause-title">제3조 (비밀유지 의무)</div>
<div class="clause-body">
  근로자는 재직 중 및 <strong>퇴직 후 ${retentionYears}년간</strong> 위 비밀정보를
  누설·복제·전송·이용하여서는 아니된다. 정당한 권한 없이 제3자에게 제공하거나
  본인의 이익을 위해 사용하는 행위 또한 금지된다.
</div>

<div class="clause-title">제4조 (반환 및 폐기)</div>
<div class="clause-body">
  근로자는 퇴직·계약 종료 시 보유한 매장 자료(서면·전자파일·메신저 자료 등 일체)를
  즉시 사업주에게 반환하거나 폐기하고, 그 사실을 사업주에게 통지한다.
</div>

<div class="clause-title">제5조 (영업비밀 침해 시 책임)</div>
<div class="clause-body">
  본 서약을 위반하여 매장의 영업비밀을 누설·사용한 경우 근로자는 다음 법적 책임을 진다.
  <ol>
    <li>「영업비밀법」 제18조에 따라 <strong>10년 이하의 징역 또는 5억원 이하의 벌금</strong>에 처해질 수 있다.</li>
    <li>동법 제11조에 따라 사업주에게 발생한 모든 손해를 배상한다.</li>
    <li>사업주는 영업비밀 침해에 대해 <strong>형사고소 및 가처분 신청</strong> 등 모든 법적 조치를 강구할 수 있다.</li>
  </ol>
</div>

<div class="clause-title">제6조 (무단이탈 시 책임)</div>
<div class="clause-body">
  근로자가 정당한 인수인계 절차 없이 무단 이탈하여 매장 운영에 구체적 손해
  (영업 차질, 거래처 신뢰 손상, 대체 인력 채용 지출 등)가 발생한 경우,
  사업주는 다음 절차를 진행할 수 있다.
  <ol>
    <li><strong>내용증명을 통한 사전 통지</strong> 및 손해 산정 청구</li>
    <li>민법 제390조에 따른 <strong>채무불이행 손해배상 청구 소송</strong></li>
    <li>업무 방해 행위가 동반된 경우 <strong>형법 제314조 업무방해죄로 형사고소 절차</strong> 검토</li>
  </ol>
  <div class="warn">
    ※ 본 조항은 근로자의 사직 자유를 제한하지 않으며, 무단 이탈로 인해 사업주에게
    객관적·구체적 손해가 발생한 경우에 한해 적용된다.
  </div>
</div>

<div class="clause-title">제7조 (관할 및 효력)</div>
<div class="clause-body">
  본 서약과 관련한 분쟁은 사업주 매장 소재지 관할 법원을 제1심 관할법원으로 하며,
  본 서약은 시행일로부터 효력이 발생한다. 본 서약서는 사업주와 근로자가 각 1부씩 보관한다.
</div>

<div style="text-align:center; margin-top:24pt; font-size:11pt;">
  서약 체결일: <strong>${formatDate(new Date().toISOString())}</strong>
</div>

<div class="signature-row">
  <div class="sig-box">
    <div class="label">사업주 (사용자)</div>
    <div class="meta">
      사업장명: ${esc(store.name)}<br />
      사업자등록번호: ${esc(store.business_no ?? '________________')}<br />
      주소: ${esc(store.address)}<br />
      대표자: ${esc(owner.name)}
    </div>
    <div class="sig-area">${ownerSig}</div>
  </div>
  <div class="sig-box">
    <div class="label">근로자</div>
    <div class="meta">
      성명: ${esc(employee.name)}<br />
      연락처: ${esc(employee.phone ?? '________________')}<br />
      이메일: ${esc(employee.email)}
    </div>
    <div class="sig-area">${employeeSig}</div>
  </div>
</div>

<div class="footer">
  본 서약서는 「전자서명법」에 따른 전자서명으로 체결된 계약이며, 종이 서명과 동일한 법적 효력을 가집니다.<br />
  서명 일시: 사업주 ${contract.owner_signed_at ?? '________________'} /
  근로자 ${contract.employee_signed_at ?? '________________'}<br />
  생성: 리테일메이트 (RetailMate) — 자영업자 올인원 플랫폼
</div>

</body>
</html>`;
}
