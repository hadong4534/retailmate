'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Datum {
  label: string;
  value: number;
  highlighted?: boolean;
}

function formatTick(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function WeekBarChart({
  data,
  color = '#2563eb',
  highlightColor = '#1d4ed8',
  height = 240,
  valueLabel = '비용',
}: {
  data: Datum[];
  color?: string;
  highlightColor?: string;
  height?: number;
  valueLabel?: string;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: unknown) => {
              const n = typeof v === 'number' ? v : Number(v ?? 0);
              return [`₩${n.toLocaleString('ko-KR')}`, valueLabel];
            }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.highlighted ? highlightColor : color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
