import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useBridgeStore } from '../../store/useBridgeStore'
import { playback, useAnalysisStore } from '../../store/useAnalysisStore'
import { stressColorRGB } from '../../utils/colors'
import { buildBridge, type BridgePart } from './bridgeBuilder'
import { alignMember } from './sections'
import { CollapseSolver } from '../../sim/collapseSolver'
import { playCollapse, playCreak, playSnap, stopEngine } from '../../sim/audio'
import { vehicleState } from '../../sim/vehicleState'
import { inspectState } from '../../sim/inspectState'
import { DECK_WIDTH } from '../../analysis/model'
import { useT } from '../../i18n'
import { severityOf } from '../../utils/severity'

import { MATERIALS, getSection } from '../../data/materials'
import { fmtkNWithMass } from '../../utils/format'

/** How long the wreckage keeps simulating before the report appears. */
const COLLAPSE_DURATION = 5.5
/** Vehicle positions solved per second of playback at 1x speed. */
const STEPS_PER_SECOND = 22
const HALF_W = DECK_WIDTH / 2

const tmpA = new THREE.Vector3()
const tmpB = new THREE.Vector3()
const tmpUp = new THREE.Vector3()
const tmpAxis = new THREE.Vector3()
const tmpTrans = new THREE.Vector3()
const scratch = new THREE.Vector3()
const WORLD_UP = new THREE.Vector3(0, 1, 0)

export function BridgeModel() {
  const t = useT()
  const design = useBridgeStore((s) => s.design)
  const overlay = useBridgeStore((s) => s.overlay)
  const speed = useBridgeStore((s) => s.load.speed)
  const inspectIndex = useAnalysisStore((s) => s.inspectMemberIndex)

  const built = useMemo(() => buildBridge(design), [design])
  useEffect(() => built.dispose, [built])

  const disp = useMemo(() => new Float64Array(design.nodes.length * 2), [design.nodes.length])
  const ratios = useMemo(() => new Float64Array(design.members.length), [design.members.length])

  const solver = useRef<CollapseSolver | null>(null)
  const collapsed = useRef(false)
  const uiCursor = useRef(0)
  const markerGroup = useRef<THREE.Group>(null)

  // A design change invalidates any collapse in progress.
  useEffect(() => {
    collapsed.current = false
    solver.current = null
  }, [built])

  // Rewinding to inspect a failure puts the structure back together.
  useEffect(() => {
    if (inspectIndex < 0) return
    solver.current = null
    collapsed.current = false
    for (const part of built.parts) {
      part.mesh.visible = true
      part.material.opacity = 1
      part.material.transparent = false
    }
  }, [inspectIndex, built])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 20) // a stall must not explode the sim
    const store = useAnalysisStore.getState()
    const { phase, test, live } = store
    const stepCount = test?.steps.length ?? 0

    if (phase === 'running' && stepCount > 0) {
      playback.cursor = Math.min(
        stepCount - 1,
        playback.cursor + dt * STEPS_PER_SECOND * speed,
      )
    }

    // ------------------------------------------------- displacement + stress
    let vehicleX = Number.NaN
    if (test && stepCount > 0 && phase !== 'idle') {
      const i0 = Math.floor(playback.cursor)
      const i1 = Math.min(stepCount - 1, i0 + 1)
      const f = playback.cursor - i0
      const s0 = test.steps[i0]
      const s1 = test.steps[i1]
      for (let i = 0; i < disp.length; i++) {
        disp[i] = s0.displacements[i] + (s1.displacements[i] - s0.displacements[i]) * f
      }
      for (let i = 0; i < ratios.length; i++) {
        ratios[i] = s0.ratios[i] + (s1.ratios[i] - s0.ratios[i]) * f
      }
      vehicleX = s0.vehicleX + (s1.vehicleX - s0.vehicleX) * f
    } else if (live?.ok) {
      disp.set(live.displacements.subarray(0, disp.length))
      ratios.set(live.ratios.subarray(0, ratios.length))
    } else {
      disp.fill(0)
      ratios.fill(0)
    }

    const k = overlay.scale3d
    const groundY = -design.clearance

    // ------------------------------------------------------------- failure
    if (
      phase === 'running' &&
      test &&
      test.failureStep >= 0 &&
      playback.cursor >= test.failureStep &&
      !collapsed.current
    ) {
      collapsed.current = true

      // Hand the deformed geometry straight to the collapse solver so the
      // structure carries on from exactly where the analysis left it.
      solver.current = new CollapseSolver(design, HALF_W, groundY, disp, k)
      solver.current.breakMember(test.failureMemberIndex)
      // The utilisation the user just watched climb decides what goes next.
      solver.current.seedFailure(test.failureMemberIndex, ratios)

      playSnap()
      playCollapse()
      stopEngine()
      store.setBrokenMember(design.members[test.failureMemberIndex]?.id ?? null)
      store.setPhase('collapsing')
      playback.collapseTime = 0
      vehicleState.falling = true
    } else if (phase === 'running' && test && playback.cursor >= stepCount - 1) {
      store.setPhase('complete')
      stopEngine()
    }

    if (phase === 'running') {
      let worst = 0
      for (let i = 0; i < ratios.length; i++) worst = Math.max(worst, ratios[i])
      if (worst > 0.85) playCreak()
    }

    // ------------------------------------------------------------- collapse
    const collapsing = phase === 'collapsing' && solver.current
    if (collapsing && solver.current) {
      playback.collapseTime += dt
      // Fixed sub-steps keep the constraint solver stable regardless of fps.
      const sub = 1 / 120
      let remaining = dt
      while (remaining > 0) {
        solver.current.step(Math.min(sub, remaining))
        remaining -= sub
      }
      // Each newly torn member gets its own crack — this is what makes the
      // collapse sound like a sequence rather than one bang.
      if (solver.current.justBroken.length > 0) {
        playSnap()
        // Publish the running chain of failure so the report can show every
        // member that was lost, not just the one that started it.
        store.setCollapseLog([...solver.current.log])
      }

      if (playback.collapseTime > COLLAPSE_DURATION) {
        store.setCollapseLog([...solver.current.log])
        solver.current = null
        collapsed.current = false
        for (const part of built.parts) {
          part.mesh.visible = true
          part.material.opacity = 1
          part.material.transparent = false
        }
        vehicleState.active = false
        vehicleState.falling = false
        store.setPhase('complete')
        if (test && test.failureMemberIndex >= 0) {
          store.inspectMember(test.failureMemberIndex)
          useBridgeStore.getState().setCamera('inspect')
        }
        store.setResultDialogOpen(true)
      }
    }

    // ------------------------------------------------------ transform parts
    for (const part of built.parts) {
      const s = solver.current
      if (collapsing && s) {
        // Anchors come from the constraint solver; the local up vector is
        // rebuilt from the deck's transverse direction so rails and kerbs roll
        // over with the deck instead of staying stubbornly world-vertical.
        s.anchor(part.na, part.za, tmpA)
        s.anchor(part.nb, part.zb, tmpB)

        if (part.ya !== 0 || part.yb !== 0) {
          tmpAxis.subVectors(tmpB, tmpA)
          s.transverse(part.na, tmpTrans)
          if (tmpAxis.lengthSq() > 1e-8) {
            tmpUp.crossVectors(tmpTrans, tmpAxis.normalize())
            if (tmpUp.lengthSq() < 1e-8) tmpUp.copy(WORLD_UP)
            else tmpUp.normalize()
          } else {
            tmpUp.copy(WORLD_UP)
          }
          tmpA.addScaledVector(tmpUp, part.ya)
          tmpB.addScaledVector(tmpUp, part.yb)
        }

        // A member whose connection has torn is no longer drawn as structure —
        // it has physically left the frame.
        if (part.memberIndex >= 0 && s.isMemberBroken(part.memberIndex)) {
          part.material.transparent = true
          part.material.opacity = Math.max(
            0,
            1 - (playback.collapseTime - 1.5) / 2.5,
          )
          if (part.material.opacity <= 0) part.mesh.visible = false
        }
      } else {
        const A = design.nodes[part.na]
        const B = design.nodes[part.nb]
        if (!A || !B) continue
        tmpA.set(A.x + disp[2 * part.na] * k, A.y + disp[2 * part.na + 1] * k + part.ya, part.za)
        tmpB.set(B.x + disp[2 * part.nb] * k, B.y + disp[2 * part.nb + 1] * k + part.yb, part.zb)
      }

      if (part.stretch) alignMember(part.mesh, tmpA, tmpB, scratch)
      else part.mesh.position.copy(tmpA)
    }

    // ------------------------------------------------------- stress colours
    const showStress = overlay.showStressMap && (phase !== 'idle' || live?.ok)
    for (const part of built.parts) {
      if (part.kind !== 'member' || part.memberIndex < 0) continue
      if (!showStress) {
        part.material.color.copy(part.baseColor)
        continue
      }
      const r = ratios[part.memberIndex] ?? 0
      const [cr, cg, cb] = stressColorRGB(r)
      part.material.color.setRGB(cr, cg, cb)
    }

    // ------------------------------------------------ failure marker + camera
    if (inspectIndex >= 0) {
      const member = design.members[inspectIndex]
      const ai = design.nodes.findIndex((n) => n.id === member?.a)
      const bi = design.nodes.findIndex((n) => n.id === member?.b)
      if (ai >= 0 && bi >= 0) {
        const A = design.nodes[ai]
        const B = design.nodes[bi]
        tmpA.set(A.x + disp[2 * ai] * k, A.y + disp[2 * ai + 1] * k, HALF_W)
        tmpB.set(B.x + disp[2 * bi] * k, B.y + disp[2 * bi + 1] * k, HALF_W)
        const mid = tmpA.clone().add(tmpB).multiplyScalar(0.5)
        inspectState.x = mid.x
        inspectState.y = mid.y
        inspectState.z = mid.z
        inspectState.length = tmpA.distanceTo(tmpB)
        inspectState.active = true

        if (markerGroup.current) {
          markerGroup.current.visible = true
          alignMember(markerGroup.current, tmpA, tmpB, scratch)
        }
      }
    } else {
      inspectState.active = false
      if (markerGroup.current) markerGroup.current.visible = false
    }

    // --------------------------------------------------------- vehicle sync
    vehicleState.x = vehicleX
    vehicleState.deckY = deckHeightAt(design, built.deckNodes, disp, k, vehicleX)
    vehicleState.active = Number.isFinite(vehicleX) && phase !== 'idle'

    uiCursor.current += dt
    if (uiCursor.current > 0.08) {
      uiCursor.current = 0
      if (Math.abs(store.cursor - playback.cursor) > 0.01) store.setCursor(playback.cursor)
    }
  })

  const inspectedMember = inspectIndex >= 0 ? design.members[inspectIndex] : null
  const inspectedSection = inspectedMember ? getSection(inspectedMember.sectionId).name : ''
  const inspectedMaterial = inspectedMember ? MATERIALS[inspectedMember.materialId]?.name : ''
  const liveState = useAnalysisStore.getState().live
  const testState = useAnalysisStore.getState().test
  const inspectedForce = inspectIndex >= 0 ? (testState?.steps[Math.min(testState.steps.length - 1, Math.round(playback.cursor))]?.forces[inspectIndex] ?? liveState?.forces[inspectIndex] ?? 0) : 0
  const inspectedRatio = inspectIndex >= 0 ? (ratios[inspectIndex] ?? 0) : 0
  const isFailedMember = useAnalysisStore.getState().test?.failureMemberIndex === inspectIndex && inspectIndex >= 0

  // The badge uses the same severity bands as every other readout, so a member
  // labelled "Critical" here reads "Critical" in the table and the report too.
  const inspectSeverity = severityOf(isFailedMember ? Infinity : inspectedRatio)
  const inspectStatus = {
    text: t(inspectSeverity.key),
    bg: inspectSeverity.chip,
    color: inspectSeverity.color,
  }

  return (
    <>
      <primitive
        object={built.group}
        onPointerDown={(e: { stopPropagation: () => void; object: THREE.Object3D }) => {
          e.stopPropagation()
          const mesh = e.object as THREE.Mesh
          const memberIndex = mesh.userData?.memberIndex
          if (typeof memberIndex === 'number' && memberIndex >= 0) {
            useAnalysisStore.getState().inspectMember(memberIndex)
            useBridgeStore.getState().setCamera('inspect')
          }
        }}
      />

      {/*
        Highlight cage around the member the user asked to see.

        Mounted conditionally rather than toggled with `visible`: drei's <Html>
        renders through a DOM portal and ignores the parent object's visibility,
        so a hidden marker still painted its badge over the scene the first time
        the 3D view opened.
      */}
      {inspectIndex >= 0 && (
      <group ref={markerGroup} visible={false}>
        <mesh>
          <cylinderGeometry args={[0.32, 0.32, 1, 12, 1, true]} />
          <meshBasicMaterial
            color={inspectStatus.color}
            transparent
            opacity={0.32}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* The cylinder is built around +Y; the group's +Z is the member axis. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 1, 14, 1, true]} />
          <meshBasicMaterial
            color={inspectStatus.color}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <Html center distanceFactor={14} position={[0, 0, 0]} zIndexRange={[20, 0]}>
          <div className="pointer-events-none flex -translate-y-12 flex-col items-center gap-1 rounded-xl border border-outline-variant/80 bg-surface-container-high/95 p-3 text-xs text-on-surface shadow-2xl backdrop-blur-md min-w-48">
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${inspectStatus.bg}`}>
              <span>{inspectStatus.text}</span>
              <span>#{inspectIndex + 1}</span>
            </div>
            <div className="text-[11px] font-medium text-on-surface-variant">
              {inspectedMaterial} · {inspectedSection}
            </div>
            <div className="flex gap-3 font-mono text-[11px] pt-0.5">
              <span>
                {t('dialog.axial')}:{' '}
                <strong className="text-primary">{fmtkNWithMass(inspectedForce)}</strong>
              </span>
              <span>
                {t('dialog.utilisation')}:{' '}
                <strong>{(inspectedRatio * 100).toFixed(0)}%</strong>
              </span>
            </div>
          </div>
        </Html>
      </group>
      )}
    </>
  )
}

/** Deck surface height (including deflection) at a given chainage. */
function deckHeightAt(
  design: ReturnType<typeof useBridgeStore.getState>['design'],
  deckNodes: number[],
  disp: Float64Array,
  scale: number,
  x: number,
): number {
  if (!Number.isFinite(x) || deckNodes.length === 0) return 0
  for (let i = 0; i < deckNodes.length - 1; i++) {
    const a = design.nodes[deckNodes[i]]
    const b = design.nodes[deckNodes[i + 1]]
    if (x < a.x || x > b.x) continue
    const t = (x - a.x) / (b.x - a.x || 1)
    const ya = a.y + disp[2 * deckNodes[i] + 1] * scale
    const yb = b.y + disp[2 * deckNodes[i + 1] + 1] * scale
    return ya + (yb - ya) * t
  }
  const first = design.nodes[deckNodes[0]]
  return first ? first.y : 0
}

export type { BridgePart }
