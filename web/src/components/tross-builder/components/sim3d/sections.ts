/**
 * Turns a `CrossSection` into an extrudable three.js profile.
 *
 * Profiles are drawn in local XY (centred on the centroid) and extruded one
 * metre along +Z. A member mesh then scales Z by its length and rotates +Z onto
 * the member axis, so every member of a given section shares one geometry.
 */

import * as THREE from 'three'
import type { CrossSection } from '../../types'

function rectShape(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, -h / 2)
  s.lineTo(w / 2, -h / 2)
  s.lineTo(w / 2, h / 2)
  s.lineTo(-w / 2, h / 2)
  s.closePath()
  return s
}

function boxShape(w: number, h: number, t: number): THREE.Shape {
  const s = rectShape(w, h)
  const hole = new THREE.Path()
  const iw = Math.max(w - 2 * t, w * 0.1)
  const ih = Math.max(h - 2 * t, h * 0.1)
  hole.moveTo(-iw / 2, -ih / 2)
  hole.lineTo(-iw / 2, ih / 2)
  hole.lineTo(iw / 2, ih / 2)
  hole.lineTo(iw / 2, -ih / 2)
  hole.closePath()
  s.holes.push(hole)
  return s
}

function tubeShape(d: number, t: number): THREE.Shape {
  const s = new THREE.Shape()
  s.absarc(0, 0, d / 2, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absarc(0, 0, Math.max(d / 2 - t, d * 0.1), 0, Math.PI * 2, true)
  s.holes.push(hole)
  return s
}

function iBeamShape(h: number, bf: number, tf: number, tw: number): THREE.Shape {
  const s = new THREE.Shape()
  const hy = h / 2
  const hb = bf / 2
  const hw = tw / 2
  s.moveTo(-hb, -hy)
  s.lineTo(hb, -hy)
  s.lineTo(hb, -hy + tf)
  s.lineTo(hw, -hy + tf)
  s.lineTo(hw, hy - tf)
  s.lineTo(hb, hy - tf)
  s.lineTo(hb, hy)
  s.lineTo(-hb, hy)
  s.lineTo(-hb, hy - tf)
  s.lineTo(-hw, hy - tf)
  s.lineTo(-hw, -hy + tf)
  s.lineTo(-hb, -hy + tf)
  s.closePath()
  return s
}

function angleShape(leg: number, t: number): THREE.Shape {
  const s = new THREE.Shape()
  // Centre the L roughly on its bounding box so it extrudes symmetrically.
  const o = leg / 2
  s.moveTo(-o, -o)
  s.lineTo(leg - o, -o)
  s.lineTo(leg - o, t - o)
  s.lineTo(t - o, t - o)
  s.lineTo(t - o, leg - o)
  s.lineTo(-o, leg - o)
  s.closePath()
  return s
}

export function sectionShape(section: CrossSection): THREE.Shape {
  switch (section.shape) {
    case 'ibeam':
      return iBeamShape(section.depth, section.width, section.thickness, section.thickness * 0.7)
    case 'tube':
      return tubeShape(section.depth, section.thickness)
    case 'box':
      return boxShape(section.width, section.depth, section.thickness)
    case 'angle':
      return angleShape(section.depth, section.thickness)
    case 'rect':
    default:
      return rectShape(section.width, section.depth)
  }
}

const cache = new Map<string, THREE.BufferGeometry>()

/**
 * Unit-length extrusion for a section, cached by id.
 * Curved profiles get a low segment count — there can be hundreds of these on
 * screen and the silhouette barely changes above 8 segments.
 */
export function sectionGeometry(section: CrossSection): THREE.BufferGeometry {
  const hit = cache.get(section.id)
  if (hit) return hit

  const geo = new THREE.ExtrudeGeometry(sectionShape(section), {
    depth: 1,
    bevelEnabled: false,
    curveSegments: section.shape === 'tube' ? 10 : 1,
    steps: 1,
  })
  // Extrusion runs 0..1 in Z; recentre so scaling about the midpoint works.
  geo.translate(0, 0, -0.5)
  geo.computeVertexNormals()
  cache.set(section.id, geo)
  return geo
}

export function disposeSectionCache() {
  for (const geo of cache.values()) geo.dispose()
  cache.clear()
}

const Z_AXIS = new THREE.Vector3(0, 0, 1)

/**
 * Orient and stretch a unit-length member mesh so it spans `a` -> `b`.
 * `up` keeps the strong axis of the profile vertical in the truss plane.
 */
export function alignMember(
  object: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  scratch = new THREE.Vector3(),
) {
  scratch.subVectors(b, a)
  const length = scratch.length() || 1e-6
  object.position.copy(a).add(b).multiplyScalar(0.5)
  object.quaternion.setFromUnitVectors(Z_AXIS, scratch.divideScalar(length))
  object.scale.set(1, 1, length)
  return length
}
