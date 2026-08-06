/** Radial score gauge (spec 6.2: "Present score with a gauge graphic"). */

const SIZE = 140
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
/** 240° sweep starting at the lower-left. */
const SWEEP = 240
const CIRC = 2 * Math.PI * RADIUS

function scoreColor(score: number) {
  if (score >= 80) return 'var(--color-safe)'
  if (score >= 60) return 'var(--color-caution)'
  if (score >= 40) return 'var(--color-warn)'
  return 'var(--color-danger)'
}

export function ScoreGauge({ score, label = 'Final score' }: { score: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, score))
  const arc = (SWEEP / 360) * CIRC
  const filled = (clamped / 100) * arc
  const color = scoreColor(clamped)

  return (
    <div className="flex flex-col items-center">
      <svg
        width={SIZE}
        height={SIZE * 0.84}
        viewBox={`0 0 ${SIZE} ${SIZE * 0.84}`}
        role="img"
        aria-label={`${label}: ${Math.round(clamped)} out of 100`}
      >
        <g transform={`translate(${SIZE / 2} ${SIZE / 2}) rotate(${90 + (360 - SWEEP) / 2})`}>
          <circle
            r={RADIUS}
            fill="none"
            stroke="var(--color-surface-container-highest)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRC}`}
          />
          <circle
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRC}`}
            style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.05,0.7,0.1,1)' }}
          />
        </g>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 6}
          textAnchor="middle"
          fontSize="34"
          fontWeight="500"
          fill={color}
          fontFamily="var(--font-mono)"
        >
          {Math.round(clamped)}
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 24}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-on-surface-variant)"
        >
          / 100
        </text>
      </svg>
      <span className="type-label-m -mt-1 uppercase text-on-surface-variant">{label}</span>
    </div>
  )
}

/** Horizontal component bar used in the score breakdown. */
export function ScoreBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div>
      <div className="flex justify-between">
        <span className="type-body-s text-on-surface-variant">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-on-surface">
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  )
}
