/** World (metres, +y up) <-> screen (pixels, +y down) mapping for the 2D editor. */

export interface Viewport {
  /** pixels per metre */
  scale: number
  /** screen position of world origin (0, 0) */
  originX: number
  originY: number
}

export function toScreenX(v: Viewport, x: number) {
  return v.originX + x * v.scale
}

export function toScreenY(v: Viewport, y: number) {
  return v.originY - y * v.scale
}

export function toWorldX(v: Viewport, sx: number) {
  return (sx - v.originX) / v.scale
}

export function toWorldY(v: Viewport, sy: number) {
  return (v.originY - sy) / v.scale
}

export function snap(value: number, step: number) {
  return Math.round(value / step) * step
}

/**
 * Fit the design bounds into the given pixel box with a margin.
 *
 * The interesting world band runs from a little below the water line up to
 * some headroom above a typical truss. Both axes are centred on that band —
 * otherwise a tall, narrow pane (where the scale is limited by width) leaves
 * the bridge stranded at the bottom of a mostly empty canvas.
 */
const WORLD_TOP = 10
const WATER_MARGIN = 1.5

export function fitViewport(
  span: number,
  clearance: number,
  width: number,
  height: number,
): Viewport {
  const worldBottom = -clearance - WATER_MARGIN
  const worldW = span + 6
  const worldH = WORLD_TOP - worldBottom
  const scale = Math.min(width / worldW, height / worldH) || 20

  // screenY = originY - y * scale, so pinning the band's midpoint to the
  // centre of the viewport gives originY directly.
  const midY = (WORLD_TOP + worldBottom) / 2
  return {
    scale,
    originX: (width - span * scale) / 2,
    originY: height / 2 + midY * scale,
  }
}

/** Ruler tick spacing that keeps labels ~60 px apart at the current zoom. */
export function tickStep(scale: number) {
  const candidates = [0.25, 0.5, 1, 2, 5, 10, 20]
  for (const c of candidates) if (c * scale >= 55) return c
  return candidates[candidates.length - 1]
}
