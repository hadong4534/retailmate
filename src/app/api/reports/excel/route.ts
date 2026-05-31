import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminStore } from '@/lib/auth/store-context';
import { getMonthlyReport } from '@/lib/reports/data';
import { currentYearMonth } from '@/lib/utils';
import {
  EXPENSE_CATEGORY_LABEL,
  SALE_CHANNEL_LABEL,
} from '@/lib/constants';

export const runtime = 'nodejs';

const KRW = '"₩"#,##0;[Red]"-₩"#,##0';
const HEADER_FILL = 'FF1E3A8A';
const HEADER_FONT = 'FFFFFFFF';

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });
  row.height = 22;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get('month') ?? currentYearMonth();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const adminStore = await getCurrentAdminStore(supabase, user.id);
  if (!adminStore) {
    return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 });
  }
  const store = { id: adminStore.storeId, name: adminStore.storeName };

  const report = await getMonthlyReport(supabase, store.id, store.name, month);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '리테일메이트';
  workbook.created = new Date();

  // ── Sheet 1. 손익 요약 ─────────────────────────────────────────────
  const summary = workbook.addWorksheet('손익 요약');
  summary.columns = [
    { header: '항목', key: 'label', width: 22 },
    { header: '금액', key: 'amount', width: 18, style: { numFmt: KRW } },
    { header: '비중', key: 'ratio', width: 12 },
  ];
  styleHeader(summary.getRow(1));

  summary.addRow({ label: `${store.name} · ${month}`, amount: '', ratio: '' });
  summary.getCell('A2').font = { bold: true, size: 12 };
  summary.addRow({});

  summary.addRow({ label: '매출 합계', amount: report.totalSales, ratio: '100%' });
  report.salesByChannel.forEach((c) => {
    if (c.amount > 0) {
      summary.addRow({
        label: `  ${c.label}`,
        amount: c.amount,
        ratio: `${c.ratio.toFixed(1)}%`,
      });
    }
  });

  summary.addRow({});
  summary.addRow({ label: '비용 합계', amount: -report.totalExpenses, ratio: '' });
  report.expensesByCategory.forEach((c) => {
    if (c.amount > 0) {
      summary.addRow({
        label: `  ${c.label}`,
        amount: -c.amount,
        ratio: `${c.ratio.toFixed(1)}%`,
      });
    }
  });

  summary.addRow({});
  const profitRow = summary.addRow({
    label: '영업이익',
    amount: report.profit,
    ratio: `${report.profitRate.toFixed(1)}%`,
  });
  profitRow.font = { bold: true };
  profitRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFECFDF5' },
    };
  });

  // ── Sheet 2. 일별 매출 ─────────────────────────────────────────────
  const salesSheet = workbook.addWorksheet('일별 매출');
  salesSheet.columns = [
    { header: '날짜', key: 'date', width: 14 },
    { header: '채널', key: 'channel', width: 12 },
    { header: '금액', key: 'amount', width: 16, style: { numFmt: KRW } },
    { header: '메모', key: 'memo', width: 30 },
  ];
  styleHeader(salesSheet.getRow(1));

  report.sales.forEach((s) => {
    salesSheet.addRow({
      date: s.sale_date,
      channel: SALE_CHANNEL_LABEL[s.channel],
      amount: Number(s.amount),
      memo: s.memo ?? '',
    });
  });

  if (report.sales.length === 0) {
    salesSheet.addRow({ date: '(매출 기록 없음)' });
  } else {
    const totalRow = salesSheet.addRow({
      date: '합계',
      channel: '',
      amount: report.totalSales,
      memo: '',
    });
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } };
    });
  }

  // ── Sheet 3. 비용 명세 ─────────────────────────────────────────────
  const expensesSheet = workbook.addWorksheet('비용 명세');
  expensesSheet.columns = [
    { header: '날짜', key: 'date', width: 14 },
    { header: '카테고리', key: 'category', width: 14 },
    { header: '금액', key: 'amount', width: 16, style: { numFmt: KRW } },
    { header: '거래처', key: 'vendor', width: 20 },
    { header: '메모', key: 'memo', width: 30 },
  ];
  styleHeader(expensesSheet.getRow(1));

  report.expenses.forEach((e) => {
    expensesSheet.addRow({
      date: e.expense_date,
      category: EXPENSE_CATEGORY_LABEL[e.category],
      amount: Number(e.amount),
      vendor: e.vendor ?? '',
      memo: e.memo ?? '',
    });
  });

  if (report.expenses.length === 0) {
    expensesSheet.addRow({ date: '(비용 기록 없음)' });
  } else {
    const totalRow = expensesSheet.addRow({
      date: '합계',
      category: '',
      amount: report.totalExpenses,
      vendor: '',
      memo: '',
    });
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = encodeURIComponent(`리테일메이트_${store.name}_${month}.xlsx`);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Cache-Control': 'no-store',
    },
  });
}
