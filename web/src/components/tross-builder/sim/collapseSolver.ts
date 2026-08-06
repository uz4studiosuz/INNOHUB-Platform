/**
 * Progressive collapse solver.
 *
 * The previous version turned every piece into an independent free-falling
 * rigid body the instant a member failed, which read as an explosion rather
 * than a collapse. Real structures come down very differently: the joints stay
 * connected, the frame hinges and sags around whatever is still standing, load
 * sheds onto neighbouring members, and *those* snap in turn — the failure walks
 * through the structure.
 *
 * So this is a position-based dynamics (Verlet + distance constraints) solver
 * over the joint network itself:
 *
 *   - every joint becomes a particle, duplicated into the two truss planes
 *   - every member becomes a distance constraint between two particles
 *   - abutment joints are pinned, so the bridge tears away from its supports
 *   - a constraint that is stretched past its break strain is removed, which
 *     dumps its load onto its neighbours and propagates the failure
 *
 * Because the 3D parts are already defined as "follow these two joint anchors",
 * the deck, kerb lines, handrails and floor beams all come along for the ride
 * automatically — the deck stays bolted to the chord as it folds.
 */

import * as THREE from 'three'
import type { BridgeDesign } from '../types'

const GRAVITY = -9.81
/** Verlet velocity damping per second — air drag plus joint friction. */
const DAMPING = 0.55
/** Constraint relaxation passes. More = stiffer structure, linearly costlier. */
const ITERATIONS = 6
/** Ground restitution and friction once a particle lands. */
const BOUNCE = 0.25
const FRICTION = 0.68

/** How close falling debris must come to an intact member to destroy it, m. */
const IMPACT_RADIUS = 1.1
/** Minimum downward step and total step length before a piece does damage. */
const IMPACT_MIN_FALL = 0.02
const IMPACT_MIN_SPEED = 0.03
/** Impact checks run on their own slower clock than the constraint solver. */
const IMPACT_INTERVAL = 0.05

/** Why a member was lost — shown verbatim in the failure report. */
export type CollapseCause = 'trigger' | 'overload' | 'impact'

export interface CollapseConstraint {
  a: number
  b: number
  rest: number
  /** 0..1 — how rigidly the constraint is enforced each pass */
  stiffness: number
  /** strain at which the connection tears */
  breakStrain: number
  broken: boolean
  /** index into design.members, or -1 for lateral bracing */
  memberIndex: number
}

export class CollapseSolver {
  readonly nodeCount: number
  readonly halfWidth: number
  /** 3 floats per particle; particle = node * 2 + plane */
  readonly pos: Float32Array
  private readonly prev: Float32Array
  private readonly pinned: Uint8Array
  readonly constraints: CollapseConstraint[] = []
  private readonly groundY: number
  /** Members that have snapped since the last frame, for sound and effects. */
  readonly justBroken: number[] = []

  /**
   * Every member lost, in the order it went, with why. This is what lets the
   * report show the whole chain of failure instead of only the first break.
   */
  readonly log: { memberIndex: number; time: number; cause: CollapseCause }[] = []

  /** seconds since the collapse began */
  private elapsed = 0
  /** throttle for the debris-impact broad phase */
  private impactClock = 0
  /**
   * When each member lets go, in seconds after the initial break.
   * `Infinity` means it survives — plenty of members stay attached and hang
   * off the wreck, which is what real collapses look like.
   */
  private releaseTime: Float64Array | null = null
  /** joints shared between members, for the failure-propagation search */
  private readonly memberJoints: [number, number][] = []

  constructor(
    design: BridgeDesign,
    halfWidth: number,
    groundY: number,
    /** current (displaced) node positions, 2 per node */
    displacement: Float64Array,
    displacementScale: number,
  ) {
    this.nodeCount = design.nodes.length
    this.halfWidth = halfWidth
    this.groundY = groundY

    const n = this.nodeCount * 2
    this.pos = new Float32Array(n * 3)
    this.prev = new Float32Array(n * 3)
    this.pinned = new Uint8Array(n)

    // --- seed particles from the deformed shape ---------------------------
    design.nodes.forEach((node, i) => {
      const dx = (displacement[2 * i] ?? 0) * displacementScale
      const dy = (displacement[2 * i + 1] ?? 0) * displacementScale
      for (let plane = 0; plane < 2; plane++) {
        const p = (i * 2 + plane) * 3
        this.pos[p] = node.x + dx
        this.pos[p + 1] = node.y + dy
        this.pos[p + 2] = plane === 0 ? -halfWidth : halfWidth
        this.prev[p] = this.pos[p]
        this.prev[p + 1] = this.pos[p + 1]
        this.prev[p + 2] = this.pos[p + 2]
        // Abutments and piers are founded on rock: they do not move.
        if (node.support !== 'none') this.pinned[i * 2 + plane] = 1
      }
    })

    const index = new Map(design.nodes.map((node, i) => [node.id, i]))

    // --- member constraints, one per truss plane --------------------------
    design.members.forEach((member, mi) => {
      const a = index.get(member.a)
      const b = index.get(member.b)
      if (a === undefined || b === undefined) return
      this.memberJoints[mi] = [a, b]
      for (let plane = 0; plane < 2; plane++) {
        this.addConstraint(a * 2 + plane, b * 2 + plane, 0.9, 0.055, mi)
      }
    })

    // --- lateral bracing that holds the two trusses apart -----------------
    // Without these the frame collapses into a single plane and looks like a
    // flat cutout falling over.
    for (let i = 0; i < this.nodeCount; i++) {
      this.addConstraint(i * 2, i * 2 + 1, 0.75, 0.09, -1)
    }

    // Cross-bracing along the deck keeps it from shearing into a parallelogram.
    const deckY = Math.min(
      ...design.nodes.filter((nd) => nd.support !== 'none').map((nd) => nd.y),
    )
    design.members.forEach((member) => {
      const a = index.get(member.a)
      const b = index.get(member.b)
      if (a === undefined || b === undefined) return
      const na = design.nodes[a]
      const nb = design.nodes[b]
      const onDeck =
        Math.abs(na.y - deckY) < 1e-6 && Math.abs(nb.y - deckY) < 1e-6 && na.x !== nb.x
      if (!onDeck) return
      this.addConstraint(a * 2, b * 2 + 1, 0.5, 0.11, -1)
      this.addConstraint(a * 2 + 1, b * 2, 0.5, 0.11, -1)
    })
  }

  private addConstraint(
    a: number,
    b: number,
    stiffness: number,
    breakStrain: number,
    memberIndex: number,
  ) {
    const rest = this.distance(a, b)
    if (rest < 1e-6) return
    this.constraints.push({ a, b, rest, stiffness, breakStrain, broken: false, memberIndex })
  }

  private distance(a: number, b: number) {
    const pa = a * 3
    const pb = b * 3
    return Math.hypot(
      this.pos[pb] - this.pos[pa],
      this.pos[pb + 1] - this.pos[pa + 1],
      this.pos[pb + 2] - this.pos[pa + 2],
    )
  }

  /** Sever a member — this is what starts the collapse. */
  breakMember(memberIndex: number, cause: CollapseCause = 'trigger') {
    let tore = false
    for (const c of this.constraints) {
      if (c.memberIndex === memberIndex && !c.broken) {
        c.broken = true
        tore = true
      }
    }
    if (!tore) return false
    this.log.push({ memberIndex, time: this.elapsed, cause })
    if (!this.justBroken.includes(memberIndex)) this.justBroken.push(memberIndex)
    return true
  }

  /**
   * Debris raining onto whatever is still standing.
   *
   * Without this the lower half of a bridge could survive the entire upper half
   * landing on it, which is the opposite of what happens in reality — the deck
   * and lower chords are exactly what gets crushed. Any piece that has fully
   * detached and is moving fast enough carries enough energy to take out an
   * intact member it lands on.
   */
  private applyImpacts() {
    // A particle is debris once nothing intact still holds it.
    const held = new Uint8Array(this.pinned.length)
    for (const c of this.constraints) {
      if (c.broken) continue
      held[c.a] = 1
      held[c.b] = 1
    }

    for (let i = 0; i < this.pinned.length; i++) {
      if (held[i] || this.pinned[i]) continue
      const p = i * 3
      // Verlet velocity, per step. Only fast, descending debris does damage.
      const vy = this.pos[p + 1] - this.prev[p + 1]
      const speed = Math.hypot(
        this.pos[p] - this.prev[p],
        vy,
        this.pos[p + 2] - this.prev[p + 2],
      )
      if (vy > -IMPACT_MIN_FALL || speed < IMPACT_MIN_SPEED) continue

      for (const c of this.constraints) {
        if (c.broken || c.memberIndex < 0) continue
        const a = c.a * 3
        const b = c.b * 3
        // Midpoint is a good enough proxy at these member lengths.
        const mx = (this.pos[a] + this.pos[b]) / 2
        const my = (this.pos[a + 1] + this.pos[b + 1]) / 2
        const mz = (this.pos[a + 2] + this.pos[b + 2]) / 2
        // Only things *below* the falling piece get hit.
        if (my > this.pos[p + 1]) continue
        const dist = Math.hypot(this.pos[p] - mx, this.pos[p + 1] - my, this.pos[p + 2] - mz)
        if (dist > IMPACT_RADIUS) continue

        this.breakMember(c.memberIndex, 'impact')
        break // one hit per piece per pass
      }
    }
  }

  /**
   * Schedule the progressive failure that follows the first break.
   *
   * Pure geometry is not enough here: a truss that loses a member becomes a
   * mechanism and *folds*, and folding does not stretch anything, so a
   * strain-only criterion produces a bridge that sags and then politely stops.
   * Real structures shed the failed member's load onto its neighbours, and the
   * ones already closest to capacity go next.
   *
   * So the release order is driven by the analysis the user just watched:
   * how many joints away a member is from the break, and how utilised it
   * already was. Members that were barely working survive and hang off the
   * wreckage.
   *
   * @param ratios per-member utilisation at the moment of failure
   */
  seedFailure(originMember: number, ratios: Float64Array) {
    const memberCount = this.memberJoints.length
    this.releaseTime = new Float64Array(memberCount).fill(Infinity)
    if (originMember < 0 || !this.memberJoints[originMember]) return

    // --- breadth-first hop count from the failed member -------------------
    const jointToMembers = new Map<number, number[]>()
    this.memberJoints.forEach((joints, mi) => {
      if (!joints) return
      for (const j of joints) {
        const list = jointToMembers.get(j)
        if (list) list.push(mi)
        else jointToMembers.set(j, [mi])
      }
    })

    const hops = new Int32Array(memberCount).fill(-1)
    hops[originMember] = 0
    let frontier = [originMember]
    while (frontier.length > 0) {
      const next: number[] = []
      for (const mi of frontier) {
        const joints = this.memberJoints[mi]
        if (!joints) continue
        for (const j of joints) {
          for (const neighbour of jointToMembers.get(j) ?? []) {
            if (hops[neighbour] !== -1) continue
            hops[neighbour] = hops[mi] + 1
            next.push(neighbour)
          }
        }
      }
      frontier = next
    }

    // --- turn hop count + utilisation into a release time -----------------
    let seed = 1337
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    this.releaseTime[originMember] = 0
    for (let mi = 0; mi < memberCount; mi++) {
      if (mi === originMember) continue
      const hop = hops[mi]
      if (hop < 0) continue // not connected to the failure at all

      const utilisation = Math.min(1, ratios[mi] ?? 0)
      // A member at capacity goes almost as soon as the wave reaches it; one
      // at half capacity takes far longer, and a slack one never gives way.
      if (utilisation < 0.35 && hop > 2) continue

      const spread = 0.28 * Math.pow(hop, 0.75)
      const resistance = (1.25 - utilisation) * 1.4
      this.releaseTime[mi] = spread * resistance + rand() * 0.25
    }
  }

  /**
   * Release the supports on one side. Used when the deck itself has failed:
   * a bridge that loses its deck usually drops off its bearings too.
   */
  unpinAll() {
    this.pinned.fill(0)
  }

  step(dt: number) {
    this.justBroken.length = 0
    this.elapsed += dt

    // --- scheduled progressive failure ------------------------------------
    if (this.releaseTime) {
      for (let mi = 0; mi < this.releaseTime.length; mi++) {
        const at = this.releaseTime[mi]
        if (!Number.isFinite(at) || at > this.elapsed) continue
        this.releaseTime[mi] = Infinity // fire once
        this.breakMember(mi, 'overload')
      }
    }

    const damping = Math.max(0, 1 - DAMPING * dt)
    const g = GRAVITY * dt * dt

    // --- Verlet integration ------------------------------------------------
    for (let i = 0; i < this.pinned.length; i++) {
      if (this.pinned[i]) continue
      const p = i * 3
      for (let axis = 0; axis < 3; axis++) {
        const current = this.pos[p + axis]
        const velocity = (current - this.prev[p + axis]) * damping
        this.prev[p + axis] = current
        this.pos[p + axis] = current + velocity + (axis === 1 ? g : 0)
      }
    }

    // --- constraint relaxation --------------------------------------------
    for (let iter = 0; iter < ITERATIONS; iter++) {
      for (const c of this.constraints) {
        if (c.broken) continue
        const pa = c.a * 3
        const pb = c.b * 3
        const dx = this.pos[pb] - this.pos[pa]
        const dy = this.pos[pb + 1] - this.pos[pa + 1]
        const dz = this.pos[pb + 2] - this.pos[pa + 2]
        const len = Math.hypot(dx, dy, dz)
        if (len < 1e-9) continue

        const strain = (len - c.rest) / c.rest
        // Only check for tearing on the final pass, once the frame has settled
        // into this timestep's shape.
        if (iter === ITERATIONS - 1 && Math.abs(strain) > c.breakStrain) {
          c.broken = true
          if (c.memberIndex >= 0 && !this.justBroken.includes(c.memberIndex)) {
            this.justBroken.push(c.memberIndex)
            this.log.push({
              memberIndex: c.memberIndex,
              time: this.elapsed,
              cause: 'overload',
            })
          }
          continue
        }

        const pinA = this.pinned[c.a]
        const pinB = this.pinned[c.b]
        if (pinA && pinB) continue

        // Split the correction according to which ends are free to move.
        const correction = ((len - c.rest) / len) * c.stiffness
        const shareA = pinA ? 0 : pinB ? 1 : 0.5
        const shareB = pinB ? 0 : pinA ? 1 : 0.5

        this.pos[pa] += dx * correction * shareA
        this.pos[pa + 1] += dy * correction * shareA
        this.pos[pa + 2] += dz * correction * shareA
        this.pos[pb] -= dx * correction * shareB
        this.pos[pb + 1] -= dy * correction * shareB
        this.pos[pb + 2] -= dz * correction * shareB
      }
    }

    // --- ground / water contact -------------------------------------------
    for (let i = 0; i < this.pinned.length; i++) {
      if (this.pinned[i]) continue
      const p = i * 3
      if (this.pos[p + 1] >= this.groundY) continue

      this.pos[p + 1] = this.groundY
      // Reflect the vertical component and scrub off horizontal speed.
      const vy = this.pos[p + 1] - this.prev[p + 1]
      this.prev[p + 1] = this.pos[p + 1] + vy * BOUNCE
      this.prev[p] = this.pos[p] - (this.pos[p] - this.prev[p]) * FRICTION
      this.prev[p + 2] = this.pos[p + 2] - (this.pos[p + 2] - this.prev[p + 2]) * FRICTION
    }

    // --- debris landing on what is still standing --------------------------
    // Runs on a slower clock than the constraint solver; it is a broad-phase
    // proximity test and does not need sub-step resolution.
    this.impactClock += dt
    if (this.impactClock >= IMPACT_INTERVAL) {
      this.impactClock = 0
      this.applyImpacts()
    }
  }

  /** True once a member's connection has gone in both planes. */
  isMemberBroken(memberIndex: number) {
    let seen = false
    for (const c of this.constraints) {
      if (c.memberIndex !== memberIndex) continue
      seen = true
      if (!c.broken) return false
    }
    return seen
  }

  /**
   * World position of an anchor: a joint at some offset across the deck.
   * `z` is interpolated between the two truss planes, so the deck centreline
   * (z = 0) sits exactly between them and follows both.
   */
  anchor(node: number, z: number, out: THREE.Vector3) {
    const t = THREE.MathUtils.clamp((z + this.halfWidth) / (2 * this.halfWidth), 0, 1)
    const a = (node * 2) * 3
    const b = (node * 2 + 1) * 3
    out.set(
      this.pos[a] + (this.pos[b] - this.pos[a]) * t,
      this.pos[a + 1] + (this.pos[b + 1] - this.pos[a + 1]) * t,
      this.pos[a + 2] + (this.pos[b + 2] - this.pos[a + 2]) * t,
    )
    return out
  }

  /** Transverse (across-deck) direction at a joint, for the local up vector. */
  transverse(node: number, out: THREE.Vector3) {
    const a = (node * 2) * 3
    const b = (node * 2 + 1) * 3
    out.set(
      this.pos[b] - this.pos[a],
      this.pos[b + 1] - this.pos[a + 1],
      this.pos[b + 2] - this.pos[a + 2],
    )
    const len = out.length()
    if (len < 1e-6) out.set(0, 0, 1)
    else out.divideScalar(len)
    return out
  }
}
