'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from 'recharts';

interface SparklineProps {
  data: { x: string | number; y: number }[];
  color?: string;
  height?: number;
  /** 툴팁 활성화 (true 권장) */
  showTooltip?: boolean;
  /** 마지막 점에만 dot 표시 */
  dotLast?: boolean;
}

/** 미니 라인 차트 — KPI 카드 안에 들어가는 추세 표시용 */
export function Sparkline({
  data,
  color = '#7177EE',
  height = 36,
  showTooltip = false,
  dotLast = false,
}: SparklineProps) {
  if (!data || data.length === 0) return null;
  const lastIdx = data.length - 1;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          {showTooltip && (
            <Tooltip
              contentStyle={{
                fontSize: 11,
                padding: '4px 8px',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
              }}
              formatter={(v: unknown) => {
                const n = typeof v === 'number' ? v : Number(v ?? 0);
                return [`₩${n.toLocaleString('ko-KR')}`, ''];
              }}
              labelFormatter={() => ''}
              cursor={{ stroke: color, strokeWidth: 0.5 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={1.8}
            dot={dotLast ? (props) => {
              const { cx, cy, index } = props as { cx: number; cy: number; index: number };
              if (index !== lastIdx) {
                // recharts requires SVG element return
                return <circle key={index} cx={cx} cy={cy} r={0} fill="none" />;
              }
              return <circle key={index} cx={cx} cy={cy} r={2.5} fill={color} />;
            } : false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
