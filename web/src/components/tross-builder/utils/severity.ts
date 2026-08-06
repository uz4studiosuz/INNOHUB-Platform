/**
 * Utilisation severity bands.
 *
 * A bare "83%" means little to a 15-year-old. Naming the band — safe, normal,
 * warning, critical, failed — turns the number into a judgement they can act
 * on, and gives every part of the UI (2D labels, 3D marker, tables, report)
 * one shared vocabulary and one shared colour.
 */

import type { TFunction, TranslationKey } from '../i18n'

export type SeverityId = 'safe' | 'normal' | 'warning' | 'critical' | 'failed'

export interface Severity {
  id: SeverityId
  /** i18n key for the band's name */
  key: TranslationKey
  /** hex, matching the stress ramp */
  color: string
  /** Tailwind text class */
  text: string
  /** Tailwind background + foreground for a chip */
  chip: string
}

const BANDS: { max: number; severity: Severity }[] = [
  {
    max: 0.5,
    severity: {
      id: 'safe',
      key: 'severity.safe',
      color: '#22c55e',
      text: 'text-safe',
      chip: 'bg-safe/20 text-safe',
    },
  },
  {
    max: 0.75,
    severity: {
      id: 'normal',
      key: 'severity.normal',
      color: '#84cc16',
      text: 'text-[#a3e635]',
      chip: 'bg-[#84cc16]/20 text-[#a3e635]',
    },
  },
  {
    max: 0.9,
    severity: {
      id: 'warning',
      key: 'severity.warning',
      color: '#eab308',
      text: 'text-caution',
      chip: 'bg-caution/20 text-caution',
    },
  },
  {
    max: 1,
    severity: {
      id: 'critical',
      key: 'severity.critical',
      color: '#f97316',
      text: 'text-warn',
      chip: 'bg-warn/25 text-warn',
    },
  },
]

const FAILED: Severity = {
  id: 'failed',
  key: 'severity.failed',
  color: '#dc2626',
  text: 'text-error',
  chip: 'bg-error text-on-error',
}

/** Band for a utilisation ratio (1.0 = at capacity). */
export function severityOf(ratio: number): Severity {
  for (const band of BANDS) {
    if (ratio < band.max) return band.severity
  }
  return FAILED
}

export function severityLabel(ratio: number, t: TFunction): string {
  return t(severityOf(ratio).key)
}

/** All bands, for legends. */
export const SEVERITY_BANDS: { severity: Severity; from: number; to: number }[] = [
  { severity: BANDS[0].severity, from: 0, to: 0.5 },
  { severity: BANDS[1].severity, from: 0.5, to: 0.75 },
  { severity: BANDS[2].severity, from: 0.75, to: 0.9 },
  { severity: BANDS[3].severity, from: 0.9, to: 1 },
  { severity: FAILED, from: 1, to: Infinity },
]
