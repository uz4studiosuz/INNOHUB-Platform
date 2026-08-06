import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useBridgeStore } from '../../store/useBridgeStore'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { resetVehicleState, vehicleState } from '../../sim/vehicleState'
import { makeBody, stepBody, type RigidBody } from '../../sim/collapse'

/**
 * The test vehicle.
 *
 * Built once as a plain three.js group (boxes and cylinders — low poly by
 * design) and then driven imperatively from `vehicleState`, which the bridge
 * model fills in as it walks the solved load steps. When the deck fails the
 * whole truck is handed to the same rigid-body integrator as the debris.
 */

const BODY_COLOURS = ['#c0392b', '#1f6feb', '#e0a800', '#2f9e63']

function wheel(x: number, z: number, radius: number) {
  const geo = new THREE.CylinderGeometry(radius, radius, 0.3, 14)
  geo.rotateX(Math.PI / 2)
  const mat = new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.9 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, radius, z)
  mesh.castShadow = true
  return mesh
}

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  opts: { metalness?: number; roughness?: number; opacity?: number } = {},
) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: opts.metalness ?? 0.35,
    roughness: opts.roughness ?? 0.55,
    transparent: opts.opacity !== undefined,
    opacity: opts.opacity ?? 1,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  return mesh
}

/**
 * Local frame: the nose sits at x = 0 and the vehicle extends towards −x, so
 * placing the group at the solved nose chainage lines the axles up with the
 * loads the solver applied.
 */
function buildTruck(): { group: THREE.Group; wheels: THREE.Mesh[] } {
  const group = new THREE.Group()
  const wheels: THREE.Mesh[] = []
  const colour = BODY_COLOURS[0]

  group.add(box(6.4, 0.22, 2.2, -3.2, 0.72, 0, '#3c4149', { metalness: 0.6 }))
  // Cab
  group.add(box(1.9, 1.5, 2.3, -0.95, 1.6, 0, colour))
  group.add(box(1.55, 0.75, 2.34, -0.8, 2.15, 0, '#0f2233', { metalness: 0.1, roughness: 0.15 }))
  group.add(box(0.25, 0.55, 2.3, -0.06, 1.15, 0, '#d7dbe0', { metalness: 0.8 }))
  // Box body
  group.add(box(4.0, 2.3, 2.35, -4.2, 2.0, 0, '#e8eaed', { metalness: 0.15, roughness: 0.6 }))
  group.add(box(4.05, 0.12, 2.4, -4.2, 3.15, 0, colour))
  // Bumper + lights
  group.add(box(0.18, 0.3, 2.2, 0.02, 0.85, 0, '#2b2f36'))
  for (const z of [-0.85, 0.85]) {
    group.add(box(0.1, 0.2, 0.3, 0.05, 1.25, z, '#ffe9a8', { roughness: 0.2 }))
  }

  for (const [x, z] of [
    [-1.3, -1.05],
    [-1.3, 1.05],
    [-4.6, -1.05],
    [-4.6, 1.05],
    [-5.5, -1.05],
    [-5.5, 1.05],
  ] as const) {
    const w = wheel(x, z, 0.52)
    wheels.push(w)
    group.add(w)
  }
  return { group, wheels }
}

function buildTrain(): { group: THREE.Group; wheels: THREE.Mesh[] } {
  const group = new THREE.Group()
  const wheels: THREE.Mesh[] = []

  // Locomotive
  group.add(box(6.2, 0.3, 2.6, -3.1, 0.8, 0, '#2b2f36', { metalness: 0.7 }))
  group.add(box(5.4, 2.4, 2.7, -3.2, 2.15, 0, '#1f6feb'))
  group.add(box(2.0, 0.9, 2.74, -1.3, 3.1, 0, '#0f2233', { metalness: 0.1, roughness: 0.15 }))
  group.add(box(0.4, 1.9, 2.6, -0.2, 1.9, 0, '#c9ced6', { metalness: 0.8 }))

  // Carriage
  group.add(box(6.4, 0.3, 2.6, -10.4, 0.8, 0, '#2b2f36', { metalness: 0.7 }))
  group.add(box(6.2, 2.5, 2.7, -10.4, 2.2, 0, '#4b5563'))
  for (let i = 0; i < 5; i++) {
    group.add(box(0.7, 0.8, 2.74, -8.2 - i * 1.1, 2.7, 0, '#0f2233', { metalness: 0.1, roughness: 0.15 }))
  }
  // Coupling
  group.add(box(1.0, 0.2, 0.3, -6.8, 0.85, 0, '#8b939f', { metalness: 0.8 }))

  for (const x of [-1.5, -4.5, -9.5, -12.5]) {
    for (const z of [-1.1, 1.1]) {
      const w = wheel(x, z, 0.55)
      wheels.push(w)
      group.add(w)
    }
  }
  return { group, wheels }
}

export function Vehicle() {
  const kind = useBridgeStore((s) => s.load.vehicle)
  const speed = useBridgeStore((s) => s.load.speed)
  const clearance = useBridgeStore((s) => s.design.clearance)
  const phase = useAnalysisStore((s) => s.phase)

  const built = useMemo(() => (kind === 'train' ? buildTrain() : buildTruck()), [kind])
  const body = useRef<RigidBody | null>(null)
  const lastX = useRef(0)

  useEffect(() => {
    body.current = null
    built.group.rotation.set(0, 0, 0)
    // Re-entering the 3D view must never inherit a fall from a previous run.
    if (phase === 'idle') resetVehicleState()
  }, [built, phase])

  useEffect(() => {
    return () => {
      built.group.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      })
    }
  }, [built])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 20)
    const group = built.group

    /*
     * `vehicleState` is a module singleton that outlives this component, so a
     * collapse from an earlier run used to leave `falling` set. Switching to 2D
     * and back re-mounted the truck straight into a fall with no test running.
     * The phase is the authority: only a collapse can put the vehicle in the
     * air, and anything else clears the flag.
     */
    const mayFall = phase === 'collapsing' || phase === 'complete'
    if (!mayFall && vehicleState.falling) {
      vehicleState.falling = false
      body.current = null
      group.rotation.set(0, 0, 0)
    }

    if (!vehicleState.active) {
      group.visible = false
      return
    }
    group.visible = true

    if (vehicleState.falling && mayFall) {
      // Hand the vehicle to the debris integrator once the deck is gone.
      if (!body.current) {
        body.current = makeBody(group.position, group.quaternion, 1.2, false)
        body.current.velocity.set(2 + Math.random(), -1, (Math.random() - 0.5) * 1.5)
        body.current.spin.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1.5,
          -1.6 - Math.random(),
        )
      }
      stepBody(body.current, dt, -clearance)
      group.position.copy(body.current.position)
      group.quaternion.copy(body.current.quaternion)
      return
    }

    const x = vehicleState.x
    if (!Number.isFinite(x)) {
      group.visible = false
      return
    }

    group.position.set(x, vehicleState.deckY, 0)
    // Pitch with the local deck slope so it leans into the sag.
    const travelled = x - lastX.current
    lastX.current = x
    group.rotation.set(0, 0, 0)

    for (const w of built.wheels) {
      w.rotation.x += (travelled / 0.52) * (travelled === 0 ? 0 : 1)
    }
    void speed
  })

  return <primitive object={built.group} />
}
