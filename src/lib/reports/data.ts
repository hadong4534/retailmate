import type { SupabaseClient } from '@supabase/supabase-js';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABEL,
  SALE_CHANNELS,
  SALE_CHANNEL_LABEL,
  type ExpenseCategory,
  type SaleChannel,
} from '@/lib/constants';
import { getMonthRange, todayInKST } from '@/lib/utils';

export interface SaleRow {
  id: string;
  sale_date: string;
  channel: SaleChannel;
  amount: number;
  memo: string | null;
}

export interface ExpenseRow {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string | null;
  memo: string | null;
}

export interface MonthlyReport {
  storeName: string;
  month: string;
  start: string;
  end: string;
  sales: SaleRow[];
  expenses: ExpenseRow[];
  totalSales: number;
  totalExpenses: number;
  profit: number;
  profitRate: number;
  salesByChannel: Array<{ channel: SaleChannel; label: string; amount: number; ratio: number }>;
  expensesByCategory: Array<{ category: ExpenseCategory; label: string; amount: number; ratio: number }>;
  /** null = 미도래(미래 날짜). 0 = 실제 0원. */
  dailySeries: Array<{ date: string; day: number; sales: number | null; expenses: number | null; profit: number | null }>;
}

export async function getMonthlyReport(
  supabase: SupabaseClient,
  storeId: string,
  storeName: string,
  month: string,
): Promise<MonthlyReport> {
  const { start, end } = getMonthRange(month);

  const [salesRes, expensesRes] = await Promise.all([
    supabase
      .from('sales')
      .select('id, sale_date, channel, amount, memo')
      .eq('store_id', storeId)
      .gte('sale_date', start)
      .lte('sale_date', end)
      .order('sale_date', { ascending: true }),
    supabase
      .from('expenses')
      .select('id, expense_date, category, amount, vendor, memo')
      .eq('store_id', storeId)
      .gte('expense_date', start)
      .lte('expense_date', end)
      .order('expense_date', { ascending: true }),
  ]);

  const sales = (salesRes.data ?? []) as SaleRow[];
  const expenses = (expensesRes.data ?? []) as ExpenseRow[];

  const totalSales = sales.reduce((acc, r) => acc + Number(r.amount), 0);
  const totalExpenses = expenses.reduce((acc, r) => acc + Number(r.amount), 0);
  const profit = totalSales - totalExpenses;
  const profitRate = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  const channelTotals: Record<SaleChannel, number> = SALE_CHANNELS.reduce(
    (acc, c) => ({ ...acc, [c]: 0 }),
    {} as Record<SaleChannel, number>,
  );
  sales.forEach((r) => { channelTotals[r.channel] += Number(r.amount); });
  const salesByChannel = SALE_CHANNELS.map((c) => ({
    channel: c,
    label: SALE_CHANNEL_LABEL[c],
    amount: channelTotals[c],
    ratio: totalSales > 0 ? (channelTotals[c] / totalSales) * 100 : 0,
  }));

  const categoryTotals: Record<ExpenseCategory, number> = {
    material: 0, labor: 0, rent: 0, utility: 0,
    communication: 0, marketing: 0, tax: 0, etc: 0,
  };
  expenses.forEach((r) => { categoryTotals[r.category] += Number(r.amount); });
  const expensesByCategory = EXPENSE_CATEGORIES.map((c) => ({
    category: c,
    label: EXPENSE_CATEGORY_LABEL[c],
    amount: categoryTotals[c],
    ratio: totalExpenses > 0 ? (categoryTotals[c] / totalExpenses) * 100 : 0,
  }));

  const [yStr, mStr] = month.split('-');
  const lastDay = new Date(Number(yStr), Number(mStr), 0).getDate();
  const todayStr = todayInKST();
  const dailySeries: MonthlyReport['dailySeries'] = [];
  for (let day = 1; day <= lastDay; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const isFuture = date > todayStr;
    if (isFuture) {
      dailySeries.push({ date, day, sales: null, expenses: null, profit: null });
      continue;
    }
    const daySales = sales
      .filter((r) => r.sale_date === date)
      .reduce((a, r) => a + Number(r.amount), 0);
    const dayExpenses = expenses
      .filter((r) => r.expense_date === date)
      .reduce((a, r) => a + Number(r.amount), 0);
    dailySeries.push({
      date,
      day,
      sales: daySales,
      expenses: dayExpenses,
      profit: daySales - dayExpenses,
    });
  }

  return {
    storeName,
    month,
    start,
    end,
    sales,
    expenses,
    totalSales,
    totalExpenses,
    profit,
    profitRate,
    salesByChannel,
    expensesByCategory,
    dailySeries,
  };
}
