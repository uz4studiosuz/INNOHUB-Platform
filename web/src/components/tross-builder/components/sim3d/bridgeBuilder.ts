/**
 * Builds the three.js object graph for a bridge design.
 *
 * The whole bridge is assembled imperatively into one THREE.Group rather than
 * as React elements: there can be several hundred meshes and every one of them
 * moves each frame during a load test, so going through the reconciler would be
 * wasteful. React owns *when* the group is rebuilt (design changes); this
 * module owns what is in it.
 *
 * Every animated piece is described as a "part" that spans two node anchors.
 * A part's ends are (node index, y offset, z offset) triples, so the same
 * update path drives truss members, floor beams, deck panels, kerb lines and
 * handrails — they all just follow their anchor joints.
 */

import * as THREE from 'three'
import type { BridgeDesign } from '../../types'
import { MATERIALS, getSection } from '../../data/materials'
import { DECK_WIDTH } from '../../analysis/model'
import { sectionGeometry } from './sections'
import { asphaltTexture, concreteTexture, materialTexture } from './textures'
import type { RigidBody } from '../../sim/collapse'

export type PartKind = 'member' | 'floor' | 'deck' | 'marking' | 'rail' | 'post'

export interface BridgePart {
  mesh: THREE.Mesh
  kind: PartKind
  /** index into design.members, or -1 for secondary structure */
  memberIndex: number
  /** anchor joints (indices into design.nodes) */
  na: number
  nb: number
  /** offsets from those joints, in metres */
  ya: number
  yb: number
  za: number
  zb: number
  /** unit-length geometry gets scaled along Z; fixed-size parts do not */
  stretch: boolean
  baseColor: THREE.Color
  material: THREE.MeshStandardMaterial
  small: boolean
  body?: RigidBody
}

export interface BuiltBridge {
  group: THREE.Group
  parts: BridgePart[]
  /** deck node indices ordered left to right, for vehicle placement */
  deckNodes: number[]
  deckY: number
  /** disposables owned by this build */
  dispose: () => void
}

const HALF_W = DECK_WIDTH / 2
const RAIL_INSET = 0.25
const DECK_THICKNESS = 0.24
const RAIL_HEIGHT = 1.0

/** Unit-length box whose length axis is +Z, matching the member convention. */
function unitBox(width: number, height: number) {
  return new THREE.BoxGeometry(width, height, 1)
}

export function buildBridge(design: BridgeDesign): BuiltBridge {
  const group = new THREE.Group()
  const parts: BridgePart[] = []
  const owned: (THREE.BufferGeometry | THREE.Material)[] = []

  const nodeIndex = new Map(design.nodes.map((n, i) => [n.id, i]))

  // Deck level = lowest supported joint, matching the solver's definition.
  let deckY = Infinity
  for (const n of design.nodes) if (n.support !== 'none') deckY = Math.min(deckY, n.y)
  if (!Number.isFinite(deckY)) deckY = 0

  const deckNodes = design.nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => Math.abs(n.y - deckY) < 1e-6)
    .sort((p, q) => p.n.x - q.n.x)
    .map(({ i }) => i)

  const add = (part: Omit<BridgePart, 'mesh'> & { mesh: THREE.Mesh }) => {
    group.add(part.mesh)
    parts.push(part)
  }

  // --- truss members, mirrored into two parallel trusses -------------------
  design.members.forEach((member, mi) => {
    const ai = nodeIndex.get(member.a)
    const bi = nodeIndex.get(member.b)
    if (ai === undefined || bi === undefined) return

    const section = getSection(member.sectionId)
    const spec = MATERIALS[member.materialId]
    const geo = sectionGeometry(section)
    const map = materialTexture(member.materialId)
    const baseColor = new THREE.Color(spec.color)

    for (const z of [-HALF_W, HALF_W]) {
      const material = new THREE.MeshStandardMaterial({
        color: baseColor.clone(),
        map: map ?? undefined,
        metalness: spec.metalness,
        roughness: spec.roughness,
      })
      owned.push(material)
      const mesh = new THREE.Mesh(geo, material)
      mesh.userData = { memberIndex: mi, memberId: member.id }
      mesh.castShadow = true
      add({
        mesh,
        kind: 'member',
        memberIndex: mi,
        na: ai,
        nb: bi,
        ya: 0,
        yb: 0,
        za: z,
        zb: z,
        stretch: true,
        baseColor,
        material,
        small: section.depth < 0.12,
      })
    }
  })

  // --- transverse floor beams under every deck joint ----------------------
  const floorGeo = unitBox(0.16, 0.22)
  owned.push(floorGeo)
  const floorMat = new THREE.MeshStandardMaterial({
    color: '#8b939f',
    map: materialTexture('steel') ?? undefined,
    // See MATERIALS.steel: kept off full metalness so it lights correctly
    // without an environment map.
    metalness: 0.45,
    roughness: 0.45,
  })
  owned.push(floorMat)

  for (const ni of deckNodes) {
    const mesh = new THREE.Mesh(floorGeo, floorMat)
    mesh.castShadow = true
    add({
      mesh,
      kind: 'floor',
      memberIndex: -1,
      na: ni,
      nb: ni,
      ya: -0.18,
      yb: -0.18,
      za: -HALF_W,
      zb: HALF_W,
      stretch: true,
      baseColor: new THREE.Color('#8b939f'),
      material: floorMat,
      small: true,
    })
  }

  // --- deck panels, kerb lines and handrails ------------------------------
  const deckGeo = unitBox(DECK_WIDTH, DECK_THICKNESS)
  const markGeo = unitBox(0.14, 0.02)
  const railGeo = unitBox(0.07, 0.1)
  const postGeo = new THREE.BoxGeometry(0.07, RAIL_HEIGHT, 0.07)
  owned.push(deckGeo, markGeo, railGeo, postGeo)

  const deckMat = new THREE.MeshStandardMaterial({
    color: '#565b63',
    map: asphaltTexture(),
    roughness: 0.95,
    metalness: 0.02,
  })
  const markMat = new THREE.MeshStandardMaterial({
    color: '#f2f3f5',
    emissive: new THREE.Color('#3a3a3a'),
    roughness: 0.7,
  })
  const railMat = new THREE.MeshStandardMaterial({
    color: '#c8ccd2',
    metalness: 0.5,
    roughness: 0.35,
  })
  owned.push(deckMat, markMat, railMat)

  for (let i = 0; i < deckNodes.length - 1; i++) {
    const a = deckNodes[i]
    const b = deckNodes[i + 1]

    const deck = new THREE.Mesh(deckGeo, deckMat)
    deck.receiveShadow = true
    deck.castShadow = true
    add({
      mesh: deck,
      kind: 'deck',
      memberIndex: -1,
      na: a,
      nb: b,
      ya: DECK_THICKNESS / 2,
      yb: DECK_THICKNESS / 2,
      za: 0,
      zb: 0,
      stretch: true,
      baseColor: new THREE.Color('#565b63'),
      material: deckMat,
      small: false,
    })

    // Centre line, drawn as one dash per panel.
    const mark = new THREE.Mesh(markGeo, markMat)
    add({
      mesh: mark,
      kind: 'marking',
      memberIndex: -1,
      na: a,
      nb: b,
      ya: DECK_THICKNESS + 0.005,
      yb: DECK_THICKNESS + 0.005,
      za: 0,
      zb: 0,
      stretch: true,
      baseColor: new THREE.Color('#f2f3f5'),
      material: markMat,
      small: true,
    })

    // Edge lines + handrails on both sides.
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(markGeo, markMat)
      add({
        mesh: edge,
        kind: 'marking',
        memberIndex: -1,
        na: a,
        nb: b,
        ya: DECK_THICKNESS + 0.005,
        yb: DECK_THICKNESS + 0.005,
        za: side * (HALF_W - 0.55),
        zb: side * (HALF_W - 0.55),
        stretch: true,
        baseColor: new THREE.Color('#f2f3f5'),
        material: markMat,
        small: true,
      })

      const rail = new THREE.Mesh(railGeo, railMat)
      rail.castShadow = true
      add({
        mesh: rail,
        kind: 'rail',
        memberIndex: -1,
        na: a,
        nb: b,
        ya: DECK_THICKNESS + RAIL_HEIGHT,
        yb: DECK_THICKNESS + RAIL_HEIGHT,
        za: side * (HALF_W - RAIL_INSET),
        zb: side * (HALF_W - RAIL_INSET),
        stretch: true,
        baseColor: new THREE.Color('#c8ccd2'),
        material: railMat,
        small: true,
      })
    }
  }

  // Rail posts sit on the joints themselves.
  for (const ni of deckNodes) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, railMat)
      add({
        mesh: post,
        kind: 'post',
        memberIndex: -1,
        na: ni,
        nb: ni,
        ya: DECK_THICKNESS + RAIL_HEIGHT / 2,
        yb: DECK_THICKNESS + RAIL_HEIGHT / 2,
        za: side * (HALF_W - RAIL_INSET),
        zb: side * (HALF_W - RAIL_INSET),
        stretch: false,
        baseColor: new THREE.Color('#c8ccd2'),
        material: railMat,
        small: true,
      })
    }
  }

  // --- abutments and piers (static: they never join the collapse) ---------
  const concreteMat = new THREE.MeshStandardMaterial({
    color: '#a3a39c',
    map: concreteTexture(),
    roughness: 0.92,
    metalness: 0.02,
  })
  owned.push(concreteMat)

  for (const node of design.nodes) {
    if (node.support === 'none') continue
    const isPier = Math.abs(node.x) > 1e-6 && Math.abs(node.x - design.span) > 1e-6
    const height = isPier ? 8 : 3.2
    const width = isPier ? 1.6 : 2.6
    const geo = new THREE.BoxGeometry(width, height, DECK_WIDTH + 1.6)
    owned.push(geo)
    const mesh = new THREE.Mesh(geo, concreteMat)
    mesh.position.set(node.x, node.y - height / 2 - 0.3, 0)
    mesh.receiveShadow = true
    mesh.castShadow = true
    group.add(mesh)
  }

  return {
    group,
    parts,
    deckNodes,
    deckY,
    dispose: () => {
      for (const item of owned) item.dispose()
      group.clear()
    },
  }
}
