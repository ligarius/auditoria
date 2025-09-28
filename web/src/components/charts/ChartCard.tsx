import type { PropsWithChildren } from 'react';

interface ChartCardProps extends PropsWithChildren {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: number;
}

export function ChartCard({
  title,
  description,
  loading = false,
  error,
  isEmpty = false,
  emptyMessage = 'Sin datos disponibles',
  height = 240,
  children
}: ChartCardProps) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </header>
      <div className="flex flex-1 items-center justify-center">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : isEmpty ? (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          <div className="w-full" style={{ height }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
