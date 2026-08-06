import { useCallback, useEffect, useRef, useState } from 'react'
import { Layer, Line, Stage } from 'react-konva'
import type Konva from 'konva'
import { useBridgeStore } from '../../store/useBridgeStore'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { useElementSize } from '../../utils/useElementSize'
import { captureTargets } from '../../utils/captureTargets'
import { IconButton } from '@/components/ui'
import { CANVAS } from './palette'
import { GridLayer } from './GridLayer'
import { StructureLayer } from './StructureLayer'
import {
  type Viewport,
  fitViewport,
  snap,
  toScreenX,
  toScreenY,
  toWorldX,
  toWorldY,
} from './viewport'

export function Canvas2D() {
  const { ref, width, height } = useElementSize<HTMLDivElement>()
  const stage = useRef<Konva.Stage | null>(null)

  const design = useBridgeStore((s) => s.design)
  const tool = useBridgeStore((s) => s.tool)
  const overlay = useBridgeStore((s) => s.overlay)
  const activeMaterial = useBridgeStore((s) => s.activeMaterial)
  const activeSection = useBridgeStore((s) => s.activeSection)
  const selectedMemberId = useBridgeStore((s) => s.selectedMemberId)
  const selectedNodeId = useBridgeStore((s) => s.selectedNodeId)
  const pendingNodeId = useBridgeStore((s) => s.pendingNodeId)

  const live = useAnalysisStore((s) => s.live)
  const brokenMemberId = useAnalysisStore((s) => s.brokenMemberId)

  const [viewport, setViewport] = useState<Viewport>({ scale: 24, originX: 60, originY: 400 })
  const [fitted, setFitted] = useState(false)
  const [hoverMemberId, setHoverMemberId] = useState<string | null>(null)
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null)

  const pan = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)
  const drag = useRef<{ id: string; committed: boolean } | null>(null)

  // --- fit the design on first paint and whenever the pane resizes --------
  useEffect(() => {
    if (width === 0 || height === 0) return
    if (fitted) return
    setViewport(fitViewport(design.span, design.clearance, width, height))
    setFitted(true)
  }, [width, height, design.span, design.clearance, fitted])

  const resetView = useCallback(() => {
    if (width && height) setViewport(fitViewport(design.span, design.clearance, width, height))
  }, [width, height, design.span, design.clearance])

  // --- pointer helpers ----------------------------------------------------
  const worldAt = useCallback(
    (pos: { x: number; y: number }) => ({
      x: toWorldX(viewport, pos.x),
      y: toWorldY(viewport, pos.y),
    }),
    [viewport],
  )

  const snappedAt = useCallback(
    (pos: { x: number; y: number }) => {
      const w = worldAt(pos)
      return { x: snap(w.x, design.gridStep), y: snap(w.y, design.gridStep) }
    },
    [worldAt, design.gridStep],
  )

  // --- wheel zoom about the cursor ---------------------------------------
  const onWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const pointer = e.target.getStage()?.getPointerPosition()
    if (!pointer) return
    setViewport((v) => {
      const factor = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12
      const scale = Math.max(6, Math.min(160, v.scale * factor))
      const k = scale / v.scale
      // Keep the world point under the cursor pinned.
      return {
        scale,
        originX: pointer.x - (pointer.x - v.originX) * k,
        originY: pointer.y - (pointer.y - v.originY) * k,
      }
    })
  }, [])

  const [isSpacePressed, setIsSpacePressed] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        setIsSpacePressed(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // --- stage-level interaction -------------------------------------------
  const onStageDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const st = e.target.getStage()
      const pos = st?.getPointerPosition()
      if (!pos) return

      const native = e.evt as PointerEvent
      const store = useBridgeStore.getState()

      if (isSpacePressed || native.button === 1) {
        pan.current = { x: pos.x, y: pos.y, originX: viewport.originX, originY: viewport.originY }
        return
      }

      if (native.button === 2) {
        if (store.pendingNodeId || tool === 'member') {
          store.setPendingNode(null)
          store.setTool('select')
          return
        }
        pan.current = { x: pos.x, y: pos.y, originX: viewport.originX, originY: viewport.originY }
        return
      }

      // Clicks that land on empty canvas deselect current selection
      if (e.target === st) {
        store.select({ nodeId: null, memberId: null })
      } else {
        return
      }

      const p = snappedAt(pos)

      switch (tool) {
        case 'node':
          store.addNode(p.x, p.y)
          break
        case 'member': {
          // Clicking empty grid while drawing creates the node and continues.
          const id = store.addNode(p.x, p.y)
          if (!id) break
          if (store.pendingNodeId && store.pendingNodeId !== id) {
            store.addMember(store.pendingNodeId, id)
            store.setPendingNode(id)
          } else {
            store.setPendingNode(id)
          }
          break
        }
        case 'select':
          pan.current = { x: pos.x, y: pos.y, originX: viewport.originX, originY: viewport.originY }
          break
        default:
          break
      }
    },
    [tool, snappedAt, viewport.originX, viewport.originY, isSpacePressed],
  )

  const onStageMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const st = e.target.getStage()
      const pos = st?.getPointerPosition()
      if (!pos) return

      if (pan.current) {
        const { x: startX, y: startY, originX, originY } = pan.current
        const dx = pos.x - startX
        const dy = pos.y - startY
        setViewport((v) => ({
          ...v,
          originX: originX + dx,
          originY: originY + dy,
        }))
        return
      }

      const p = snappedAt(pos)
      setCursorWorld(p)

      if (drag.current) {
        const store = useBridgeStore.getState()
        // The first movement commits a history entry so one drag = one undo.
        store.moveNode(drag.current.id, p.x, p.y, !drag.current.committed)
        drag.current.committed = true
      }
    },
    [snappedAt],
  )

  const onStageUp = useCallback(() => {
    pan.current = null
    drag.current = null
  }, [])

  // --- shape callbacks ----------------------------------------------------
  const onNodeDown = useCallback(
    (id: string, evt: MouseEvent | TouchEvent | PointerEvent) => {
      const store = useBridgeStore.getState()
      if ((evt as PointerEvent).button === 1) return
      if ((evt as PointerEvent).button === 2) {
        evt.preventDefault()
        evt.stopPropagation()
        if (store.pendingNodeId || tool === 'member') {
          store.setPendingNode(null)
          store.setTool('select')
        } else {
          store.deleteNode(id)
        }
        return
      }
      evt.stopPropagation()

      switch (tool) {
        case 'select':
          store.select({ nodeId: id, memberId: null })
          drag.current = { id, committed: false }
          break
        case 'member':
          if (store.pendingNodeId && store.pendingNodeId !== id) {
            store.addMember(store.pendingNodeId, id)
            store.setPendingNode(id)
          } else {
            store.setPendingNode(id)
          }
          break
        case 'delete':
          store.deleteNode(id)
          break
        case 'support': {
          const node = store.design.nodes.find((n) => n.id === id)
          if (!node) break
          const next =
            node.support === 'none' ? 'pin' : node.support === 'pin' ? 'roller' : 'none'
          store.setSupport(id, next)
          break
        }
        default:
          store.select({ nodeId: id, memberId: null })
      }
    },
    [tool],
  )

  const onNodeUp = useCallback(
    (id: string) => {
      // Drag-to-draw: releasing over a different node closes the member.
      const store = useBridgeStore.getState()
      if (tool === 'member' && store.pendingNodeId && store.pendingNodeId !== id) {
        store.addMember(store.pendingNodeId, id)
        store.setPendingNode(id)
      }
      drag.current = null
    },
    [tool],
  )

  const onMemberDown = useCallback(
    (id: string, evt: MouseEvent | TouchEvent | PointerEvent) => {
      const store = useBridgeStore.getState()
      if ((evt as PointerEvent).button === 1) return
      if ((evt as PointerEvent).button === 2) {
        evt.preventDefault()
        evt.stopPropagation()
        if (store.pendingNodeId || tool === 'member') {
          store.setPendingNode(null)
          store.setTool('select')
        } else {
          store.deleteMember(id)
        }
        return
      }
      evt.stopPropagation()
      switch (tool) {
        case 'member':
          // While drawing, a click that misses a joint and lands on a member
          // should do nothing rather than quietly switch to selecting it.
          break
        case 'delete':
          store.deleteMember(id)
          break
        case 'paint':
          store.paintMember(id, activeMaterial, activeSection)
          break
        case 'node': {
          // Adding a node on a member splits it at the snapped point.
          const pos = stage.current?.getPointerPosition()
          if (pos) {
            const w = worldAt(pos)
            const m = store.design.members.find((v) => v.id === id)
            const a = store.design.nodes.find((n) => n.id === m?.a)
            const b = store.design.nodes.find((n) => n.id === m?.b)
            if (a && b) {
              // Project the click onto the member so the split point is exact.
              const dx = b.x - a.x
              const dy = b.y - a.y
              const t = Math.max(
                0.05,
                Math.min(0.95, ((w.x - a.x) * dx + (w.y - a.y) * dy) / (dx * dx + dy * dy)),
              )
              store.addNode(
                Math.round((a.x + t * dx) * 1000) / 1000,
                Math.round((a.y + t * dy) * 1000) / 1000,
              )
            }
          }
          break
        }
        default:
          store.select({ memberId: id, nodeId: null })
      }
    },
    [tool, activeMaterial, activeSection, worldAt],
  )

  // Keyboard shortcuts are owned by App so they work from any view.

  // Ghost line from the pending node to the cursor while drawing members.
  const pendingNode = pendingNodeId
    ? design.nodes.find((n) => n.id === pendingNodeId)
    : null

  const cursorStyle = isSpacePressed
    ? 'grab'
    : tool === 'select'
      ? 'default'
      : tool === 'delete'
        ? 'not-allowed'
        : 'crosshair'

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: cursorStyle, touchAction: 'none', background: CANVAS.surface }}
    >
      {width > 0 && height > 0 && (
        <Stage
          ref={(node) => {
            stage.current = node
            // Registered so the report generator can grab a PNG of the diagram.
            captureTargets.stage2d = node
          }}
          width={width}
          height={height}
          onWheel={onWheel}
          onPointerDown={onStageDown}
          onPointerMove={onStageMove}
          onPointerUp={onStageUp}
          onPointerLeave={onStageUp}
        >
          <Layer listening={false}>
            <GridLayer
              viewport={viewport}
              width={width}
              height={height}
              span={design.span}
              clearance={design.clearance}
              gridStep={design.gridStep}
            />
          </Layer>
          <Layer>
            <StructureLayer
              design={design}
              live={live}
              overlay={overlay}
              viewport={viewport}
              selectedMemberId={selectedMemberId}
              selectedNodeId={selectedNodeId}
              hoverMemberId={hoverMemberId}
              brokenMemberId={brokenMemberId}
              onMemberDown={onMemberDown}
              onMemberEnter={setHoverMemberId}
              onMemberLeave={() => setHoverMemberId(null)}
              onNodeDown={onNodeDown}
              onNodeUp={onNodeUp}
            />
            {pendingNode && cursorWorld && (
              <Line
                points={[
                  toScreenX(viewport, pendingNode.x),
                  toScreenY(viewport, pendingNode.y),
                  toScreenX(viewport, cursorWorld.x),
                  toScreenY(viewport, cursorWorld.y),
                ]}
                stroke={CANVAS.primary}
                strokeWidth={2}
                dash={[6, 4]}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      )}

      {/* --- viewport controls ------------------------------------------ */}
      <div className="elevation-2 absolute bottom-3 right-3 flex gap-0.5 rounded-full border border-outline-variant/70 bg-surface-container-lowest p-1">
        <IconButton
          icon="add"
          title="Zoom in"
          onClick={() => setViewport((v) => ({ ...v, scale: Math.min(160, v.scale * 1.2) }))}
        />
        <IconButton
          icon="remove"
          title="Zoom out"
          onClick={() => setViewport((v) => ({ ...v, scale: Math.max(6, v.scale / 1.2) }))}
        />
        <IconButton icon="fitScreen" title="Fit to view" onClick={resetView} />
      </div>

      {cursorWorld && (
        <div className="type-label-s elevation-1 pointer-events-none absolute bottom-3 left-3 rounded-sm border border-outline-variant/70 bg-surface-container-lowest px-2.5 py-1.5 font-mono tabular-nums text-on-surface-variant">
          x {cursorWorld.x.toFixed(2)} m · y {cursorWorld.y.toFixed(2)} m
        </div>
      )}
    </div>
  )
}
