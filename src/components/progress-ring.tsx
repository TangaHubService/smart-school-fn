import clsx from 'clsx';
import { useEffect, useState } from 'react';

export interface ProgressRingProps {
  /** 0–100; values outside range are clamped */
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Overrides center number (default: "N%") */
  label?: string;
  animated?: boolean;
  transitionMs?: number;
  ariaLabel?: string;
}

export function ProgressRing({
  percentage,
  size = 84,
  strokeWidth = 8,
  className,
  label,
  animated = true,
  transitionMs = 650,
  ariaLabel,
}: ProgressRingProps) {
  const bounded = Math.max(0, Math.min(100, Math.round(Number(percentage))));
  const isComplete = bounded >= 100;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [displayPct, setDisplayPct] = useState(animated ? 0 : bounded);

  useEffect(() => {
    if (!animated) {
      setDisplayPct(bounded);
      return;
    }
    const id = requestAnimationFrame(() => setDisplayPct(bounded));
    return () => cancelAnimationFrame(id);
  }, [bounded, animated]);

  const offset = circumference - (displayPct / 100) * circumference;

  const strokeColor = isComplete ? '#059669' : '#184f8f';
  const trackColor = '#e2e8f0';
  const textFill = isComplete ? '#047857' : '#0f172a';

  const centerLabel = label ?? `${bounded}%`;
  const defaultAria = `Course progress ${bounded} percent${isComplete ? ', complete' : ''}`;

  return (
    <svg
      width={size}
      height={size}
      className={clsx('block', className)}
      role="img"
      aria-label={ariaLabel ?? defaultAria}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={bounded}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        style={{
          transition: `stroke-dashoffset ${transitionMs}ms cubic-bezier(0.4, 0, 0.2, 1), stroke 0.35s ease`,
          filter: isComplete ? 'drop-shadow(0 0 6px rgba(5, 150, 105, 0.35))' : undefined,
        }}
      />
      {isComplete ? (
        <>
          <text
            x="50%"
            y="46%"
            dominantBaseline="central"
            textAnchor="middle"
            fontWeight="600"
            fontSize={size * 0.2}
            fill={textFill}
          >
            100%
          </text>
          <text
            x="50%"
            y="72%"
            dominantBaseline="central"
            textAnchor="middle"
            fontWeight="500"
            fontSize={size * 0.1}
            fill="#059669"
          >
            Done
          </text>
        </>
      ) : (
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fontWeight="600"
          fontSize={size * 0.2}
          fill={textFill}
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}
