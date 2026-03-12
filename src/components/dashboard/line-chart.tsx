interface DataPoint {
  label: string;
  [key: string]: string | number;
}

interface LineChartProps {
  data: DataPoint[];
  lines: Array<{ key: string; color: string; label: string }>;
  height?: number;
}

export function LineChart({ data, lines, height = 200 }: LineChartProps) {
  if (!data.length) return null;

  const allValues = data.flatMap((d) =>
    lines.map((l) => Number(d[l.key]) ?? 0),
  );
  const maxVal = Math.max(...allValues, 1);
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 400;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getX = (i: number) =>
    padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
  const getY = (val: number) =>
    padding.top + chartHeight - (val / maxVal) * chartHeight;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[320px] max-w-full"
      >
        {lines.map((line) => {
          const points = data
            .map((d, i) => {
              const val = Number(d[line.key]) ?? 0;
              return `${getX(i)},${getY(val)}`;
            })
            .join(' ');
          return (
            <polyline
              key={line.key}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          );
        })}
        {lines.map((line) =>
          data.map((d, i) => {
            const val = Number(d[line.key]) ?? 0;
            return (
              <circle
                key={`${line.key}-${i}`}
                cx={getX(i)}
                cy={getY(val)}
                r={4}
                fill={line.color}
              />
            );
          }),
        )}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-4">
        {lines.map((line) => (
          <div key={line.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-xs font-medium text-slate-600">{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
