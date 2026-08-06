/** Presentation-layer unit conversions. Everything upstream stays in SI. */

export const kN = (newtons: number) => newtons / 1000
export const mm = (metres: number) => metres * 1000
export const MPa = (pascals: number) => pascals / 1e6

export function fmt(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(digits)
}

export function money(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

export function mass(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${Math.round(kg)} kg`
}

/** Formats force in kN together with its equivalent weight in Tons or kg. */
export function fmtkNWithMass(newtons: number): string {
  if (!Number.isFinite(newtons)) return '—'
  const kn = newtons / 1000
  const kg = Math.abs(newtons) / 9.80665
  const massStr = kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`
  return `${kn.toFixed(1)} kN (~${massStr})`
}

export function percent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

export function determinacyLabel(d: number): string {
  if (d < 0) return `Mechanism (${d})`
  if (d === 0) return 'Determinate'
  return `Indeterminate (+${d})`
}
