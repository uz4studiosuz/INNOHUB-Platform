import { memo, useMemo } from 'react'
import { Group, Line, Rect, Text } from 'react-konva'
import { type Viewport, tickStep, toScreenX, toScreenY } from './viewport'
import { CANVAS } from './palette'

interface Props {
  viewport: Viewport
  width: number
  height: number
  span: number
  clearance: number
  gridStep: number
}

const RULER = 22

/**
 * Snap grid, water/ground band, and the two rulers.
 * Pure geometry — memoised so it only rebuilds when the viewport changes.
 */
function GridLayerImpl({ viewport, width, height, span, clearance, gridStep }: Props) {
  const lines = useMemo(() => {
    const out: { points: number[]; stroke: string; width: number }[] = []
    const step = gridStep
    // Only draw the fine grid when it is not going to turn into mush.
    const drawFine = step * viewport.scale >= 7

    const x0 = Math.floor(-4)
    const x1 = Math.ceil(span + 4)
    const y0 = Math.floor(-clearance - 2)
    const y1 = Math.ceil(12)

    if (drawFine) {
      for (let x = x0; x <= x1 + 1e-9; x += step) {
        const major = Math.abs(x / 1 - Math.round(x / 1)) < 1e-9
        out.push({
          points: [toScreenX(viewport, x), toScreenY(viewport, y1), toScreenX(viewport, x), toScreenY(viewport, y0)],
          stroke: major ? CANVAS.gridMajor : CANVAS.gridMinor,
          width: major ? 1 : 0.5,
        })
      }
      for (let y = y0; y <= y1 + 1e-9; y += step) {
        const major = Math.abs(y / 1 - Math.round(y / 1)) < 1e-9
        out.push({
          points: [toScreenX(viewport, x0), toScreenY(viewport, y), toScreenX(viewport, x1), toScreenY(viewport, y)],
          stroke: major ? CANVAS.gridMajor : CANVAS.gridMinor,
          width: major ? 1 : 0.5,
        })
      }
    } else {
      for (let x = Math.ceil(x0); x <= x1; x += 1) {
        out.push({
          points: [toScreenX(viewport, x), toScreenY(viewport, y1), toScreenX(viewport, x), toScreenY(viewport, y0)],
          stroke: CANVAS.gridMajor,
          width: 1,
        })
      }
      for (let y = Math.ceil(y0); y <= y1; y += 1) {
        out.push({
          points: [toScreenX(viewport, x0), toScreenY(viewport, y), toScreenX(viewport, x1), toScreenY(viewport, y)],
          stroke: CANVAS.gridMajor,
          width: 1,
        })
      }
    }
    return out
  }, [viewport, span, clearance, gridStep])

  const ticks = useMemo(() => {
    const step = tickStep(viewport.scale)
    const xs: { pos: number; label: string }[] = []
    for (let x = 0; x <= span + 1e-9; x += step) {
      xs.push({ pos: toScreenX(viewport, x), label: `${+x.toFixed(2)}` })
    }
    const ys: { pos: number; label: string }[] = []
    for (let y = -clearance; y <= 12; y += step) {
      ys.push({ pos: toScreenY(viewport, y), label: `${+y.toFixed(2)}` })
    }
    return { xs, ys }
  }, [viewport, span, clearance])

  const deckY = toScreenY(viewport, 0)
  const waterY = toScreenY(viewport, -clearance)

  return (
    <Group listening={false}>
      {/* Water / valley band beneath the deck, mirroring the 3D scene. */}
      <Rect
        x={0}
        y={waterY}
        width={width}
        height={Math.max(0, height - waterY)}
        fill={CANVAS.water}
      />
      <Line points={[0, waterY, width, waterY]} stroke={CANVAS.waterLine} strokeWidth={1.5} />

      {lines.map((l, i) => (
        <Line key={i} points={l.points} stroke={l.stroke} strokeWidth={l.width} />
      ))}

      {/* Datum lines: deck level and clear span markers. */}
      <Line
        points={[0, deckY, width, deckY]}
        stroke={CANVAS.primary}
        strokeWidth={1}
        dash={[6, 5]}
        opacity={0.45}
      />

      {/* --- rulers --------------------------------------------------- */}
      <Rect x={0} y={0} width={width} height={RULER} fill={CANVAS.rulerBg} />
      <Rect x={0} y={0} width={RULER} height={height} fill={CANVAS.rulerBg} />
      <Line points={[0, RULER, width, RULER]} stroke={CANVAS.rulerLine} strokeWidth={1} />
      <Line points={[RULER, 0, RULER, height]} stroke={CANVAS.rulerLine} strokeWidth={1} />

      {ticks.xs.map((t, i) => (
        <Group key={`x${i}`}>
          <Line points={[t.pos, RULER - 5, t.pos, RULER]} stroke={CANVAS.outline} strokeWidth={1} />
          <Text
            x={t.pos - 22}
            y={4}
            width={44}
            align="center"
            text={t.label}
            fontSize={10}
            fill={CANVAS.onSurfaceVariant}
          />
        </Group>
      ))}
      {ticks.ys.map((t, i) => (
        <Group key={`y${i}`}>
          <Line points={[RULER - 5, t.pos, RULER, t.pos]} stroke={CANVAS.outline} strokeWidth={1} />
          <Text
            x={1}
            y={t.pos - 5}
            width={RULER - 6}
            align="right"
            text={t.label}
            fontSize={9}
            fill={CANVAS.onSurfaceVariant}
          />
        </Group>
      ))}
      <Text x={3} y={5} text="m" fontSize={9} fill={CANVAS.outline} />
    </Group>
  )
}

export const GridLayer = memo(GridLayerImpl)
