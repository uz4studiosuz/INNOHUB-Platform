let counter = 0

/** Short, stable, monotonically increasing ids — enough for a single session. */
export function uid(prefix: string): string {
  counter += 1
  return `${prefix}${counter}`
}

/** Human-facing member/node numbering ("Member #12") is index-based, see labelOf. */
export function labelOf(index: number): string {
  return `#${index + 1}`
}
