/**
 * Direct Stiffness Method for 2-D pin-jointed trusses.
 *
 * The global stiffness matrix only depends on geometry and section properties,
 * so it is assembled and factorised ONCE per design (`factorise`) and then
 * re-used for every load step of the moving-load analysis (`solveWith`).
 * That is what keeps a 60-step vehicle crossing well under the 50 ms budget.
 *
 * Sign convention: member axial force is POSITIVE in tension.
 */

import type { FailureMode } from '../types'
import { GRAVITY } from '../data/materials'
import {
  DECK_EDGE_HEIGHT,
  DECK_MASS_PER_M,
  SUPPORT_NONE,
  SUPPORT_PIN,
  SUPPORT_ROLLER,
  type SolverModel,
} from './model'

// ---------------------------------------------------------------------------
// Geometry cache
// ---------------------------------------------------------------------------

export interface Geometry {
  /** member length, m */
  length: Float64Array
  /** direction cosines */
  cx: Float64Array
  cy: Float64Array
  /** axial stiffness EA/L, N/m */
  ka: Float64Array
  /** Euler critical load, N (positive) */
  pcr: Float64Array
}

export function geometryOf(model: SolverModel): Geometry {
  const m = model.memberCount
  const length = new Float64Array(m)
  const cx = new Float64Array(m)
  const cy = new Float64Array(m)
  const ka = new Float64Array(m)
  const pcr = new Float64Array(m)

  for (let i = 0; i < m; i++) {
    const a = model.ma[i]
    const b = model.mb[i]
    const dx = model.nx[b] - model.nx[a]
    const dy = model.ny[b] - model.ny[a]
    const L = Math.hypot(dx, dy) || 1e-9
    length[i] = L
    cx[i] = dx / L
    cy[i] = dy / L
    ka[i] = (model.E[i] * model.area[i]) / L
    // Euler: P_cr = pi^2 E I / (K L)^2 with K = 1.0 for pin-ended members.
    pcr[i] = (Math.PI ** 2 * model.E[i] * model.inertia[i]) / (L * L)
  }
  return { length, cx, cy, ka, pcr }
}

// ---------------------------------------------------------------------------
// Factorisation
// ---------------------------------------------------------------------------

export interface Factorisation {
  ok: boolean
  /** Global dof index (2*node+comp) that went singular, or -1 */
  badDof: number
  /** map from global dof -> reduced dof, -1 when restrained */
  dofMap: Int32Array
  ndof: number
  /** LDL^T factors packed into one dense lower-triangular matrix */
  L: Float64Array
  D: Float64Array
  geometry: Geometry
  determinacy: number
}

/** Assemble K, apply supports, and factorise with LDL^T. */
export function factorise(model: SolverModel): Factorisation {
  const geometry = geometryOf(model)
  const n = model.nodeCount

  // --- degrees of freedom -------------------------------------------------
  const dofMap = new Int32Array(2 * n).fill(-1)
  let ndof = 0
  let restraintCount = 0
  for (let i = 0; i < n; i++) {
    const s = model.support[i]
    // pin: both directions held. roller: y held, x free.
    const fixX = s === SUPPORT_PIN
    const fixY = s === SUPPORT_PIN || s === SUPPORT_ROLLER
    if (fixX) restraintCount++
    else dofMap[2 * i] = ndof++
    if (fixY) restraintCount++
    else dofMap[2 * i + 1] = ndof++
  }

  const determinacy = model.memberCount + restraintCount - 2 * n

  const L = new Float64Array(ndof * ndof)
  const D = new Float64Array(ndof)

  // --- assemble -----------------------------------------------------------
  // Local 4x4 truss stiffness rotated to global coordinates:
  //   k = EA/L * [ c^2  cs  -c^2 -cs ; cs  s^2 -cs -s^2 ; ... ]
  const dof = new Int32Array(4)
  for (let e = 0; e < model.memberCount; e++) {
    const a = model.ma[e]
    const b = model.mb[e]
    const c = geometry.cx[e]
    const s = geometry.cy[e]
    const k = geometry.ka[e]

    dof[0] = dofMap[2 * a]
    dof[1] = dofMap[2 * a + 1]
    dof[2] = dofMap[2 * b]
    dof[3] = dofMap[2 * b + 1]

    const cc = c * c * k
    const ss = s * s * k
    const cs = c * s * k
    // Sub-block for node a (+) / node b (+), cross terms negative.
    const block = [
      [cc, cs, -cc, -cs],
      [cs, ss, -cs, -ss],
      [-cc, -cs, cc, cs],
      [-cs, -ss, cs, ss],
    ]

    for (let i = 0; i < 4; i++) {
      const gi = dof[i]
      if (gi < 0) continue
      for (let j = 0; j < 4; j++) {
        const gj = dof[j]
        if (gj < 0) continue
        L[gi * ndof + gj] += block[i][j]
      }
    }
  }

  // --- LDL^T factorisation -------------------------------------------------
  // A singular (or near-singular) pivot means the structure is a mechanism at
  // that degree of freedom — exactly the diagnostic we want to show the user.
  let maxDiag = 0
  for (let i = 0; i < ndof; i++) maxDiag = Math.max(maxDiag, Math.abs(L[i * ndof + i]))
  const tol = Math.max(maxDiag, 1) * 1e-12

  let ok = ndof > 0
  let badDof = -1

  for (let j = 0; j < ndof && ok; j++) {
    let d = L[j * ndof + j]
    for (let k = 0; k < j; k++) {
      const ljk = L[j * ndof + k]
      d -= ljk * ljk * D[k]
    }
    if (!(Math.abs(d) > tol)) {
      ok = false
      // Map the reduced dof back to a global dof for the error message.
      badDof = dofMap.findIndex((v) => v === j)
      break
    }
    D[j] = d
    for (let i = j + 1; i < ndof; i++) {
      let sum = L[i * ndof + j]
      for (let k = 0; k < j; k++) sum -= L[i * ndof + k] * D[k] * L[j * ndof + k]
      L[i * ndof + j] = sum / d
    }
  }

  if (ndof === 0) {
    // Fully restrained (or empty) — trivially "solvable", zero displacement.
    ok = model.nodeCount > 0
  }

  return { ok, badDof, dofMap, ndof, L, D, geometry, determinacy }
}

/** Forward/back substitution against a pre-factorised matrix. */
function substitute(f: Factorisation, rhs: Float64Array): Float64Array {
  const { L, D, ndof } = f
  const y = new Float64Array(ndof)
  for (let i = 0; i < ndof; i++) {
    let sum = rhs[i]
    for (let k = 0; k < i; k++) sum -= L[i * ndof + k] * y[k]
    y[i] = sum
  }
  for (let i = 0; i < ndof; i++) y[i] /= D[i]
  for (let i = ndof - 1; i >= 0; i--) {
    let sum = y[i]
    for (let k = i + 1; k < ndof; k++) sum -= L[k * ndof + i] * y[k]
    y[i] = sum
  }
  return y
}

// ---------------------------------------------------------------------------
// Load assembly
// ---------------------------------------------------------------------------

export interface PointLoad {
  node: number
  fx: number
  fy: number
}

export interface LoadCase {
  /** Load factor on member self weight + deck slab weight (e.g. 1.2). */
  deadFactor: number
  /** Load factor applied to the vehicle axle loads (e.g. 1.6). */
  liveFactor: number
  /** Vehicle nose position along the span, m. Use NaN for "no vehicle". */
  vehicleX: number
  /** Axle offsets behind the nose (m) and their unfactored loads (N). */
  axleOffsets: Float64Array
  axleLoads: Float64Array
  /** Wind speed in m/s; 0 disables wind. */
  windSpeed: number
  windFactor: number
  extra?: PointLoad[]
}

const AIR_DENSITY = 1.225
/** Drag coefficient for a bluff structural section. */
const DRAG_C = 1.4

/** Build the global force vector (length 2*nodeCount) for a load case. */
export function assembleLoads(model: SolverModel, lc: LoadCase): Float64Array {
  const F = new Float64Array(2 * model.nodeCount)

  // --- dead load: member self weight, lumped half to each end ------------
  for (let e = 0; e < model.memberCount; e++) {
    const a = model.ma[e]
    const b = model.mb[e]
    const len = Math.hypot(model.nx[b] - model.nx[a], model.ny[b] - model.ny[a])
    const w = model.density[e] * model.area[e] * len * GRAVITY * lc.deadFactor
    F[2 * a + 1] -= w / 2
    F[2 * b + 1] -= w / 2
  }

  // --- dead load: deck slab, distributed onto the deck members -----------
  for (const e of model.deckMembers) {
    const a = model.ma[e]
    const b = model.mb[e]
    const len = Math.abs(model.nx[b] - model.nx[a])
    const w = DECK_MASS_PER_M * len * GRAVITY * lc.deadFactor
    F[2 * a + 1] -= w / 2
    F[2 * b + 1] -= w / 2
  }

  // --- live load: vehicle axles, lever-ruled onto the deck ---------------
  if (Number.isFinite(lc.vehicleX) && lc.axleLoads.length > 0) {
    for (let i = 0; i < lc.axleLoads.length; i++) {
      const x = lc.vehicleX - lc.axleOffsets[i]
      applyDeckPointLoad(model, F, x, -lc.axleLoads[i] * lc.liveFactor)
    }
  }

  // --- wind: horizontal pressure on projected member + deck area ---------
  if (lc.windSpeed > 0) {
    const q = 0.5 * AIR_DENSITY * lc.windSpeed * lc.windSpeed * DRAG_C * lc.windFactor
    for (let e = 0; e < model.memberCount; e++) {
      const a = model.ma[e]
      const b = model.mb[e]
      const len = Math.hypot(model.nx[b] - model.nx[a], model.ny[b] - model.ny[a])
      const force = q * len * model.depth[e]
      F[2 * a] += force / 2
      F[2 * b] += force / 2
    }
    for (const e of model.deckMembers) {
      const a = model.ma[e]
      const b = model.mb[e]
      const len = Math.abs(model.nx[b] - model.nx[a])
      const force = q * len * DECK_EDGE_HEIGHT
      F[2 * a] += force / 2
      F[2 * b] += force / 2
    }
  }

  if (lc.extra) {
    for (const p of lc.extra) {
      F[2 * p.node] += p.fx
      F[2 * p.node + 1] += p.fy
    }
  }

  return F
}

/**
 * Place a vertical point load at deck coordinate `x` by distributing it to the
 * two ends of the deck member that contains it (statically exact lever rule).
 * Loads outside the deck are ignored — the vehicle is off the bridge.
 */
function applyDeckPointLoad(
  model: SolverModel,
  F: Float64Array,
  x: number,
  fy: number,
) {
  for (const e of model.deckMembers) {
    const a = model.ma[e]
    const b = model.mb[e]
    const xa = model.nx[a]
    const xb = model.nx[b]
    const lo = Math.min(xa, xb)
    const hi = Math.max(xa, xb)
    if (x < lo - 1e-9 || x > hi + 1e-9) continue
    const t = (x - lo) / (hi - lo || 1)
    const loNode = xa <= xb ? a : b
    const hiNode = xa <= xb ? b : a
    F[2 * loNode + 1] += fy * (1 - t)
    F[2 * hiNode + 1] += fy * t
    return
  }
}

// ---------------------------------------------------------------------------
// Solving
// ---------------------------------------------------------------------------

export interface StepSolution {
  /** 2*nodeCount displacements, m */
  displacements: Float64Array
  /** memberCount axial forces, N (+tension) */
  forces: Float64Array
  /** memberCount utilisation ratios, |stress| / allowable */
  ratios: Float64Array
  /** per-member failure mode at this step */
  modes: Uint8Array
  maxRatio: number
  maxRatioIndex: number
  maxDisplacement: number
  maxDisplacementNode: number
  /** support reactions, 2*nodeCount (zero at free dofs) */
  reactions: Float64Array
}

export const MODE_NONE = 0
export const MODE_YIELD_T = 1
export const MODE_YIELD_C = 2
export const MODE_BUCKLE = 3

export const MODE_NAMES: Record<number, FailureMode> = {
  [MODE_NONE]: 'none',
  [MODE_YIELD_T]: 'yield-tension',
  [MODE_YIELD_C]: 'yield-compression',
  [MODE_BUCKLE]: 'buckling',
}

export function solveWith(
  model: SolverModel,
  f: Factorisation,
  F: Float64Array,
): StepSolution {
  const n = model.nodeCount
  const m = model.memberCount
  const displacements = new Float64Array(2 * n)

  if (f.ok && f.ndof > 0) {
    const rhs = new Float64Array(f.ndof)
    for (let i = 0; i < 2 * n; i++) {
      const d = f.dofMap[i]
      if (d >= 0) rhs[d] = F[i]
    }
    const u = substitute(f, rhs)
    for (let i = 0; i < 2 * n; i++) {
      const d = f.dofMap[i]
      if (d >= 0) displacements[i] = u[d]
    }
  }

  const forces = new Float64Array(m)
  const ratios = new Float64Array(m)
  const modes = new Uint8Array(m)
  const reactions = new Float64Array(2 * n)

  let maxRatio = 0
  let maxRatioIndex = -1

  for (let e = 0; e < m; e++) {
    const a = model.ma[e]
    const b = model.mb[e]
    const c = f.geometry.cx[e]
    const s = f.geometry.cy[e]
    // Axial elongation projected onto the member axis.
    const du = displacements[2 * b] - displacements[2 * a]
    const dv = displacements[2 * b + 1] - displacements[2 * a + 1]
    const N = f.geometry.ka[e] * (c * du + s * dv)
    forces[e] = N

    const stress = N / model.area[e]
    let allowable: number
    let mode = MODE_NONE
    if (N >= 0) {
      allowable = model.fyT[e]
      if (stress >= allowable) mode = MODE_YIELD_T
    } else {
      // Compression is limited by the lesser of squash load and Euler buckling.
      const bucklingStress = f.geometry.pcr[e] / model.area[e]
      if (bucklingStress < model.fyC[e]) {
        allowable = bucklingStress
        if (-stress >= allowable) mode = MODE_BUCKLE
      } else {
        allowable = model.fyC[e]
        if (-stress >= allowable) mode = MODE_YIELD_C
      }
    }
    const ratio = Math.abs(stress) / Math.max(allowable, 1)
    ratios[e] = ratio
    modes[e] = mode
    if (ratio > maxRatio) {
      maxRatio = ratio
      maxRatioIndex = e
    }

    // Accumulate the member forces acting ON each end node. A member in
    // tension pulls each of its ends towards the other end, so node `a` is
    // pulled along +(c, s) and node `b` along -(c, s).
    reactions[2 * a] += N * c
    reactions[2 * a + 1] += N * s
    reactions[2 * b] -= N * c
    reactions[2 * b + 1] -= N * s
  }

  // Joint equilibrium is  internal + applied + reaction = 0,
  // so R = -(internal) - applied, evaluated only at the restrained dofs.
  for (let i = 0; i < 2 * n; i++) {
    if (f.dofMap[i] >= 0) reactions[i] = 0
    else reactions[i] = -reactions[i] - F[i]
  }

  let maxDisplacement = 0
  let maxDisplacementNode = -1
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(displacements[2 * i], displacements[2 * i + 1])
    if (d > maxDisplacement) {
      maxDisplacement = d
      maxDisplacementNode = i
    }
  }

  return {
    displacements,
    forces,
    ratios,
    modes,
    maxRatio,
    maxRatioIndex,
    maxDisplacement,
    maxDisplacementNode,
    reactions,
  }
}

/** Convenience wrapper: factorise + solve a single load case. */
export function solveOnce(model: SolverModel, lc: LoadCase) {
  const f = factorise(model)
  const F = assembleLoads(model, lc)
  return { factorisation: f, solution: solveWith(model, f, F), forces: F }
}

/** Describe why a factorisation failed, in the user's language. */
export function instabilityMessage(model: SolverModel, f: Factorisation): string {
  if (model.nodeCount === 0) return 'Add supports to begin'
  if (model.memberCount === 0) return 'Unstable — no members yet'
  if (f.badDof >= 0) {
    const node = Math.floor(f.badDof / 2)
    const dir = f.badDof % 2 === 0 ? 'horizontally' : 'vertically'
    return `Unstable — joint ${node + 1} can move freely ${dir}. Add members.`
  }
  return 'Unstable — add members to triangulate the structure'
}

export { SUPPORT_NONE, SUPPORT_PIN, SUPPORT_ROLLER }
