/**
 * Turns a raw test response into the engineering report shown after a test.
 *
 * The goal is that a student can answer "why did it break, and what do I change"
 * without opening anything else: which member, what kind of failure, how much it
 * was over, what else was close behind it, and what the supports were carrying
 * at that instant.
 */

import type { BridgeDesign, MaterialId } from '../types'
import type { ModelSummary, TestResponse, TestStepData } from './protocol'
import { MATERIALS, getSection } from '../data/materials'
import type { TFunction, TranslationKey } from '../i18n'

/** Mirrors MODE_NONE in solver.ts — duplicated so the solver stays out of the
 *  main bundle (it is only ever imported by the worker). */
const MODE_NONE = 0

/** Where a member sits in the truss — used to name it in plain language. */
export type MemberRole =
  | 'bottom chord'
  | 'top chord'
  | 'vertical'
  | 'diagonal'
  | 'end post'

export interface MemberDiagnostic {
  index: number
  label: string
  role: MemberRole
  materialId: MaterialId
  materialName: string
  sectionName: string
  /** m */
  length: number
  /** N, +tension */
  force: number
  /** |stress| / allowable */
  ratio: number
  /** Pa, signed */
  stress: number
  /** N — the axial force this member could take before failing */
  capacity: number
  /** N — Euler critical load */
  pcr: number
  /** slenderness L / r, dimensionless */
  slenderness: number
  /** what limits it: yield or buckling */
  governedBy: 'tension yield' | 'compression yield' | 'buckling'
  from: { label: string; x: number; y: number }
  to: { label: string; x: number; y: number }
}

export interface ReactionDiagnostic {
  nodeLabel: string
  x: number
  support: 'pin' | 'roller'
  fx: number
  fy: number
  magnitude: number
}

export interface TestDiagnostics {
  passed: boolean
  /** One-line verdict, e.g. "Diagonal member #12 buckled under compression" */
  headline: string
  /** A sentence or two of explanation the student can act on */
  explanation: string
  /** What to try next */
  advice: string[]
  /** The member that actually failed, when one did */
  failed: MemberDiagnostic | null
  /** Most utilised members at the governing position, worst first */
  ranked: MemberDiagnostic[]
  loadCase: {
    combination: string
    vehicleName: string
    liveLoadN: number
    windSpeedKmh: number
    /** m — where the vehicle nose was at the governing position */
    vehicleX: number
    step: number
    totalSteps: number
    onBridge: boolean
  }
  deflection: {
    peak: number
    limit: number
    nodeLabel: string
    x: number
    y: number
    /** span / peak, the familiar "L/xxx" serviceability figure */
    spanRatio: number
  }
  reactions: ReactionDiagnostic[]
}

/** Where a member sits in the truss. Exported so the collapse chain can name
 *  each lost member the same way the diagnostics table does. */
export function roleOfMember(
  design: BridgeDesign,
  index: number,
  deckY: number,
): MemberRole {
  const m = design.members[index]
  const a = design.nodes.find((n) => n.id === m.a)
  const b = design.nodes.find((n) => n.id === m.b)
  if (!a || !b) return 'diagonal'

  const level = 1e-6
  const horizontal = Math.abs(a.y - b.y) < level
  const vertical = Math.abs(a.x - b.x) < level

  if (horizontal) return Math.abs(a.y - deckY) < level ? 'bottom chord' : 'top chord'
  if (vertical) return 'vertical'
  // A diagonal landing on a support is the end post.
  if (a.support !== 'none' || b.support !== 'none') return 'end post'
  return 'diagonal'
}

function describeMember(
  design: BridgeDesign,
  summary: ModelSummary,
  step: TestStepData,
  index: number,
): MemberDiagnostic | null {
  const member = design.members[index]
  if (!member) return null

  const a = design.nodes.find((n) => n.id === member.a)
  const b = design.nodes.find((n) => n.id === member.b)
  if (!a || !b) return null

  const section = getSection(member.sectionId)
  const material = MATERIALS[member.materialId]
  const length = summary.lengths[index] ?? 0
  const pcr = summary.pcr[index] ?? 0
  const force = step.forces[index] ?? 0
  const stress = force / section.area

  // Radius of gyration about the weak axis — the axis Euler actually uses.
  const inertia = Math.min(section.Ix, section.Iy)
  const radiusOfGyration = Math.sqrt(inertia / section.area)
  const slenderness = radiusOfGyration > 0 ? length / radiusOfGyration : 0

  let capacity: number
  let governedBy: MemberDiagnostic['governedBy']
  if (force >= 0) {
    capacity = material.fyTension * section.area
    governedBy = 'tension yield'
  } else {
    const squash = material.fyCompression * section.area
    if (pcr < squash) {
      capacity = pcr
      governedBy = 'buckling'
    } else {
      capacity = squash
      governedBy = 'compression yield'
    }
  }

  const nodeLabel = (id: string) => `J${design.nodes.findIndex((n) => n.id === id) + 1}`

  return {
    index,
    label: `#${index + 1}`,
    role: roleOfMember(design, index, summary.deckY),
    materialId: member.materialId,
    materialName: material.name,
    sectionName: section.name,
    length,
    force,
    ratio: step.ratios[index] ?? 0,
    stress,
    capacity,
    pcr,
    slenderness,
    governedBy,
    from: { label: nodeLabel(a.id), x: a.x, y: a.y },
    to: { label: nodeLabel(b.id), x: b.x, y: b.y },
  }
}

const MODE_VERB: Record<number, TranslationKey> = {
  1: 'failure.yieldTension',
  2: 'failure.yieldCompression',
  3: 'failure.buckling',
}

export const ROLE_KEY: Record<MemberRole, TranslationKey> = {
  'bottom chord': 'role.bottomChord',
  'top chord': 'role.topChord',
  vertical: 'role.vertical',
  diagonal: 'role.diagonal',
  'end post': 'role.endPost',
}

export const GOVERNED_KEY: Record<MemberDiagnostic['governedBy'], TranslationKey> = {
  'tension yield': 'failure.tensionYield',
  'compression yield': 'failure.compressionYield',
  buckling: 'failure.bucklingShort',
}

/** Capitalise the first letter of a translated role for use in a headline. */
function capitalise(text: string) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1)
}

function adviceFor(
  failed: MemberDiagnostic | null,
  passed: boolean,
  deflectionGoverned: boolean,
  t: TFunction,
): string[] {
  if (passed) {
    return [t('diag.adviceLighter'), t('diag.adviceEfficiency')]
  }
  if (deflectionGoverned) {
    return [t('diag.adviceDeeper'), t('diag.adviceMoreMembers')]
  }
  if (!failed) {
    return [t('diag.adviceSupports')]
  }
  if (failed.governedBy === 'buckling') {
    return [
      t('diag.adviceBucklingWhy', {
        pcr: (failed.pcr / 1000).toFixed(1),
        yield: (MATERIALS[failed.materialId].fyCompression / 1e6).toFixed(0),
      }),
      t('diag.adviceBucklingSection'),
      t('diag.adviceBucklingShorten'),
    ]
  }
  if (failed.governedBy === 'tension yield') {
    return [t('diag.adviceTensionArea'), t('diag.adviceTensionMaterial')]
  }
  return [t('diag.adviceCompression')]
}

export function buildDiagnostics(
  res: TestResponse,
  design: BridgeDesign,
  vehicleName: string,
  windSpeedKmh: number,
  t: TFunction,
): TestDiagnostics | null {
  if (res.steps.length === 0) return null

  // The governing position: where it broke, or the worst moment of the crossing.
  const stepIndex =
    res.failureStep >= 0
      ? res.failureStep
      : res.criticalStep >= 0
        ? res.criticalStep
        : res.steps.length - 1
  const step = res.steps[stepIndex]
  if (!step) return null

  const summary = res.summary

  // The worker reports MODE_NONE for deflection and support failures, and still
  // fills in failureMemberIndex with whatever was most utilised at the time.
  // Only treat it as a *member* failure when a real failure mode came back,
  // otherwise the headline would blame a member that was never overstressed.
  const memberFailed = res.failureMode !== MODE_NONE && res.failureMemberIndex >= 0
  const failed = memberFailed
    ? describeMember(design, summary, step, res.failureMemberIndex)
    : null

  // Rank every member by utilisation at that position.
  const ranked = design.members
    .map((_, i) => describeMember(design, summary, step, i))
    .filter((m): m is MemberDiagnostic => m !== null)
    .sort((a, b) => b.ratio - a.ratio)

  const deflectionGoverned =
    !res.passed && !memberFailed && res.peakDeflection > res.deflectionLimit

  // --- verdict ------------------------------------------------------------
  let headline: string
  let explanation: string

  if (res.passed) {
    headline = t('diag.passHeadline')
    const worst = ranked[0]
    explanation = worst
      ? t('diag.passExplanation', {
          role: t(ROLE_KEY[worst.role]),
          label: worst.label,
          pct: (worst.ratio * 100).toFixed(0),
          cap: (worst.capacity / 1000).toFixed(0),
          defl: (res.peakDeflection * 1000).toFixed(1),
          ratio: Math.round(design.span / Math.max(res.peakDeflection, 1e-9)),
        })
      : t('diag.passHeadline')
  } else if (failed) {
    headline = t('diag.headline', {
      role: capitalise(t(ROLE_KEY[failed.role])),
      label: failed.label,
      verb: t(MODE_VERB[res.failureMode] ?? 'failure.generic'),
    })
    explanation =
      failed.governedBy === 'buckling'
        ? t('diag.explBuckling', {
            force: Math.abs(failed.force / 1000).toFixed(1),
            pcr: (failed.pcr / 1000).toFixed(1),
            pct: (failed.ratio * 100).toFixed(0),
            len: failed.length.toFixed(2),
            slender: failed.slenderness.toFixed(0),
          })
        : t('diag.explYield', {
            pct: (failed.ratio * 100).toFixed(0),
            cap: (failed.capacity / 1000).toFixed(1),
            force: Math.abs(failed.force / 1000).toFixed(1),
            stress: Math.abs(failed.stress / 1e6).toFixed(0),
            allow: (MATERIALS[failed.materialId].fyTension / 1e6).toFixed(0),
          })
  } else if (deflectionGoverned) {
    headline = t('failure.serviceability')
    explanation = res.failureReason
  } else {
    headline = t('failure.structureFailed')
    explanation = res.failureReason
  }

  // --- reactions ----------------------------------------------------------
  const reactions: ReactionDiagnostic[] = design.nodes
    .map((node, i) => {
      if (node.support === 'none') return null
      const fx = step.reactions[2 * i] ?? 0
      const fy = step.reactions[2 * i + 1] ?? 0
      return {
        nodeLabel: `J${i + 1}`,
        x: node.x,
        support: node.support,
        fx,
        fy,
        magnitude: Math.hypot(fx, fy),
      }
    })
    .filter((r): r is ReactionDiagnostic => r !== null)

  const peakNodeIndex = res.peakDeflectionNode
  const peakNode = design.nodes[peakNodeIndex]

  return {
    passed: res.passed,
    headline,
    explanation,
    advice: adviceFor(failed, res.passed, deflectionGoverned, t),
    failed,
    ranked: ranked.slice(0, 6),
    loadCase: {
      combination:
        windSpeedKmh > 0
          ? '1.2 Dead + 1.0 Live + 1.0 Wind'
          : '1.2 Dead + 1.6 Live',
      vehicleName,
      liveLoadN: res.liveLoadN,
      windSpeedKmh,
      vehicleX: step.vehicleX,
      step: stepIndex + 1,
      totalSteps: res.steps.length,
      onBridge: step.vehicleX >= 0 && step.vehicleX <= design.span,
    },
    deflection: {
      peak: res.peakDeflection,
      limit: res.deflectionLimit,
      nodeLabel: peakNode ? `J${peakNodeIndex + 1}` : '—',
      x: peakNode?.x ?? 0,
      y: peakNode?.y ?? 0,
      spanRatio:
        res.peakDeflection > 1e-9 ? design.span / res.peakDeflection : Infinity,
    },
    reactions,
  }
}
