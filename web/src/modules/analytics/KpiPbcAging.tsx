import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartCard } from '../../components/charts/ChartCard';

interface KpiPbcAgingProps {
  data: { bucket: string; label: string; count: number }[];
  loading?: boolean;
  error?: string | null;
}

const COLORS: Record<string, string> = {
  on_time: '#22c55e',
  overdue_0_3: '#facc15',
  overdue_4_7: '#f97316',
  overdue_8_plus: '#ef4444',
  no_due_date: '#94a3b8'
};

export function KpiPbcAging({ data, loading, error }: KpiPbcAgingProps) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        bucket: item.bucket,
        label: item.label,
        count: item.count,
        fill: COLORS[item.bucket] ?? '#64748b'
      })),
    [data]
  );

  return (
    <ChartCard
      title="Aging PBC"
      description="Entregables pendientes por días de atraso"
      loading={loading}
      error={error}
      isEmpty={!loading && !error && chartData.every((item) => item.count === 0)}
      height={260}
    >
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" stroke="#475569" fontSize={11} interval={0} angle={-10} dy={10} />
          <YAxis stroke="#475569" fontSize={12} allowDecimals={false} />
          <Tooltip formatter={(value: number) => `${value} items`} contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count">
            {chartData.map((entry) => (
              <Cell key={entry.bucket} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
