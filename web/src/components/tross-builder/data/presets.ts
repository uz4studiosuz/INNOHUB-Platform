/**
 * Standard truss generators.
 *
 * Every preset produces a *through truss* with the deck on the bottom chord:
 * bottom chord runs the full span at y = 0, abutments sit at the two ends
 * (left pinned, right roller).
 */

import type { BridgeDesign, BridgeNode, MaterialId, Member } from '../types'
import { defaultSectionFor } from './materials'
import { uid } from '../utils/id'

export type PresetId = 'blank' | 'warren' | 'pratt' | 'howe' | 'ktruss' | 'baltimore'

export const PRESETS: { id: PresetId; name: string; description: string }[] = [
  { id: 'blank', name: 'Blank Span', description: 'Two abutments, nothing else' },
  { id: 'warren', name: 'Warren', description: 'Alternating equilateral diagonals' },
  { id: 'pratt', name: 'Pratt', description: 'Diagonals in tension, verticals in compression' },
  { id: 'howe', name: 'Howe', description: 'Diagonals in compression — good for timber' },
  { id: 'ktruss', name: 'K-Truss', description: 'Split verticals, short buckling lengths' },
  { id: 'baltimore', name: 'Baltimore', description: 'Pratt with sub-struts for a stiff deck' },
]

interface Builder {
  nodes: BridgeNode[]
  members: Member[]
  material: MaterialId
}

function mkBuilder(material: MaterialId): Builder {
  return { nodes: [], members: [], material }
}

function addNode(b: Builder, x: number, y: number, support: BridgeNode['support'] = 'none') {
  const node: BridgeNode = {
    id: uid('n'),
    x: round(x),
    y: round(y),
    support,
    locked: support !== 'none',
  }
  b.nodes.push(node)
  return node.id
}

function addMember(b: Builder, a: string, c: string) {
  if (a === c) return
  const exists = b.members.some(
    (m) => (m.a === a && m.b === c) || (m.a === c && m.b === a),
  )
  if (exists) return
  b.members.push({
    id: uid('m'),
    a,
    b: c,
    materialId: b.material,
    sectionId: defaultSectionFor(b.material),
  })
}

/** Snap to 1 mm so floating point drift never creates "almost equal" nodes. */
function round(v: number) {
  return Math.round(v * 1000) / 1000
}

function midpoint(b: Builder, a: string, c: string) {
  const na = b.nodes.find((n) => n.id === a)!
  const nc = b.nodes.find((n) => n.id === c)!
  return addNode(b, (na.x + nc.x) / 2, (na.y + nc.y) / 2)
}

// ---------------------------------------------------------------------------

interface PresetOptions {
  span: number
  height: number
  panels: number
  material: MaterialId
}

/**
 * Bottom chord: `panels + 1` nodes, ends are the abutments.
 * Returns the ids in left-to-right order.
 */
function bottomChord(b: Builder, span: number, panels: number): string[] {
  const p = span / panels
  const ids: string[] = []
  for (let i = 0; i <= panels; i++) {
    const support = i === 0 ? 'pin' : i === panels ? 'roller' : 'none'
    ids.push(addNode(b, i * p, 0, support))
  }
  return ids
}

function chainMembers(b: Builder, ids: string[]) {
  for (let i = 0; i < ids.length - 1; i++) addMember(b, ids[i], ids[i + 1])
}

function buildWarren(o: PresetOptions): Builder {
  const b = mkBuilder(o.material)
  const p = o.span / o.panels
  const bot = bottomChord(b, o.span, o.panels)
  chainMembers(b, bot)

  // Top chord nodes sit over the centre of each panel.
  const top: string[] = []
  for (let i = 0; i < o.panels; i++) top.push(addNode(b, (i + 0.5) * p, o.height))
  chainMembers(b, top)

  // Each top node is picked up by two diagonals — the classic W pattern.
  for (let i = 0; i < o.panels; i++) {
    addMember(b, top[i], bot[i])
    addMember(b, top[i], bot[i + 1])
  }
  return b
}

/** Shared skeleton for Pratt / Howe: verticals + end posts, diagonals differ. */
function buildNTruss(o: PresetOptions, diagonalsToCentre: boolean): Builder {
  const b = mkBuilder(o.material)
  const p = o.span / o.panels
  const bot = bottomChord(b, o.span, o.panels)
  chainMembers(b, bot)

  // Top chord spans the interior panel points only; the end posts are inclined.
  const top: (string | null)[] = [null]
  for (let i = 1; i < o.panels; i++) top.push(addNode(b, i * p, o.height))
  top.push(null)
  chainMembers(b, top.slice(1, -1) as string[])

  // End posts
  addMember(b, bot[0], top[1]!)
  addMember(b, bot[o.panels], top[o.panels - 1]!)

  // Verticals at every interior panel point
  for (let i = 1; i < o.panels; i++) addMember(b, bot[i], top[i]!)

  // Interior diagonals, panel by panel and mirrored about mid-span. The two end
  // panels are already braced by the inclined end posts, so they are skipped.
  //
  //   Pratt: diagonals fall towards mid-span, so they carry tension.
  //   Howe:  diagonals rise towards mid-span, so they carry compression —
  //          which is what you want when building in timber.
  //
  // Indexing by panel rather than by top joint matters: mirroring a
  // joint-indexed rule lands the Howe diagonals back on the end posts, which
  // silently de-triangulates the first and last top joints.
  const mid = o.panels / 2
  for (let p = 1; p < o.panels - 1; p++) {
    const leftHalf = p + 0.5 < mid
    const near = leftHalf ? p : p + 1 // panel point closer to the abutment
    const far = leftHalf ? p + 1 : p // panel point closer to mid-span
    if (diagonalsToCentre) addMember(b, top[near]!, bot[far])
    else addMember(b, bot[near], top[far]!)
  }
  return b
}

function buildKTruss(o: PresetOptions): Builder {
  const b = mkBuilder(o.material)
  const p = o.span / o.panels
  const h = o.height
  const bot = bottomChord(b, o.span, o.panels)
  chainMembers(b, bot)

  const top: (string | null)[] = [null]
  for (let i = 1; i < o.panels; i++) top.push(addNode(b, i * p, h))
  top.push(null)
  chainMembers(b, top.slice(1, -1) as string[])

  addMember(b, bot[0], top[1]!)
  addMember(b, bot[o.panels], top[o.panels - 1]!)

  // Split each interior vertical at mid height — that midpoint anchors the K.
  const mids: (string | null)[] = [null]
  for (let i = 1; i < o.panels; i++) {
    const m = addNode(b, i * p, h / 2)
    mids.push(m)
    addMember(b, bot[i], m)
    addMember(b, m, top[i]!)
  }
  mids.push(null)

  // Every panel gets its pair of K diagonals, flipping direction at mid-span.
  // The end panels only reach the bottom chord (there is no top node above the
  // abutment) — that is still enough to brace the end mid-height nodes.
  const centre = o.panels / 2
  for (let i = 0; i < o.panels; i++) {
    const openRight = i + 0.5 < centre
    const mid = openRight ? mids[i + 1] : mids[i]
    const target = openRight ? i : i + 1
    if (!mid) continue
    addMember(b, mid, bot[target])
    if (top[target]) addMember(b, mid, top[target]!)
  }
  return b
}

function buildBaltimore(o: PresetOptions): Builder {
  // Baltimore = Pratt + sub-struts hanging off the main diagonals.
  const b = buildNTruss(o, true)
  const p = o.span / o.panels

  // Re-find the chords by geometry (the builder does not keep them labelled).
  const bot = b.nodes.filter((n) => n.y === 0).sort((m, n) => m.x - n.x)

  // Take a snapshot: we are about to mutate b.members while iterating.
  const diagonals = b.members.filter((m) => {
    const na = b.nodes.find((n) => n.id === m.a)!
    const nb = b.nodes.find((n) => n.id === m.b)!
    return na.y !== nb.y && Math.abs(na.x - nb.x) > 1e-6
  })

  for (const d of diagonals) {
    const na = b.nodes.find((n) => n.id === d.a)!
    const nb = b.nodes.find((n) => n.id === d.b)!
    const mx = (na.x + nb.x) / 2
    // Sub-node on the bottom chord directly below the diagonal's midpoint.
    const below = bot.find((n) => Math.abs(n.x - mx) < p * 0.01)
    if (below) continue // already a panel point

    const dm = midpoint(b, d.a, d.b)
    // Split the diagonal in two.
    b.members = b.members.filter((m) => m.id !== d.id)
    addMember(b, d.a, dm)
    addMember(b, dm, d.b)

    // Split the bottom chord panel and hang the sub-strut.
    const left = [...bot].reverse().find((n) => n.x < mx - 1e-6)
    const right = bot.find((n) => n.x > mx + 1e-6)
    if (!left || !right) continue
    const sub = addNode(b, mx, 0)
    const chord = b.members.find(
      (m) =>
        (m.a === left.id && m.b === right.id) || (m.a === right.id && m.b === left.id),
    )
    if (chord) {
      b.members = b.members.filter((m) => m.id !== chord.id)
      addMember(b, left.id, sub)
      addMember(b, sub, right.id)
    }
    // The vertical sub-strut on its own leaves `sub` and `dm` free to sway as a
    // two-bar mechanism, so a sub-diagonal to the diagonal's upper end closes
    // the triangle. This is what makes a real Baltimore truss determinate.
    addMember(b, sub, dm)
    const upper = na.y > nb.y ? na.id : nb.id
    addMember(b, sub, upper)
  }
  return b
}

// ---------------------------------------------------------------------------

export interface PresetConfig {
  span: number
  clearance: number
  gridStep: number
  height: number
  panels: number
  material: MaterialId
}

export const DEFAULT_CONFIG: PresetConfig = {
  span: 24,
  clearance: 6,
  gridStep: 0.5,
  height: 4,
  panels: 6,
  material: 'steel',
}

export function buildPreset(
  id: PresetId,
  cfg: PresetConfig = DEFAULT_CONFIG,
): BridgeDesign {
  const o: PresetOptions = {
    span: cfg.span,
    height: cfg.height,
    panels: cfg.panels,
    material: cfg.material,
  }

  let b: Builder
  switch (id) {
    case 'warren':
      b = buildWarren(o)
      break
    case 'pratt':
      b = buildNTruss(o, true)
      break
    case 'howe':
      b = buildNTruss(o, false)
      break
    case 'ktruss':
      b = buildKTruss(o)
      break
    case 'baltimore':
      b = buildBaltimore(o)
      break
    case 'blank':
    default: {
      b = mkBuilder(cfg.material)
      addNode(b, 0, 0, 'pin')
      addNode(b, cfg.span, 0, 'roller')
      break
    }
  }

  return {
    nodes: b.nodes,
    members: b.members,
    span: cfg.span,
    clearance: cfg.clearance,
    gridStep: cfg.gridStep,
  }
}
