interface BarChartProps {
  data: Array<{ label: string; value?: number; [key: string]: string | number | undefined }>;
  height?: number;
  color?: string;
  stacked?: boolean;
  keys?: string[];
  colors?: string[];
}

export function BarChart({ data, height = 120, color = '#2563EB', stacked, keys, colors }: BarChartProps) {
  if (!data.length) return null;

  const padding = { top: 8, right: 8, bottom: 20, left: 8 };

  if (stacked && keys && colors) {
    const maxVal = Math.max(...data.map(d => keys.reduce((s, k) => s + (Number(d[k]) || 0), 0)), 1);
    const width = data.length * 40;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = Math.max(4, Math.floor(chartWidth / data.length) - 4);

    return (
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[160px] max-w-full">
          {data.map((d, i) => {
            let accumulated = 0;
            const x = padding.left + i * ((chartWidth) / data.length) + 2;
            return (
              <g key={i}>
                {keys.map((k, ki) => {
                  const val = Number(d[k]) || 0;
                  const barH = (val / maxVal) * chartHeight;
                  const y = padding.top + chartHeight - accumulated - barH;
                  accumulated += barH;
                  return (
                    <rect
                      key={k}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barH, 0)}
                      rx={1}
                      fill={colors[ki % colors.length]}
                      fillOpacity={0.85}
                    />
                  );
                })}
                <text
                  x={x + barWidth / 2}
                  y={height - 4}
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px]"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value ?? 0), 1);
  const width = data.length * 40;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.max(4, Math.floor(chartWidth / data.length) - 4);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[160px] max-w-full">
        {data.map((d, i) => {
          const val = d.value ?? 0;
          const barH = (val / maxVal) * chartHeight;
          const x = padding.left + i * ((chartWidth) / data.length) + 2;
          const y = padding.top + chartHeight - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx={2} fill={color} fillOpacity={0.8} />
              <text
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                className="fill-slate-500 text-[9px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
