import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { ContractTemplateData } from './template';

/**
 * 한글 PDF 생성기 — pdf-lib + NotoSansKR (jsDelivr CDN fetch + 메모리 캐시).
 *
 * 주의: 매 PDF 생성마다 폰트 fetch가 일어나면 지출·지연이 발생하므로 module-level 캐시.
 * Next.js dev/prod에서 module은 process 단위로 유지되어 첫 호출 후 메모리 상주.
 */

const NOTO_REGULAR_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/Korean/NotoSansKR-Regular.otf';
const NOTO_BOLD_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/Korean/NotoSansKR-Bold.otf';

let cachedRegular: ArrayBuffer | null = null;
let cachedBold: ArrayBuffer | null = null;

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`폰트 다운로드 실패: ${res.status}`);
  return res.arrayBuffer();
}

async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (!cachedRegular) cachedRegular = await fetchFont(NOTO_REGULAR_URL);
  if (!cachedBold) cachedBold = await fetchFont(NOTO_BOLD_URL);
  return { regular: cachedRegular, bold: cachedBold };
}

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 50;

const TYPE_KO: Record<string, string> = {
  fulltime: '정규직 (기간의 정함이 없는 근로계약)',
  parttime: '단시간 근로자 (시간제)',
  daily: '계약직 (기간제)',
  nda: '비밀유지 및 손해배상 서약서',
};

const WAGE_KO: Record<string, string> = {
  hourly: '시급',
  monthly: '월급',
  daily: '일급',
};

const DAY_KO: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};

function formatKoreanDate(s: string | null | undefined): string {
  if (!s) return '________________';
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '-';
  const [h, m] = t.split(':');
  return `${h}시 ${m}분`;
}

interface DrawCtx {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  pdfDoc: PDFDocument;
}

function newPage(ctx: DrawCtx): DrawCtx {
  const page = ctx.pdfDoc.addPage([PAGE_W, PAGE_H]);
  return { ...ctx, page, y: PAGE_H - MARGIN };
}

function ensureSpace(ctx: DrawCtx, needed: number): DrawCtx {
  if (ctx.y - needed < MARGIN) return newPage(ctx);
  return ctx;
}

function drawText(
  ctx: DrawCtx,
  text: string,
  opts: { x?: number; size?: number; bold?: boolean; color?: [number, number, number] } = {},
): DrawCtx {
  const size = opts.size ?? 10;
  const x = opts.x ?? MARGIN;
  const font = opts.bold ? ctx.fontBold : ctx.font;
  const color = opts.color ?? [0.07, 0.09, 0.15];
  ctx.page.drawText(text, {
    x,
    y: ctx.y,
    size,
    font,
    color: rgb(color[0], color[1], color[2]),
  });
  return ctx;
}

function drawLine(ctx: DrawCtx, color: [number, number, number] = [0.85, 0.86, 0.9]): DrawCtx {
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: rgb(color[0], color[1], color[2]),
  });
  return ctx;
}

function drawRow(
  ctx: DrawCtx,
  label: string,
  value: string,
  options: { rowHeight?: number } = {},
): DrawCtx {
  const rowHeight = options.rowHeight ?? 22;
  let c = ensureSpace(ctx, rowHeight + 4);

  // 좌측 라벨 배경
  c.page.drawRectangle({
    x: MARGIN,
    y: c.y - rowHeight + 4,
    width: 110,
    height: rowHeight,
    color: rgb(0.95, 0.96, 0.97),
    borderColor: rgb(0.6, 0.65, 0.7),
    borderWidth: 0.5,
  });
  // 우측 칸 보더
  c.page.drawRectangle({
    x: MARGIN + 110,
    y: c.y - rowHeight + 4,
    width: PAGE_W - 2 * MARGIN - 110,
    height: rowHeight,
    borderColor: rgb(0.6, 0.65, 0.7),
    borderWidth: 0.5,
  });

  // 라벨 텍스트
  c.page.drawText(label, {
    x: MARGIN + 8,
    y: c.y - rowHeight + 11,
    size: 10,
    font: c.fontBold,
    color: rgb(0.07, 0.09, 0.15),
  });

  // 값 텍스트 (자동 줄바꿈은 단순화 — 길면 자르거나 다음 줄로)
  c.page.drawText(value, {
    x: MARGIN + 118,
    y: c.y - rowHeight + 11,
    size: 10,
    font: c.font,
    color: rgb(0.07, 0.09, 0.15),
  });

  c = { ...c, y: c.y - rowHeight - 2 };
  return c;
}

export async function generateContractPDF(data: ContractTemplateData): Promise<Uint8Array> {
  // NDA(비밀유지서약서)는 별도 레이아웃으로 분기
  if (data.contract.contract_type === 'nda') {
    return generateNDAPDF(data);
  }

  const { contract, store, owner, employee } = data;

  const { regular, bold } = await loadFonts();

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const font = await pdfDoc.embedFont(regular);
  const fontBold = await pdfDoc.embedFont(bold);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let ctx: DrawCtx = { pdfDoc, page, font, fontBold, y: PAGE_H - MARGIN };

  // ── 타이틀 ─────────────────────────────────────────────────────────────
  ctx = drawText(ctx, '표 준 근 로 계 약 서', {
    x: PAGE_W / 2 - 80,
    size: 18,
    bold: true,
  });
  ctx = { ...ctx, y: ctx.y - 18 };
  ctx = drawText(ctx, TYPE_KO[contract.contract_type] ?? '', {
    x: PAGE_W / 2 - 90,
    size: 9,
    color: [0.4, 0.45, 0.5],
  });
  ctx = { ...ctx, y: ctx.y - 24 };

  // ── 인트로 ─────────────────────────────────────────────────────────────
  const introLines = [
    `사업주 ${store.name}의 대표 ${owner.name}(이하 "사용자")와`,
    `근로자 ${employee.name}(이하 "근로자")은 다음과 같이 근로계약을 체결한다.`,
  ];
  for (const line of introLines) {
    ctx = drawText(ctx, line, { size: 10 });
    ctx = { ...ctx, y: ctx.y - 14 };
  }
  ctx = { ...ctx, y: ctx.y - 8 };

  // ── 계약 항목 표 ─────────────────────────────────────────────────────
  const period = contract.work_end_date
    ? `${formatKoreanDate(contract.work_start_date)} ~ ${formatKoreanDate(contract.work_end_date)}`
    : `${formatKoreanDate(contract.work_start_date)} 부터 (기간의 정함 없음)`;
  ctx = drawRow(ctx, '1. 근로계약기간', period);
  ctx = drawRow(ctx, '2. 근무 장소', contract.workplace_address);
  ctx = drawRow(ctx, '3. 업무의 내용', contract.job_description);

  const days = (contract.work_days ?? []).map((d) => DAY_KO[d] ?? d).join(', ') + '요일';
  ctx = drawRow(ctx, '4. 소정근로일', days);

  ctx = drawRow(
    ctx,
    '5. 소정근로시간',
    `${formatTime(contract.work_start_time)} ~ ${formatTime(contract.work_end_time)} (휴게 ${contract.break_minutes}분)`,
  );

  const wageStr = `${WAGE_KO[contract.wage_type]} ${contract.wage_amount.toLocaleString('ko-KR')}원 / 매월 ${contract.pay_day}일 ${contract.pay_method ?? '계좌이체'}`;
  ctx = drawRow(ctx, '6. 임금', wageStr, { rowHeight: 28 });

  const insurance = contract.social_insurance ?? {
    national_pension: false, health_insurance: false,
    employment_insurance: false, industrial_accident: false,
  };
  const insuranceList = [
    insurance.national_pension && '국민연금',
    insurance.health_insurance && '건강보험',
    insurance.employment_insurance && '고용보험',
    insurance.industrial_accident && '산재보험',
  ].filter(Boolean).join(', ') || '미가입';
  ctx = drawRow(ctx, '7. 사회보험', insuranceList);

  ctx = drawRow(
    ctx,
    '8. 연차유급휴가',
    contract.annual_leave_policy ?? '근로기준법에 따라 부여',
  );

  if (contract.additional_terms) {
    ctx = drawRow(ctx, '9. 기타 약정', contract.additional_terms.slice(0, 80));
  }

  // ── 종류별 특약 조항 (정규/단시간/계약직 차도화) ──────────────────────
  ctx = drawTypeSpecificClausesPDF(ctx, contract);

  // ── 일반조건 ──────────────────────────────────────────────────────────
  ctx = { ...ctx, y: ctx.y - 14 };
  ctx = ensureSpace(ctx, 80);
  ctx = drawText(ctx, '근로계약 일반조건', { size: 11, bold: true });
  ctx = { ...ctx, y: ctx.y - 4 };
  ctx = drawLine(ctx);
  ctx = { ...ctx, y: ctx.y - 12 };

  const generalLines = [
    '① 근로자가 정당한 사유 없이 결근하거나 지각하는 경우 사업주는',
    '   근로기준법에 따라 임금에서 공제할 수 있다.',
    '② 사업주는 근로자에게 매월 임금명세서를 교부한다.',
    '③ 본 계약서에 명시되지 않은 사항은 근로기준법, 최저임금법 등',
    '   관련 법령에 따른다.',
    '④ 본 계약서는 1부씩 사업주와 근로자가 보관한다.',
  ];
  for (const line of generalLines) {
    ctx = ensureSpace(ctx, 14);
    ctx = drawText(ctx, line, { size: 9.5 });
    ctx = { ...ctx, y: ctx.y - 13 };
  }

  // ── 위치정보 동의 ──────────────────────────────────────────────────────
  ctx = { ...ctx, y: ctx.y - 10 };
  ctx = ensureSpace(ctx, 80);
  ctx = drawText(ctx, '위치정보 수집·이용에 관한 동의 (선택동의)', {
    size: 11,
    bold: true,
  });
  ctx = { ...ctx, y: ctx.y - 4 };
  ctx = drawLine(ctx);
  ctx = { ...ctx, y: ctx.y - 12 };

  const gpsLines = [
    '근로자는 출퇴근 GPS 인증을 위해 다음 항목의 위치정보 수집·이용에 동의한다.',
    ' • 수집 항목: 출퇴근 시점의 GPS 좌표 (위도/경도)',
    ' • 이용 목적: 매장 반경 내 출퇴근 인증, 근태 관리',
    ' • 보유 기간: 계약 종료 후 1년',
    ' • 거부 권리: 동의를 거부할 수 있으며, 거부 시 GPS 출퇴근 기능 사용이 제한된다.',
  ];
  for (const line of gpsLines) {
    ctx = ensureSpace(ctx, 14);
    ctx = drawText(ctx, line, { size: 9 });
    ctx = { ...ctx, y: ctx.y - 12 };
  }

  // ── 체결일 ─────────────────────────────────────────────────────────────
  ctx = { ...ctx, y: ctx.y - 14 };
  ctx = ensureSpace(ctx, 24);
  ctx = drawText(ctx, `계약 체결일: ${formatKoreanDate(new Date().toISOString().slice(0, 10))}`, {
    x: PAGE_W / 2 - 90,
    size: 11,
    bold: true,
  });
  ctx = { ...ctx, y: ctx.y - 30 };

  // ── 서명 영역 ─────────────────────────────────────────────────────────
  ctx = ensureSpace(ctx, 130);
  const sigBoxW = (PAGE_W - 2 * MARGIN - 16) / 2;
  const sigBoxH = 110;
  const sigY = ctx.y - sigBoxH;

  // 사업주 박스
  ctx.page.drawRectangle({
    x: MARGIN,
    y: sigY,
    width: sigBoxW,
    height: sigBoxH,
    borderColor: rgb(0.6, 0.65, 0.7),
    borderWidth: 0.6,
  });
  ctx.page.drawText('사업주 (사용자)', {
    x: MARGIN + 8, y: sigY + sigBoxH - 16,
    size: 11, font: fontBold, color: rgb(0.07, 0.09, 0.15),
  });
  const ownerInfo = [
    `사업장명: ${store.name}`,
    `사업자번호: ${store.business_no ?? '________________'}`,
    `대표자: ${owner.name}`,
  ];
  ownerInfo.forEach((line, i) => {
    ctx.page.drawText(line, {
      x: MARGIN + 8, y: sigY + sigBoxH - 32 - i * 12,
      size: 9, font, color: rgb(0.3, 0.35, 0.4),
    });
  });

  // 사업주 서명 이미지
  if (contract.owner_signature_image?.startsWith('data:image/png')) {
    try {
      const base64 = contract.owner_signature_image.split(',')[1];
      const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const sigImg = await pdfDoc.embedPng(imgBytes);
      const scaled = sigImg.scaleToFit(sigBoxW - 30, 50);
      ctx.page.drawImage(sigImg, {
        x: MARGIN + 15,
        y: sigY + 10,
        width: scaled.width,
        height: scaled.height,
      });
    } catch {
      // 서명 이미지 임베드 실패 — 빈 영역
    }
  }

  // 근로자 박스
  const empX = MARGIN + sigBoxW + 16;
  ctx.page.drawRectangle({
    x: empX,
    y: sigY,
    width: sigBoxW,
    height: sigBoxH,
    borderColor: rgb(0.6, 0.65, 0.7),
    borderWidth: 0.6,
  });
  ctx.page.drawText('근로자', {
    x: empX + 8, y: sigY + sigBoxH - 16,
    size: 11, font: fontBold, color: rgb(0.07, 0.09, 0.15),
  });
  const empInfo = [
    `성명: ${employee.name}`,
    `연락처: ${employee.phone ?? '________________'}`,
    `이메일: ${employee.email}`,
  ];
  empInfo.forEach((line, i) => {
    ctx.page.drawText(line, {
      x: empX + 8, y: sigY + sigBoxH - 32 - i * 12,
      size: 9, font, color: rgb(0.3, 0.35, 0.4),
    });
  });

  if (contract.employee_signature_image?.startsWith('data:image/png')) {
    try {
      const base64 = contract.employee_signature_image.split(',')[1];
      const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const sigImg = await pdfDoc.embedPng(imgBytes);
      const scaled = sigImg.scaleToFit(sigBoxW - 30, 50);
      ctx.page.drawImage(sigImg, {
        x: empX + 15,
        y: sigY + 10,
        width: scaled.width,
        height: scaled.height,
      });
    } catch {
      // skip
    }
  }

  // ── 하단 푸터 ──────────────────────────────────────────────────────────
  const footerY = sigY - 30;
  ctx.page.drawText(
    '본 계약서는 「전자서명법」에 따른 전자서명으로 체결된 계약이며, 종이 서명과 동일한 법적 효력을 가집니다.',
    {
      x: MARGIN, y: footerY,
      size: 8, font, color: rgb(0.4, 0.45, 0.5),
    },
  );
  ctx.page.drawText('생성: 리테일메이트 (RetailMate) — 자영업자 올인원 플랫폼', {
    x: MARGIN, y: footerY - 12,
    size: 8, font, color: rgb(0.4, 0.45, 0.5),
  });

  return pdfDoc.save();
}

// 폰트 미리 로드를 사이트 시작 시 호출하면 첫 PDF 생성 latency 감소
export async function preloadFonts(): Promise<void> {
  await loadFonts();
}

// StandardFonts/PDFFont 명시적 import 사용 (린터 silencing은 자제)
void StandardFonts;

// ────────────────────────────────────────────────────────────────────────────
// 종류별 특약 조항 (정규/단시간/계약직)
// ────────────────────────────────────────────────────────────────────────────

function drawTypeSpecificClausesPDF(
  ctx: DrawCtx,
  contract: ContractTemplateData['contract'],
): DrawCtx {
  let c = ctx;

  if (contract.contract_type === 'fulltime') {
    c = { ...c, y: c.y - 14 };
    c = ensureSpace(c, 80);
    c = drawText(c, '정규직 특약사항', { size: 11, bold: true });
    c = { ...c, y: c.y - 4 };
    c = drawLine(c);
    c = { ...c, y: c.y - 12 };
    const lines = [
      '① 본 계약은 기간의 정함이 없는 근로계약으로, 근로기준법 제23조에 따라',
      '   정당한 사유 없이 해고할 수 없다.',
      '② 4대보험 가입은 의무이며, 사회보험료의 사용자 분담분을 매월 정상 납부한다.',
      '③ 연차유급휴가는 근로기준법 제60조에 따라 1년간 80% 이상 출근 시 15일 부여,',
      '   매 2년마다 1일씩 가산한다.',
      '④ 퇴직 시 근로자퇴직급여보장법에 따라 퇴직금을 지급한다 (계속근로 1년 이상).',
    ];
    for (const line of lines) {
      c = ensureSpace(c, 14);
      c = drawText(c, line, { size: 9.5 });
      c = { ...c, y: c.y - 13 };
    }
    return c;
  }

  if (contract.contract_type === 'parttime') {
    c = { ...c, y: c.y - 14 };
    c = ensureSpace(c, 90);
    c = drawText(c, '단시간 근로자 특약사항', { size: 11, bold: true });
    c = { ...c, y: c.y - 4 };
    c = drawLine(c);
    c = { ...c, y: c.y - 12 };
    const lines = [
      '근로기준법 시행령 별표2에 따라 단시간 근로자의 근로조건을 명시한다.',
      `1주 소정근로일: ${(contract.work_days as string[]).map((d) => DAY_KO[d]).join(', ') || '-'}요일`,
      `1일 근로시간: ${formatTime(contract.work_start_time)} ~ ${formatTime(contract.work_end_time)} (휴게 ${contract.break_minutes}분)`,
      '① 단시간 근로자의 임금은 통상근로자에 비례하여 산정한다.',
      '② 1주 소정근로시간이 15시간 미만인 경우 주휴수당·퇴직금이 발생하지 않을 수 있다.',
      '③ 4대보험은 1주 15시간 이상 + 1개월 이상 근로 시 가입 의무가 발생한다.',
    ];
    for (const line of lines) {
      c = ensureSpace(c, 14);
      c = drawText(c, line, { size: 9.5 });
      c = { ...c, y: c.y - 13 };
    }
    return c;
  }

  if (contract.contract_type === 'daily') {
    c = { ...c, y: c.y - 14 };
    c = ensureSpace(c, 90);
    c = drawText(c, '계약직(기간제) 근로자 특약사항', { size: 11, bold: true });
    c = { ...c, y: c.y - 4 };
    c = drawLine(c);
    c = { ...c, y: c.y - 12 };
    const endDate = contract.work_end_date
      ? formatKoreanDate(contract.work_end_date)
      : '________';
    const lines = [
      `① 본 계약은 ${endDate}까지 유효하며, 동 기간 만료 시 별도 통지 없이`,
      '   자동 종료된다.',
      '② 「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조에 따라,',
      '   2년을 초과하여 계속 근로 시 무기계약직으로 본다.',
      '③ 계약 갱신 의사는 만료일 30일 전까지 서면 또는 전자적 방법으로 통보한다.',
      '④ 정당한 사유 없이 계약 기간 중 해지할 수 없으며,',
      '   해지 시 근로기준법 제26조에 따른 해고예고 의무를 준수한다.',
    ];
    for (const line of lines) {
      c = ensureSpace(c, 14);
      c = drawText(c, line, { size: 9.5 });
      c = { ...c, y: c.y - 13 };
    }
    return c;
  }

  return c;
}

// ────────────────────────────────────────────────────────────────────────────
// NDA(비밀유지서약서) PDF 생성기
// ────────────────────────────────────────────────────────────────────────────

/** 길이 제한된 줄로 분할 — Korean 기준 lineMaxChars 글자수 단위 */
function wrapText(text: string, lineMaxChars: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    if (para.length === 0) {
      lines.push('');
      continue;
    }
    for (let i = 0; i < para.length; i += lineMaxChars) {
      lines.push(para.slice(i, i + lineMaxChars));
    }
  }
  return lines;
}

function drawWrapped(
  ctx: DrawCtx,
  text: string,
  opts: { x?: number; size?: number; bold?: boolean; lineHeight?: number; maxChars?: number } = {},
): DrawCtx {
  const size = opts.size ?? 10;
  const lineHeight = opts.lineHeight ?? size + 4;
  const maxChars = opts.maxChars ?? 48;
  let c = ctx;
  for (const line of wrapText(text, maxChars)) {
    c = ensureSpace(c, lineHeight);
    c = drawText(c, line, { x: opts.x, size, bold: opts.bold });
    c = { ...c, y: c.y - lineHeight };
  }
  return c;
}

async function generateNDAPDF(data: ContractTemplateData): Promise<Uint8Array> {
  const { contract, store, owner, employee } = data;
  const { regular, bold } = await loadFonts();

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(regular);
  const fontBold = await pdfDoc.embedFont(bold);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let ctx: DrawCtx = { pdfDoc, page, font, fontBold, y: PAGE_H - MARGIN };

  // ── 타이틀 ──
  ctx = drawText(ctx, '비밀유지 및 손해배상 서약서', {
    x: PAGE_W / 2 - 90,
    size: 17,
    bold: true,
  });
  ctx = { ...ctx, y: ctx.y - 18 };
  ctx = drawText(ctx, 'Non-Disclosure & Liability Agreement', {
    x: PAGE_W / 2 - 90,
    size: 9,
    color: [0.4, 0.45, 0.5],
  });
  ctx = { ...ctx, y: ctx.y - 24 };

  // ── 인트로 ──
  ctx = drawWrapped(
    ctx,
    `본 서약서는 「부정경쟁방지 및 영업비밀보호에 관한 법률」(이하 "영업비밀법") 및 관련 법령에 따라, 매장 운영 과정에서 알게 된 일체의 영업비밀과 운영정보를 보호하기 위해 체결된다.`,
    { size: 10, lineHeight: 14 },
  );
  ctx = { ...ctx, y: ctx.y - 8 };

  // ── 당사자 정보 ──
  ctx = drawText(ctx, `사업주 ${store.name} 대표 ${owner.name} (이하 "사업주")`, { size: 10 });
  ctx = { ...ctx, y: ctx.y - 14 };
  ctx = drawText(ctx, `근로자 ${employee.name} (이하 "근로자")`, { size: 10 });
  ctx = { ...ctx, y: ctx.y - 14 };
  ctx = drawText(ctx, `시행일 ${formatKoreanDate(contract.work_start_date)}`, { size: 10 });
  ctx = { ...ctx, y: ctx.y - 18 };

  // 조항 헬퍼
  const drawClause = (c: DrawCtx, title: string, body: string): DrawCtx => {
    let next = ensureSpace(c, 60);
    next = drawText(next, title, { size: 11, bold: true });
    next = { ...next, y: next.y - 14 };
    next = drawLine(next);
    next = { ...next, y: next.y - 12 };
    next = drawWrapped(next, body, { size: 10, lineHeight: 14, x: MARGIN + 8 });
    next = { ...next, y: next.y - 6 };
    return next;
  };

  const retentionYears = contract.nda_retention_years ?? 3;
  const extraScope = contract.nda_info_scope?.trim();

  ctx = drawClause(
    ctx,
    '제1조 (목적)',
    '근로자는 사업주의 매장에서 근무하면서 알게 된 일체의 영업비밀·운영정보를 외부에 누설하거나 부정한 목적으로 사용하지 않을 것을 서약한다.',
  );

  const scopeLines = [
    '본 서약에서 "비밀정보"라 함은 사업주가 비공개로 관리하는 다음 정보 일체를 의미한다.',
    '① 매출·지출·고객정보 등 매장 운영 데이터',
    '② 메뉴 레시피, 거래처 정보, 가격·할인 정책',
    '③ 직원 인사·급여·근태 정보',
    '④ 매장이 비공개로 관리하는 기술·영업·재무·마케팅 정보',
  ];
  if (extraScope) scopeLines.push(`⑤ ${extraScope.replace(/\n/g, ' ')}`);
  ctx = drawClause(ctx, '제2조 (비밀정보의 범위)', scopeLines.join('\n'));

  ctx = drawClause(
    ctx,
    '제3조 (비밀유지 의무)',
    `근로자는 재직 중 및 퇴직 후 ${retentionYears}년간 위 비밀정보를 누설·복제·전송·이용하여서는 아니된다. 정당한 권한 없이 제3자에게 제공하거나 본인의 이익을 위해 사용하는 행위 또한 금지된다.`,
  );

  ctx = drawClause(
    ctx,
    '제4조 (반환 및 폐기)',
    '근로자는 퇴직·계약 종료 시 보유한 매장 자료(서면·전자파일·메신저 자료 등 일체)를 즉시 사업주에게 반환하거나 폐기하고, 그 사실을 사업주에게 통지한다.',
  );

  ctx = drawClause(
    ctx,
    '제5조 (영업비밀 침해 시 책임)',
    [
      '본 서약을 위반하여 매장의 영업비밀을 누설·사용한 경우 근로자는 다음 법적 책임을 진다.',
      '① 「영업비밀법」 제18조에 따라 10년 이하의 징역 또는 5억원 이하의 벌금에 처해질 수 있다.',
      '② 동법 제11조에 따라 사업주에게 발생한 모든 손해를 배상한다.',
      '③ 사업주는 영업비밀 침해에 대해 형사고소 및 가처분 신청 등 모든 법적 조치를 강구할 수 있다.',
    ].join('\n'),
  );

  ctx = drawClause(
    ctx,
    '제6조 (무단이탈 시 책임)',
    [
      '근로자가 정당한 인수인계 절차 없이 무단 이탈하여 매장 운영에 구체적 손해(영업 차질, 거래처 신뢰 손상, 대체 인력 채용 지출 등)가 발생한 경우, 사업주는 다음 절차를 진행할 수 있다.',
      '① 내용증명을 통한 사전 통지 및 손해 산정 청구',
      '② 민법 제390조에 따른 채무불이행 손해배상 청구 소송',
      '③ 업무 방해 행위가 동반된 경우 형법 제314조 업무방해죄로 형사고소 절차 검토',
      '※ 본 조항은 근로자의 사직 자유를 제한하지 않으며, 무단 이탈로 인해 사업주에게 객관적·구체적 손해가 발생한 경우에 한해 적용된다.',
    ].join('\n'),
  );

  ctx = drawClause(
    ctx,
    '제7조 (관할 및 효력)',
    '본 서약과 관련한 분쟁은 사업주 매장 소재지 관할 법원을 제1심 관할법원으로 하며, 본 서약은 시행일로부터 효력이 발생한다. 본 서약서는 사업주와 근로자가 각 1부씩 보관한다.',
  );

  ctx = { ...ctx, y: ctx.y - 6 };
  ctx = ensureSpace(ctx, 14);
  ctx = drawText(
    ctx,
    `서약 체결일: ${formatKoreanDate(new Date().toISOString())}`,
    { x: PAGE_W / 2 - 60, size: 10, bold: true },
  );
  ctx = { ...ctx, y: ctx.y - 24 };

  // ── 서명란 ──
  ctx = ensureSpace(ctx, 130);
  const sigBoxW = (PAGE_W - 2 * MARGIN - 20) / 2;
  const sigY = ctx.y - 110;

  // 사업주 박스
  ctx.page.drawRectangle({
    x: MARGIN,
    y: sigY,
    width: sigBoxW,
    height: 110,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.5,
  });
  let sigCtx: DrawCtx = { ...ctx, y: ctx.y - 14 };
  sigCtx = drawText(sigCtx, '사업주 (사용자)', { x: MARGIN + 10, size: 10, bold: true });
  sigCtx = { ...sigCtx, y: sigCtx.y - 14 };
  sigCtx = drawText(sigCtx, `사업장: ${store.name}`, { x: MARGIN + 10, size: 9, color: [0.35, 0.4, 0.5] });
  sigCtx = { ...sigCtx, y: sigCtx.y - 12 };
  sigCtx = drawText(sigCtx, `대표자: ${owner.name}`, { x: MARGIN + 10, size: 9, color: [0.35, 0.4, 0.5] });

  // 근로자 박스
  const empX = MARGIN + sigBoxW + 20;
  ctx.page.drawRectangle({
    x: empX,
    y: sigY,
    width: sigBoxW,
    height: 110,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.5,
  });
  let empCtx: DrawCtx = { ...ctx, y: ctx.y - 14 };
  empCtx = drawText(empCtx, '근로자', { x: empX + 10, size: 10, bold: true });
  empCtx = { ...empCtx, y: empCtx.y - 14 };
  empCtx = drawText(empCtx, `성명: ${employee.name}`, { x: empX + 10, size: 9, color: [0.35, 0.4, 0.5] });
  empCtx = { ...empCtx, y: empCtx.y - 12 };
  if (employee.phone) {
    empCtx = drawText(empCtx, `연락처: ${employee.phone}`, { x: empX + 10, size: 9, color: [0.35, 0.4, 0.5] });
  }

  // 서명 이미지 (있으면)
  if (contract.owner_signature_image?.startsWith('data:image')) {
    try {
      const b64 = contract.owner_signature_image.split(',')[1];
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const img = await pdfDoc.embedPng(bytes);
      ctx.page.drawImage(img, {
        x: MARGIN + 10,
        y: sigY + 6,
        width: 100,
        height: 40,
      });
    } catch {
      // 무시
    }
  }
  if (contract.employee_signature_image?.startsWith('data:image')) {
    try {
      const b64 = contract.employee_signature_image.split(',')[1];
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const img = await pdfDoc.embedPng(bytes);
      ctx.page.drawImage(img, {
        x: empX + 10,
        y: sigY + 6,
        width: 100,
        height: 40,
      });
    } catch {
      // 무시
    }
  }

  void page;
  return pdfDoc.save();
}
