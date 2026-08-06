/** Colour ramps shared by the 2D overlay, the 3D stress map and the legend. */

function mix(a: [number, number, number], b: [number, number, number], t: number) {
  const k = Math.max(0, Math.min(1, t))
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ] as [number, number, number]
}

function hex(c: [number, number, number]) {
  const to = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0')
  return `#${to(c[0])}${to(c[1])}${to(c[2])}`
}

const TENSION: [number, number, number] = [11, 87, 208]
const COMPRESSION: [number, number, number] = [197, 34, 31]
const NEUTRAL: [number, number, number] = [100, 116, 139]

/**
 * Design-mode member colour: blue in tension, red in compression, fading to
 * grey as the force approaches zero. `t` is force / peakForce in [-1, 1].
 */
export function forceColor(force: number, peak: number): string {
  if (peak <= 0) return hex(NEUTRAL)
  const t = Math.min(1, Math.abs(force) / peak)
  const target = force >= 0 ? TENSION : COMPRESSION
  // Keep a floor of 25% saturation so near-zero members stay visible.
  return hex(mix(NEUTRAL, target, 0.25 + 0.75 * t))
}

const RAMP: [number, [number, number, number]][] = [
  [0.0, [34, 197, 94]], // green — plenty of capacity left
  [0.5, [234, 179, 8]], // yellow
  [0.75, [249, 115, 22]], // orange
  [1.0, [220, 38, 38]], // red — at yield
]

/** Stress-map colour for a utilisation ratio (0 = idle, 1 = at capacity). */
export function stressRamp(ratio: number): [number, number, number] {
  const r = Math.max(0, Math.min(1, ratio))
  for (let i = 0; i < RAMP.length - 1; i++) {
    const [t0, c0] = RAMP[i]
    const [t1, c1] = RAMP[i + 1]
    if (r <= t1) return mix(c0, c1, (r - t0) / (t1 - t0))
  }
  return RAMP[RAMP.length - 1][1]
}

export function stressColorHex(ratio: number): string {
  return hex(stressRamp(ratio))
}

/** Same ramp, normalised to 0..1 floats for three.js Color/vertex colours. */
export function stressColorRGB(ratio: number): [number, number, number] {
  const c = stressRamp(ratio)
  return [c[0] / 255, c[1] / 255, c[2] / 255]
}
