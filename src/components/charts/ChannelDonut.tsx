'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ChannelData {
  name: string;
  value: number;
  color: string;
}

export function ChannelDonut({
  data,
  centerValue,
  centerLabel,
  height = 240,
}: {
  data: ChannelData[];
  centerValue: string;
  centerLabel: string;
  height?: number;
}) {
  const filtered = data.filter((d) => d.value > 0);
  return (
    <div className="relative" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={filtered.length > 0 ? filtered : [{ name: '데이터 없음', value: 1, color: '#e2e8f0' }]}
            dataKey="value"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={filtered.length > 1 ? 2 : 0}
            stroke="white"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {(filtered.length > 0 ? filtered : [{ color: '#e2e8f0' }]).map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: unknown) => {
              const n = typeof v === 'number' ? v : Number(v ?? 0);
              return [`₩${n.toLocaleString('ko-KR')}`, ''];
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => v}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] text-slate-400">{centerLabel}</p>
        <p className="text-base font-bold text-slate-900">{centerValue}</p>
      </div>
    </div>
  );
}
