import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { getMonthlyReport } from '@/lib/reports/data';
import { currentYearMonth } from '@/lib/utils';
import { EXPENSE_CATEGORY_LABEL, SALE_CHANNEL_LABEL } from '@/lib/constants';

export const runtime = 'nodejs';

const KRW = '"₩"#,##0;[Red]-"₩"#,##0';
const PCT = '0.0"%"';
const HEADER_FILL = 'FF6366F1';
const TITLE_FILL = 'FFEEF0FE';

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  row.height = 24;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get('month') ?? currentYearMonth();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 });
  const store = { id: adminStore.storeId, name: adminStore.storeName };

  const report = await getMonthlyReport(supabase, store.id, store.name, month);
  const pastDays = report.dailySeries.filter((d) => d.sales !== null);
  const salesDays = pastDays.filter((d) => (d.sales ?? 0) > 0).length;
  const avgDaily = salesDays > 0 ? Math.round(report.totalSales / salesDays) : 0;

  const wb = new ExcelJS.Workbook();
  wb.creator = '리테일메이트';
  wb.created = new Date();

  // ── Sheet 1. 요약 ─────────────────────────────────────────────
  const sum = wb.addWorksheet('월간 요약', { views: [{ state: 'frozen', ySplit: 4 }] });
  sum.columns = [
    { key: 'a', width: 24 },
    { key: 'b', width: 18 },
    { key: 'c', width: 14 },
  ];
  // 타이틀 블록
  sum.mergeCells('A1:C1');
  const t = sum.getCell('A1');
  t.value = `${store.name} · ${month} 월간 리포트`;
  t.font = { bold: true, size: 15, color: { argb: 'FF3A3F73' } };
  t.alignment = { vertical: 'middle' };
  sum.getRow(1).height = 30;
  sum.mergeCells('A2:C2');
  sum.getCell('A2').value = `생성: ${new Date().toLocaleString('ko-KR')} · 리테일메이트`;
  sum.getCell('A2').font = { size: 9, color: { argb: 'FF94A3B8' } };
  sum.addRow([]);

  // KPI 헤더
  const kpiHead = sum.addRow(['핵심 지표', '값', '비고']);
  styleHeaderRow(kpiHead);
  const kpis: Array<[string, number | string, string]> = [
    ['매출 합계', report.totalSales, '100%'],
    ['지출 합계', report.totalExpenses, report.totalSales > 0 ? `매출의 ${(report.totalExpenses / report.totalSales * 100).toFixed(1)}%` : '-'],
    ['영업이익', report.profit, `이익률 ${report.profitRate.toFixed(1)}%`],
    ['영업일수(매출 발생일)', salesDays, '일'],
    ['일평균 매출', avgDaily, '영업일 기준'],
  ];
  kpis.forEach(([label, val, note], i) => {
    const r = sum.addRow([label, val, note]);
    if (typeof val === 'number' && label !== '영업일수(매출 발생일)') r.getCell(2).numFmt = KRW;
    if (label === '영업이익') {
      r.font = { bold: true };
      r.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } }; });
    } else if (i % 2 === 1) {
      r.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_FILL } }; });
    }
  });

  sum.addRow([]);
  const chHead = sum.addRow(['결제수단별 매출', '금액', '비중']);
  styleHeaderRow(chHead);
  report.salesByChannel.filter((c) => c.amount > 0).forEach((c) => {
    const r = sum.addRow([c.label, c.amount, c.ratio / 100]);
    r.getCell(2).numFmt = KRW; r.getCell(3).numFmt = PCT;
  });

  sum.addRow([]);
  const catHead = sum.addRow(['카테고리별 지출', '금액', '비중']);
  styleHeaderRow(catHead);
  report.expensesByCategory.filter((c) => c.amount > 0).forEach((c) => {
    const r = sum.addRow([c.label, c.amount, c.ratio / 100]);
    r.getCell(2).numFmt = KRW; r.getCell(3).numFmt = PCT;
  });

  // ── Sheet 2. 일자별 추이 ─────────────────────────────────────────────
  const daily = wb.addWorksheet('일자별 추이', { views: [{ state: 'frozen', ySplit: 1 }] });
  daily.columns = [
    { header: '날짜', key: 'date', width: 14 },
    { header: '매출', key: 'sales', width: 16, style: { numFmt: KRW } },
    { header: '지출', key: 'expenses', width: 16, style: { numFmt: KRW } },
    { header: '순이익', key: 'profit', width: 16, style: { numFmt: KRW } },
  ];
  styleHeaderRow(daily.getRow(1));
  pastDays.forEach((d) => daily.addRow({ date: d.date, sales: d.sales ?? 0, expenses: d.expenses ?? 0, profit: d.profit ?? 0 }));
  const dTotal = daily.addRow({ date: '합계', sales: report.totalSales, expenses: report.totalExpenses, profit: report.profit });
  dTotal.font = { bold: true };
  dTotal.eachCell((c) => { c.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } }; });
  daily.autoFilter = 'A1:D1';

  // ── Sheet 3. 매출 내역 ─────────────────────────────────────────────
  const salesSheet = wb.addWorksheet('매출 내역', { views: [{ state: 'frozen', ySplit: 1 }] });
  salesSheet.columns = [
    { header: '날짜', key: 'date', width: 14 },
    { header: '결제수단', key: 'channel', width: 12 },
    { header: '금액', key: 'amount', width: 16, style: { numFmt: KRW } },
    { header: '메모', key: 'memo', width: 34 },
  ];
  styleHeaderRow(salesSheet.getRow(1));
  report.sales.forEach((s) => salesSheet.addRow({ date: s.sale_date, channel: SALE_CHANNEL_LABEL[s.channel], amount: Number(s.amount), memo: s.memo ?? '' }));
  if (report.sales.length === 0) salesSheet.addRow({ date: '(매출 기록 없음)' });
  salesSheet.autoFilter = 'A1:D1';

  // ── Sheet 4. 지출 내역 ─────────────────────────────────────────────
  const expSheet = wb.addWorksheet('지출 내역', { views: [{ state: 'frozen', ySplit: 1 }] });
  expSheet.columns = [
    { header: '날짜', key: 'date', width: 14 },
    { header: '카테고리', key: 'category', width: 14 },
    { header: '금액', key: 'amount', width: 16, style: { numFmt: KRW } },
    { header: '항목', key: 'item', width: 20 },
    { header: '거래처', key: 'vendor', width: 18 },
    { header: '메모', key: 'memo', width: 28 },
  ];
  styleHeaderRow(expSheet.getRow(1));
  report.expenses.forEach((e) => expSheet.addRow({
    date: e.expense_date, category: EXPENSE_CATEGORY_LABEL[e.category], amount: Number(e.amount),
    item: (e as { item_name?: string }).item_name ?? '', vendor: e.vendor ?? '', memo: e.memo ?? '',
  }));
  if (report.expenses.length === 0) expSheet.addRow({ date: '(지출 기록 없음)' });
  expSheet.autoFilter = 'A1:F1';

  const buffer = await wb.xlsx.writeBuffer();
  const filename = encodeURIComponent(`리테일메이트_${store.name}_${month}.xlsx`);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Cache-Control': 'no-store',
    },
  });
}
