import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useBridgeStore } from '../../store/useBridgeStore'

/**
 * Wind load indicator: a drifting field of arrows blowing across the bridge,
 * with the arrow count and speed tracking the configured wind speed.
 * Purely illustrative — the actual pressure is applied in the solver.
 */
export function WindArrows() {
  const enabled = useBridgeStore((s) => s.load.windEnabled)
  const windSpeed = useBridgeStore((s) => s.load.windSpeed)
  const span = useBridgeStore((s) => s.design.span)
  const clearance = useBridgeStore((s) => s.design.clearance)

  const group = useRef<THREE.Group>(null)

  const { geometry, material, count, positions } = useMemo(() => {
    // One arrow = shaft + head, merged into a single geometry.
    const shaft = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6)
    shaft.rotateZ(-Math.PI / 2)
    const head = new THREE.ConeGeometry(0.16, 0.45, 8)
    head.rotateZ(-Math.PI / 2)
    head.translate(0.9, 0, 0)

    const merged = new THREE.BufferGeometry()
    const shaftPos = shaft.attributes.position.array as Float32Array
    const headPos = head.attributes.position.array as Float32Array
    // Non-indexed merge keeps this trivial.
    const s = shaft.toNonIndexed()
    const h = head.toNonIndexed()
    const total = new Float32Array(
      (s.attributes.position.array as Float32Array).length +
        (h.attributes.position.array as Float32Array).length,
    )
    total.set(s.attributes.position.array as Float32Array, 0)
    total.set(
      h.attributes.position.array as Float32Array,
      (s.attributes.position.array as Float32Array).length,
    )
    merged.setAttribute('position', new THREE.BufferAttribute(total, 3))
    merged.computeVertexNormals()
    shaft.dispose()
    head.dispose()
    s.dispose()
    h.dispose()
    void shaftPos
    void headPos

    const mat = new THREE.MeshBasicMaterial({
      color: '#7dd3fc',
      transparent: true,
      opacity: 0.75,
    })

    // Lay the arrows out in a grid across the elevation of the bridge.
    const cols = 12
    const rows = 5
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        pts.push(
          new THREE.Vector3(
            (i / cols) * (span + 8) - 4,
            -clearance * 0.4 + (j / rows) * (clearance + 8),
            -6 - (j % 2) * 1.5,
          ),
        )
      }
    }
    return { geometry: merged, material: mat, count: pts.length, positions: pts }
  }, [span, clearance])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const mesh = useRef<THREE.InstancedMesh>(null)
  const drift = useRef(0)

  useFrame((_, dt) => {
    if (!enabled || !mesh.current) return
    // Arrows travel with the wind and wrap around at the far end.
    drift.current = (drift.current + dt * (2 + windSpeed / 12)) % (span + 8)
    for (let i = 0; i < count; i++) {
      const p = positions[i]
      const x = ((p.x + drift.current + 4) % (span + 8)) - 4
      dummy.position.set(x, p.y, p.z)
      const scale = 0.6 + windSpeed / 150
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  if (!enabled) return null

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />
    </group>
  )
}
