import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useBridgeStore, type CameraPreset } from '../../store/useBridgeStore'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { Environment3D } from './Environment3D'
import { BridgeModel } from './BridgeModel'
import { Vehicle } from './Vehicle'
import { WindArrows } from './WindArrows'
import { vehicleState } from '../../sim/vehicleState'
import { inspectState } from '../../sim/inspectState'
import { captureTargets } from '../../utils/captureTargets'
import { vehicleSpec } from '../../analysis/useSolver'

/** Camera placements for each preset, in metres, relative to the span. */
function presetPose(preset: CameraPreset, span: number, clearance: number) {
  const c = span / 2
  switch (preset) {
    // "Side" is the elevation you draw a truss in — looking at its profile.
    case 'side':
      return { pos: new THREE.Vector3(c, 3, span * 1.15), target: new THREE.Vector3(c, 2, 0) }
    // "Front" looks straight down the deck from beyond the abutment.
    case 'front':
      return { pos: new THREE.Vector3(-span * 0.75, 4, 0.001), target: new THREE.Vector3(c, 2, 0) }
    case 'top':
      return { pos: new THREE.Vector3(c, span * 1.1, 0.001), target: new THREE.Vector3(c, 0, 0) }
    case 'perspective':
    default:
      return {
        pos: new THREE.Vector3(-span * 0.45, clearance + 9, span * 0.75),
        target: new THREE.Vector3(c, 1.5, 0),
      }
  }
}

/**
 * Drives the camera. Presets ease into place; "drive cam" rides just behind the
 * vehicle and is the only mode that disables orbiting.
 */
function CameraRig({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const preset = useBridgeStore((s) => s.camera)
  const span = useBridgeStore((s) => s.design.span)
  const clearance = useBridgeStore((s) => s.design.clearance)
  const vehicle = useBridgeStore((s) => s.load.vehicle)
  const customLoad = useBridgeStore((s) => s.load.customLoad)
  const vehicleLength = vehicleSpec(vehicle, customLoad).length
  const { camera } = useThree()

  const desiredPos = useRef(new THREE.Vector3())
  const desiredTarget = useRef(new THREE.Vector3())
  const animating = useRef(false)

  useEffect(() => {
    if (preset === 'drive' || preset === 'inspect') return
    const pose = presetPose(preset, span, clearance)
    desiredPos.current.copy(pose.pos)
    desiredTarget.current.copy(pose.target)
    animating.current = true
  }, [preset, span, clearance])

  useFrame((_, dt) => {
    const ctl = controls.current
    if (!ctl) return

    // Orbit slowly around the member the user asked to inspect, framed so the
    // whole member fits regardless of how long it is.
    if (preset === 'inspect' && inspectState.active) {
      ctl.enabled = true
      const radius = Math.max(6, inspectState.length * 2.4)
      const target = new THREE.Vector3(inspectState.x, inspectState.y, inspectState.z)
      const k = 1 - Math.pow(0.004, dt)
      camera.position.lerp(
        new THREE.Vector3(target.x - radius * 0.5, target.y + radius * 0.45, target.z + radius),
        k,
      )
      ctl.target.lerp(target, k)
      ctl.update()
      return
    }

    if (preset === 'drive') {
      ctl.enabled = false
      const raw = Number.isFinite(vehicleState.x) ? vehicleState.x : 0
      // Keep the bridge in shot while the vehicle is still on the approach —
      // following it all the way out leaves the camera staring past the bank.
      const x = THREE.MathUtils.clamp(raw, -2, span + 2)
      // Chase position: behind and above the cab, looking down the deck. The
      // stand-off has to clear the whole vehicle — a fixed offset that sits
      // nicely behind the 6.5 m truck ends up inside the 14 m train.
      const back = vehicleLength + 5
      const k = 1 - Math.pow(0.001, dt)
      camera.position.lerp(new THREE.Vector3(x - back, vehicleState.deckY + 4.6, 8), k)
      ctl.target.lerp(new THREE.Vector3(x + 2, vehicleState.deckY + 1.4, 0), k)
      ctl.update()
      return
    }

    ctl.enabled = true
    if (animating.current) {
      const k = 1 - Math.pow(0.002, dt)
      camera.position.lerp(desiredPos.current, k)
      ctl.target.lerp(desiredTarget.current, k)
      ctl.update()
      if (camera.position.distanceTo(desiredPos.current) < 0.25) animating.current = false
    }
  })

  return null
}

/** Grabs the WebGL canvas once so `Report` can call toDataURL on it. */
function CanvasHandle() {
  const { gl } = useThree()
  useEffect(() => {
    captureTargets.scene3d = gl.domElement
    return () => {
      captureTargets.scene3d = null
    }
  }, [gl])
  return null
}

export function Scene3D() {
  const span = useBridgeStore((s) => s.design.span)
  const clearance = useBridgeStore((s) => s.design.clearance)
  const controls = useRef<OrbitControlsImpl | null>(null)

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      // preserveDrawingBuffer is what makes the PDF screenshot possible.
      gl={{ preserveDrawingBuffer: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [-12, 14, 20], fov: 48, near: 0.1, far: 900 }}
      style={{ background: '#bcd8f2' }}
      onPointerMissed={() => {
        const store = useAnalysisStore.getState()
        if (store.inspectMemberIndex >= 0) {
          store.inspectMember(-1)
          useBridgeStore.getState().setCamera('perspective')
        }
      }}
    >
      <CanvasHandle />
      {/*
        The stress map carries information, so members must stay legible even
        when they face away from the sun or sit in the other truss's shadow.
        Hence a generous fill and a softer key light than a purely photographic
        setup would use.
      */}
      <hemisphereLight args={['#cfe3f7', '#5b6450', 1.15]} />
      <directionalLight
        position={[span * 0.6, 42, 26]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-far={140}
      />
      <ambientLight intensity={0.55} />

      <Environment3D span={span} clearance={clearance} />
      <BridgeModel />
      <Vehicle />
      <WindArrows />

      <OrbitControls
        ref={controls}
        makeDefault
        target={[span / 2, 1.5, 0]}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI * 0.495}
        minDistance={6}
        maxDistance={span * 3.5}
      />
      <CameraRig controls={controls} />
    </Canvas>
  )
}
