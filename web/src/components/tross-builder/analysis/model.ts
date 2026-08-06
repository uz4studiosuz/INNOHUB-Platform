/**
 * Flattening a `BridgeDesign` into typed arrays that can be structured-cloned
 * into the solver worker with no object churn.
 */

import type { BridgeDesign, MaterialId } from '../types'
import { GRAVITY, MATERIALS, getSection } from '../data/materials'

export const SUPPORT_NONE = 0
export const SUPPORT_PIN = 1
export const SUPPORT_ROLLER = 2

export interface SolverModel {
  nodeCount: number
  memberCount: number
  /** node coordinates, m */
  nx: Float64Array
  ny: Float64Array
  /** SUPPORT_* per node */
  support: Uint8Array
  /** member end node indices */
  ma: Uint32Array
  mb: Uint32Array
  /** per-member section/material properties (SI) */
  E: Float64Array
  area: Float64Array
  /** weak-axis second moment — the axis that actually buckles */
  inertia: Float64Array
  density: Float64Array
  fyT: Float64Array
  fyC: Float64Array
  /** out-of-plane depth of the member, used for wind area, m */
  depth: Float64Array
  /** deck level (y of the abutments), m */
  deckY: number
  span: number
  /** indices of the members that form the deck, left to right */
  deckMembers: Uint32Array
  /** total self weight of the truss members, N */
  selfWeightN: number
  /** total mass, kg, and cost, $ */
  totalMass: number
  totalCost: number
  massByMaterial: Record<MaterialId, number>
  costByMaterial: Record<MaterialId, number>
  /** id lookup so results can be mapped back to the design */
  nodeIds: string[]
  memberIds: string[]
}

/** Mass of deck slab + barriers carried per metre of deck, kg/m. */
export const DECK_MASS_PER_M = 480

/** Deck width used for the 3D model, wind area and deck dead load, m. */
export const DECK_WIDTH = 4.2

/** Height of the solid deck edge exposed to wind, m. */
export const DECK_EDGE_HEIGHT = 0.9

export function buildModel(design: BridgeDesign): SolverModel {
  const { nodes, members } = design
  const n = nodes.length
  const m = members.length

  const index = new Map<string, number>()
  nodes.forEach((node, i) => index.set(node.id, i))

  const nx = new Float64Array(n)
  const ny = new Float64Array(n)
  const support = new Uint8Array(n)
  nodes.forEach((node, i) => {
    nx[i] = node.x
    ny[i] = node.y
    support[i] =
      node.support === 'pin' ? SUPPORT_PIN : node.support === 'roller' ? SUPPORT_ROLLER : SUPPORT_NONE
  })

  const ma = new Uint32Array(m)
  const mb = new Uint32Array(m)
  const E = new Float64Array(m)
  const area = new Float64Array(m)
  const inertia = new Float64Array(m)
  const density = new Float64Array(m)
  const fyT = new Float64Array(m)
  const fyC = new Float64Array(m)
  const depth = new Float64Array(m)

  const massByMaterial = { steel: 0, wood: 0, composite: 0 } as Record<MaterialId, number>
  const costByMaterial = { steel: 0, wood: 0, composite: 0 } as Record<MaterialId, number>

  let totalMass = 0
  let totalCost = 0

  members.forEach((member, i) => {
    const ai = index.get(member.a) ?? 0
    const bi = index.get(member.b) ?? 0
    const mat = MATERIALS[member.materialId]
    const sec = getSection(member.sectionId)

    ma[i] = ai
    mb[i] = bi
    E[i] = mat.E
    area[i] = sec.area
    // Euler buckling always finds the weakest axis.
    inertia[i] = Math.min(sec.Ix, sec.Iy)
    density[i] = mat.density
    fyT[i] = mat.fyTension
    fyC[i] = mat.fyCompression
    depth[i] = sec.depth

    const len = Math.hypot(nx[bi] - nx[ai], ny[bi] - ny[ai])
    const mass = mat.density * sec.area * len
    totalMass += mass
    totalCost += mass * mat.costPerKg
    massByMaterial[member.materialId] += mass
    costByMaterial[member.materialId] += mass * mat.costPerKg
  })

  // Deck level = the lowest supported node. Deck members are the horizontal
  // members that sit on that line; they carry the slab and the vehicle.
  let deckY = Infinity
  for (let i = 0; i < n; i++) {
    if (support[i] !== SUPPORT_NONE) deckY = Math.min(deckY, ny[i])
  }
  if (!Number.isFinite(deckY)) deckY = 0

  const deck: number[] = []
  for (let i = 0; i < m; i++) {
    const a = ma[i]
    const b = mb[i]
    const onDeck = Math.abs(ny[a] - deckY) < 1e-6 && Math.abs(ny[b] - deckY) < 1e-6
    if (onDeck && Math.abs(nx[a] - nx[b]) > 1e-6) deck.push(i)
  }
  deck.sort((p, q) => Math.min(nx[ma[p]], nx[mb[p]]) - Math.min(nx[ma[q]], nx[mb[q]]))

  // Deck slab mass counts towards weight and cost too — priced as concrete at
  // a flat $0.35/kg so a heavier deck is not free.
  const deckLength = deck.reduce(
    (acc, i) => acc + Math.abs(nx[mb[i]] - nx[ma[i]]),
    0,
  )
  const deckMass = deckLength * DECK_MASS_PER_M
  totalMass += deckMass
  totalCost += deckMass * 0.35

  let selfWeightN = 0
  for (let i = 0; i < m; i++) {
    const len = Math.hypot(nx[mb[i]] - nx[ma[i]], ny[mb[i]] - ny[ma[i]])
    selfWeightN += density[i] * area[i] * len * GRAVITY
  }

  return {
    nodeCount: n,
    memberCount: m,
    nx,
    ny,
    support,
    ma,
    mb,
    E,
    area,
    inertia,
    density,
    fyT,
    fyC,
    depth,
    deckY,
    span: design.span,
    deckMembers: Uint32Array.from(deck),
    selfWeightN,
    totalMass,
    totalCost,
    massByMaterial,
    costByMaterial,
    nodeIds: nodes.map((node) => node.id),
    memberIds: members.map((member) => member.id),
  }
}
