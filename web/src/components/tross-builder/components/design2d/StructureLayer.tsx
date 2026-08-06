import { memo } from 'react'
import { Circle, Group, Line, Rect, Text } from 'react-konva'
import type { BridgeDesign } from '../../types'
import type { LiveResponse } from '../../analysis/protocol'
import { MATERIALS } from '../../data/materials'
import { forceColor, stressColorHex } from '../../utils/colors'
import { kN } from '../../utils/format'
import { type Viewport, toScreenX, toScreenY } from './viewport'
import { CANVAS } from './palette'
import type { OverlaySettings } from '../../store/useBridgeStore'

/** Minimum joint hit radius in pixels — sized for a fingertip on a tablet. */
const HIT_RADIUS = 13

interface Props {
  design: BridgeDesign
  live: LiveResponse | null
  overlay: OverlaySettings
  viewport: Viewport
  selectedMemberId: string | null
  selectedNodeId: string | null
  hoverMemberId: string | null
  brokenMemberId: string | null
  onMemberDown: (id: string, evt: MouseEvent | TouchEvent | PointerEvent) => void
  onMemberEnter: (id: string) => void
  onMemberLeave: () => void
  onNodeDown: (id: string, evt: MouseEvent | TouchEvent | PointerEvent) => void
  onNodeUp: (id: string) => void
}

/** Pin support: filled triangle with a hatched base. Roller: triangle on wheels. */
function Support({
  x,
  y,
  type,
  scale,
}: {
  x: number
  y: number
  type: 'pin' | 'roller'
  scale: number
}) {
  const w = Math.max(9, 0.45 * scale)
  const h = Math.max(9, 0.5 * scale)
  const baseY = y + h + (type === 'roller' ? Math.max(4, 0.14 * scale) * 2 : 0)
  return (
    <Group listening={false}>
      <Line
        points={[x, y, x - w, y + h, x + w, y + h]}
        closed
        fill={CANVAS.tertiary}
        stroke={CANVAS.surfaceLowest}
        strokeWidth={1.2}
      />
      {type === 'roller' && (
        <>
          <Circle
            x={x - w * 0.5}
            y={y + h + Math.max(4, 0.14 * scale)}
            radius={Math.max(3, 0.14 * scale)}
            fill={CANVAS.tertiary}
            stroke={CANVAS.surfaceLowest}
            strokeWidth={1}
          />
          <Circle
            x={x + w * 0.5}
            y={y + h + Math.max(4, 0.14 * scale)}
            radius={Math.max(3, 0.14 * scale)}
            fill={CANVAS.tertiary}
            stroke={CANVAS.surfaceLowest}
            strokeWidth={1}
          />
        </>
      )}
      <Line
        points={[x - w * 1.4, baseY, x + w * 1.4, baseY]}
        stroke={CANVAS.tertiary}
        strokeWidth={2}
      />
      {/* Ground hatching */}
      {[-1, -0.5, 0, 0.5, 1].map((k) => (
        <Line
          key={k}
          points={[x + k * w * 1.2, baseY, x + k * w * 1.2 - 5, baseY + 6]}
          stroke={CANVAS.tertiary}
          strokeWidth={1}
          opacity={0.7}
        />
      ))}
    </Group>
  )
}

function StructureLayerImpl(props: Props) {
  const {
    design,
    live,
    overlay,
    viewport,
    selectedMemberId,
    selectedNodeId,
    hoverMemberId,
    brokenMemberId,
    onMemberDown,
    onMemberEnter,
    onMemberLeave,
    onNodeDown,
    onNodeUp,
  } = props

  const forces = live?.forces
  const ratios = live?.ratios
  const disp = live?.displacements
  const nodeIndex = new Map(design.nodes.map((n, i) => [n.id, i]))

  // Peak force normalises the tension/compression colour intensity.
  let peak = 0
  if (forces) for (const f of forces) peak = Math.max(peak, Math.abs(f))

  const sx = (x: number) => toScreenX(viewport, x)
  const sy = (y: number) => toScreenY(viewport, y)

  const nodeRadius = Math.max(3.5, Math.min(7, viewport.scale * 0.09))

  return (
    <Group>
      {/* --- deflected shape, drawn under the real geometry ------------- */}
      {overlay.showDeflection && disp && live?.ok && (
        <Group listening={false}>
          {design.members.map((m) => {
            const ai = nodeIndex.get(m.a)
            const bi = nodeIndex.get(m.b)
            if (ai === undefined || bi === undefined) return null
            const a = design.nodes[ai]
            const b = design.nodes[bi]
            const k = overlay.deflectionScale
            return (
              <Line
                key={`d${m.id}`}
                points={[
                  sx(a.x + disp[2 * ai] * k),
                  sy(a.y + disp[2 * ai + 1] * k),
                  sx(b.x + disp[2 * bi] * k),
                  sy(b.y + disp[2 * bi + 1] * k),
                ]}
                stroke={CANVAS.tertiary}
                strokeWidth={1.5}
                dash={[5, 4]}
                opacity={0.85}
              />
            )
          })}
        </Group>
      )}

      {/* --- members ----------------------------------------------------- */}
      {design.members.map((m, i) => {
        const ai = nodeIndex.get(m.a)
        const bi = nodeIndex.get(m.b)
        if (ai === undefined || bi === undefined) return null
        const a = design.nodes[ai]
        const b = design.nodes[bi]

        const force = forces?.[i] ?? 0
        const ratio = ratios?.[i] ?? 0
        const broken = brokenMemberId === m.id
        const isForceMode = overlay.showForces && live?.ok
        const stroke = broken
          ? CANVAS.error
          : isForceMode
            ? forceColor(force, peak)
            : MATERIALS[m.materialId].color

        const selected = selectedMemberId === m.id
        const hovered = hoverMemberId === m.id
        // Line weight tracks the section depth so heavy members read as heavy.
        const base = Math.max(2.5, Math.min(9, viewport.scale * 0.055))

        // Distinct stroke styles for materials in 2D mode when not showing forces
        const dashPattern = !isForceMode && m.materialId === 'wood' ? [8, 4] : undefined

        return (
          <Group key={m.id}>
            {/* Composite material accent glow in 2D */}
            {!isForceMode && m.materialId === 'composite' && !broken && (
              <Line
                points={[sx(a.x), sy(a.y), sx(b.x), sy(b.y)]}
                stroke="#0ea5e9"
                strokeWidth={base + 2}
                opacity={0.6}
                lineCap="round"
                listening={false}
              />
            )}
            <Line
              points={[sx(a.x), sy(a.y), sx(b.x), sy(b.y)]}
              stroke={selected ? CANVAS.onSurface : stroke}
              strokeWidth={selected || hovered ? base + 2.5 : base}
              dash={dashPattern}
              hitStrokeWidth={16}
              lineCap="round"
              shadowColor={ratio > 0.85 ? CANVAS.compression : undefined}
              shadowBlur={ratio > 0.85 ? 10 : 0}
              onPointerDown={(e) => onMemberDown(m.id, e.evt)}
              onPointerEnter={() => onMemberEnter(m.id)}
              onPointerLeave={onMemberLeave}
            />
          </Group>
        )
      })}

      {/* --- force / ratio labels ---------------------------------------- */}
      {overlay.showLabels && live?.ok && forces && (
        <Group listening={false}>
          {design.members.map((m, i) => {
            const ai = nodeIndex.get(m.a)
            const bi = nodeIndex.get(m.b)
            if (ai === undefined || bi === undefined) return null
            const a = design.nodes[ai]
            const b = design.nodes[bi]
            const mx = (sx(a.x) + sx(b.x)) / 2
            const my = (sy(a.y) + sy(b.y)) / 2
            const f = forces[i]
            const r = ratios?.[i] ?? 0
            const label = `${f >= 0 ? '+' : '−'}${Math.abs(kN(f)).toFixed(1)} kN`
            return (
              <Group key={`l${m.id}`} x={mx - 34} y={my - 15}>
                <Rect
                  width={68}
                  height={30}
                  fill={CANVAS.labelBg}
                  opacity={0.85}
                  cornerRadius={4}
                />
                <Text
                  width={68}
                  y={3}
                  align="center"
                  text={label}
                  fontSize={10}
                  fontStyle="bold"
                  fill={f >= 0 ? CANVAS.tension : CANVAS.compression}
                />
                <Text
                  width={68}
                  y={16}
                  align="center"
                  text={`${(r * 100).toFixed(0)}%`}
                  fontSize={9}
                  fill={stressColorHex(r)}
                />
              </Group>
            )
          })}
        </Group>
      )}

      {/* --- supports ---------------------------------------------------- */}
      {design.nodes.map((n) =>
        n.support === 'none' ? null : (
          <Support
            key={`s${n.id}`}
            x={sx(n.x)}
            y={sy(n.y)}
            type={n.support}
            scale={viewport.scale}
          />
        ),
      )}

      {/* --- nodes ------------------------------------------------------- */}
      {design.nodes.map((n) => {
        const selected = selectedNodeId === n.id
        return (
          <Circle
            key={n.id}
            x={sx(n.x)}
            y={sy(n.y)}
            radius={selected ? nodeRadius + 2 : nodeRadius}
            fill={n.locked ? CANVAS.tertiary : CANVAS.onSurface}
            stroke={selected ? CANVAS.primary : CANVAS.surfaceLowest}
            strokeWidth={selected ? 3 : 1.5}
            /*
             * Joints draw small but must be easy to grab: at a fitted zoom the
             * visible radius is only a few pixels, which is smaller than a
             * finger and smaller than the neighbouring members' hit stroke, so
             * near-misses would land on a member instead of the joint. The hit
             * region is decoupled from the drawn radius to fix that.
             */
            hitFunc={(ctx, shape) => {
              ctx.beginPath()
              ctx.arc(0, 0, Math.max(HIT_RADIUS, nodeRadius * 2.5), 0, Math.PI * 2, false)
              ctx.closePath()
              ctx.fillStrokeShape(shape)
            }}
            onPointerDown={(e) => onNodeDown(n.id, e.evt)}
            onPointerUp={() => onNodeUp(n.id)}
          />
        )
      })}
    </Group>
  )
}

export const StructureLayer = memo(StructureLayerImpl)
