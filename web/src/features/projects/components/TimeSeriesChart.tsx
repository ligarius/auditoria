import { useCallback, useMemo } from 'react';

const CHART_WIDTH = 360;
const CHART_HEIGHT = 200;
const PADDING_X = 36;
const PADDING_Y = 28;

export interface TimeSeriesPoint {
  date: Date | string;
  value: number | null | undefined;
}

export interface TimeSeriesChartProps {
  title: string;
  unit?: string;
  data: TimeSeriesPoint[];
  color?: string;
  valueFormatter?: (value: number) => string;
}

interface NormalizedPoint {
  date: Date;
  value: number | null;
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
});

const defaultValueFormatter = (value: number) => value.toFixed(2);

const normalizePoints = (points: TimeSeriesPoint[]): NormalizedPoint[] =>
  points
    .map((point) => ({
      date: point.date instanceof Date ? point.date : new Date(point.date),
      value:
        typeof point.value === 'number' && Number.isFinite(point.value)
          ? point.value
          : null,
    }))
    .filter((point) => !Number.isNaN(point.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

export const TimeSeriesChart = ({
  title,
  unit,
  data,
  color = '#2563eb',
  valueFormatter = defaultValueFormatter,
}: TimeSeriesChartProps) => {
  const normalized = useMemo(() => normalizePoints(data), [data]);
  const validPoints = useMemo(
    () => normalized.filter((point) => point.value !== null),
    [normalized]
  );

  const { minDate, maxDate } = useMemo(() => {
    if (normalized.length === 0) {
      const now = new Date();
      return { minDate: now, maxDate: now };
    }

    const first = normalized[0].date;
    const last = normalized[normalized.length - 1]?.date ?? first;
    return { minDate: first, maxDate: last };
  }, [normalized]);
  const dateRange = Math.max(maxDate.getTime() - minDate.getTime(), 1);

  const valueExtent = useMemo(() => {
    if (validPoints.length === 0) {
      return { min: 0, max: 1 };
    }
    const values = validPoints.map((point) => point.value ?? 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      return { min: min - 1, max: max + 1 };
    }
    return { min, max };
  }, [validPoints]);

  const valueRange = Math.max(valueExtent.max - valueExtent.min, 1);

  const getX = useCallback(
    (date: Date) => {
      if (dateRange === 0) return CHART_WIDTH / 2;
      const position = (date.getTime() - minDate.getTime()) / dateRange;
      return PADDING_X + position * (CHART_WIDTH - PADDING_X * 2);
    },
    [dateRange, minDate]
  );

  const getY = useCallback(
    (value: number) => {
      const ratio = (value - valueExtent.min) / valueRange;
      return CHART_HEIGHT - PADDING_Y - ratio * (CHART_HEIGHT - PADDING_Y * 2);
    },
    [valueExtent.min, valueRange]
  );

  const pathD = useMemo(() => {
    if (validPoints.length === 0) return '';
    let path = '';
    let started = false;

    normalized.forEach((point) => {
      if (point.value === null) {
        started = false;
        return;
      }

      const command = started ? 'L' : 'M';
      const x = getX(point.date).toFixed(2);
      const y = getY(point.value).toFixed(2);
      path += `${command}${x} ${y}`;
      started = true;
    });

    return path;
  }, [normalized, validPoints.length, getX, getY]);

  const latestValue = validPoints[validPoints.length - 1]?.value ?? null;
  const rangeLabel = normalized.length
    ? `${dateFormatter.format(minDate)} – ${dateFormatter.format(maxDate)}`
    : 'Sin datos disponibles';

  const valueTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps }, (_, index) => {
      const ratio = index / (steps - 1);
      const value = valueExtent.min + ratio * valueRange;
      return {
        value,
        y: getY(value),
        label: valueFormatter(value),
      };
    });
  }, [valueExtent.min, valueRange, valueFormatter, getY]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-slate-900">
            {latestValue === null ? '—' : valueFormatter(latestValue)}
            {unit ? ` ${unit}` : ''}
          </p>
        </div>
        <span className="text-xs text-slate-400">{rangeLabel}</span>
      </div>

      <div className="overflow-hidden">
        <svg
          role="img"
          aria-label={`${title} (${rangeLabel})`}
          width="100%"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <rect
            x={PADDING_X}
            y={PADDING_Y}
            width={CHART_WIDTH - PADDING_X * 2}
            height={CHART_HEIGHT - PADDING_Y * 2}
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth={1}
            rx={8}
          />

          {valueTicks.map((tick) => (
            <g key={tick.label}>
              <line
                x1={PADDING_X}
                x2={CHART_WIDTH - PADDING_X}
                y1={tick.y}
                y2={tick.y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={PADDING_X - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-xs"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}

          {validPoints.map((point) => {
            if (point.value === null) return null;
            const x = getX(point.date);
            const y = getY(point.value);
            return (
              <circle
                key={point.date.toISOString()}
                cx={x}
                cy={y}
                r={3.5}
                fill={color}
              />
            );
          })}

          {normalized.length > 0 && (
            <>
              <text
                x={PADDING_X}
                y={CHART_HEIGHT - PADDING_Y + 16}
                textAnchor="start"
                className="fill-slate-400 text-xs"
              >
                {dateFormatter.format(minDate)}
              </text>
              <text
                x={CHART_WIDTH - PADDING_X}
                y={CHART_HEIGHT - PADDING_Y + 16}
                textAnchor="end"
                className="fill-slate-400 text-xs"
              >
                {dateFormatter.format(maxDate)}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
};
