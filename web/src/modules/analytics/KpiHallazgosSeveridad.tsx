import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { ChartCard } from '../../components/charts/ChartCard';

interface KpiHallazgosSeveridadProps {
  data: { severity: string; qty: number }[];
  loading?: boolean;
  error?: string | null;
}

const COLORS = ['#2563eb', '#f97316', '#22c55e', '#ef4444', '#9333ea', '#0ea5e9'];

export function KpiHallazgosSeveridad({ data, loading, error }: KpiHallazgosSeveridadProps) {
  const chartData = useMemo(
    () =>
      data.map((item, index) => ({
        name: item.severity || 'Sin clasificar',
        value: item.qty,
        fill: COLORS[index % COLORS.length]
      })),
    [data]
  );

  return (
    <ChartCard
      title="Hallazgos por severidad"
      description="Distribución de hallazgos abiertos"
      loading={loading}
      error={error}
      isEmpty={!loading && !error && chartData.every((item) => item.value === 0)}
      height={260}
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value} hallazgos`} contentStyle={{ fontSize: 12 }} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
