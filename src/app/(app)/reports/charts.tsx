'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { EXPENSE_CATEGORY_COLOR, type ExpenseCategory } from '@/lib/constants';

const tooltipStyle = {
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 12,
};

function formatTick(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function toKRW(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return `₩${n.toLocaleString('ko-KR')}`;
}

interface DailyDatum {
  day: number;
  /** null = 미도래(미래 날짜). 0 = 실제 영(zero) */
  sales: number | null;
  expenses: number | null;
  profit: number | null;
}

export function DailyTrendChart({ data }: { data: DailyDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(d) => `${d}일`}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(label) => `${label}일`}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                sales: '매출',
                expenses: '비용',
                profit: '이익',
              };
              const lbl = labels[String(name)] ?? String(name);
              if (value === null || value === undefined) return ['미도래', lbl];
              return [toKRW(value), lbl];
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                sales: '매출',
                expenses: '비용',
                profit: '이익',
              };
              return labels[value] ?? value;
            }}
          />
          <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="profit" stroke="#059669" strokeWidth={2} dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CategoryDatum {
  category: ExpenseCategory;
  label: string;
  amount: number;
}

export function CategoryPieChart({ data }: { data: CategoryDatum[] }) {
  const filtered = data.filter((d) => d.amount > 0);
  if (filtered.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        비용 기록이 없습니다.
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="amount"
            nameKey="label"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            stroke="white"
            strokeWidth={2}
          >
            {filtered.map((entry) => (
              <Cell key={entry.category} fill={EXPENSE_CATEGORY_COLOR[entry.category]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [toKRW(value), String(name)]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
