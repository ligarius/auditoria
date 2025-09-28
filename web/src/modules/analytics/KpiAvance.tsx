import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartCard } from '../../components/charts/ChartCard';

interface KpiAvanceProps {
  data: { day: string; pct: number }[];
  loading?: boolean;
  error?: string | null;
}

export function KpiAvance({ data, loading, error }: KpiAvanceProps) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        day: new Date(item.day).toLocaleDateString('es-CL', {
          month: 'short',
          day: 'numeric'
        }),
        pct: Math.round(item.pct)
      })),
    [data]
  );

  return (
    <ChartCard
      title="Avance del plan"
      description="Promedio de progreso de tareas por día"
      loading={loading}
      error={error}
      isEmpty={!loading && !error && chartData.length === 0}
      height={260}
    >
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" stroke="#475569" fontSize={12} />
          <YAxis
            stroke="#475569"
            fontSize={12}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(value: number) => `${value}%`}
            labelFormatter={(label) => `Día ${label}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Line type="monotone" dataKey="pct" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
