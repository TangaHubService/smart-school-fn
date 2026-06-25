interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
}

export function BarChart({ data, height = 120, color = '#2563EB' }: BarChartProps) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const padding = { top: 8, right: 8, bottom: 20, left: 8 };
  const width = data.length * 40;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.max(4, Math.floor(chartWidth / data.length) - 4);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[160px] max-w-full">
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * chartHeight;
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
