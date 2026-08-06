import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'

/**
 * Material 3 component primitives.
 *
 * Only the handful of M3 components this app actually needs, built on the
 * tokens in `app/globals.css`. Everything references colour *roles* (primary,
 * surface-container, on-surface-variant …) rather than raw tones, so the
 * 60/30/10 balance is enforced by which role a component picks:
 *
 *   surface / surface-container-low ....... 60%  panel bodies, canvas
 *   surface-container-high / -highest ..... 30%  cards, fields, controls
 *   primary / tertiary .................... 10%  active state, CTAs, key data
 */

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  filled: 'bg-primary text-on-primary px-6',
  tonal: 'bg-secondary-container text-on-secondary-container px-6',
  outlined: 'border border-outline text-primary px-6',
  text: 'text-primary px-3',
  danger: 'bg-error-container text-on-error-container px-6',
}

export function Button({
  children,
  onClick,
  variant = 'tonal',
  icon,
  disabled,
  title,
  full,
  className = '',
}: {
  children?: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  icon?: IconName
  disabled?: boolean
  title?: string
  full?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`state-layer type-label-l inline-flex h-10 items-center justify-center gap-2 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-38 ${
        BUTTON_VARIANTS[variant]
      } ${full ? 'w-full' : ''} ${className}`}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

/** M3 icon button. `selected` gives it the tonal "toggled on" treatment. */
export function IconButton({
  icon,
  onClick,
  title,
  selected,
  disabled,
  size = 20,
  className = '',
}: {
  icon: IconName
  onClick?: () => void
  title: string
  selected?: boolean
  disabled?: boolean
  size?: number
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`state-layer inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-38 ${
        selected
          ? 'bg-secondary-container text-on-secondary-container'
          : 'text-on-surface-variant'
      } ${className}`}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

/**
 * Navigation-drawer style item, used for the tool palette. Active tools get the
 * secondary-container pill that M3 uses for selected destinations.
 */
export function NavItem({
  icon,
  label,
  selected,
  onClick,
  title,
}: {
  icon: IconName
  label: string
  selected?: boolean
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`state-layer type-label-l flex h-11 w-full items-center gap-3 rounded-full px-4 text-left transition-colors ${
        selected
          ? 'bg-secondary-container text-on-secondary-container'
          : 'text-on-surface-variant'
      }`}
    >
      <Icon name={icon} size={20} />
      <span className="truncate">{label}</span>
    </button>
  )
}

/** M3 segmented button group — used for the 2D / 3D / Split view switch. */
export function SegmentedButtons<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; icon?: IconName }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex h-9 overflow-hidden rounded-full border border-outline">
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`state-layer type-label-l inline-flex items-center gap-1.5 px-3 transition-colors ${
              i > 0 ? 'border-l border-outline' : ''
            } ${
              active
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant'
            }`}
          >
            {o.icon && <Icon name={o.icon} size={16} />}
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Containment
// ---------------------------------------------------------------------------

/** M3 card. `filled` is the 30% tier; `outlined` stays on the 60% tier. */
export function Card({
  children,
  variant = 'filled',
  className = '',
}: {
  children: ReactNode
  variant?: 'filled' | 'outlined' | 'elevated'
  className?: string
}) {
  const styles = {
    filled: 'bg-surface-container-high',
    outlined: 'border border-outline-variant bg-surface-container-low',
    elevated: 'bg-surface-container-low elevation-1',
  }[variant]
  return <div className={`rounded-md p-3 ${styles} ${className}`}>{children}</div>
}

/** A titled block inside a side panel. */
export function Section({
  title,
  icon,
  children,
  action,
}: {
  title: string
  icon?: IconName
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="border-b border-outline-variant px-3 py-3">
      <header className="mb-2 flex h-6 items-center gap-2">
        {icon && <Icon name={icon} size={16} className="text-on-surface-variant" />}
        <h3 className="type-label-m flex-1 uppercase text-on-surface-variant">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  )
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-outline-variant ${className}`} />
}

/**
 * Collapsible panel section.
 *
 * The panels used to show every control at once, which is a lot to take in for
 * a 15-year-old opening the app for the first time. Only the sections needed to
 * get going are open by default; the rest stay one tap away.
 */
export function Accordion({
  title,
  icon,
  children,
  open,
  onToggle,
  badge,
}: {
  title: string
  icon?: IconName
  children: ReactNode
  open: boolean
  onToggle: () => void
  badge?: ReactNode
}) {
  return (
    <section className="border-b border-outline-variant">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="state-layer flex w-full items-center gap-2 px-3 py-3 text-left"
      >
        {icon && <Icon name={icon} size={18} className="text-on-surface-variant" />}
        <span className="type-title-s flex-1 text-on-surface">{title}</span>
        {badge}
        <Icon
          name="expandMore"
          size={20}
          className={`text-on-surface-variant transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="px-3 pb-4">{children}</div>}
    </section>
  )
}

/** Big headline figure for the "at a glance" row at the top of a panel. */
export function KeyStat({
  icon,
  value,
  label,
  tone = 'default',
  hint,
}: {
  icon: IconName
  value: string
  label: string
  tone?: Tone
  hint?: string
}) {
  return (
    <div
      title={hint}
      className="flex flex-col gap-0.5 rounded-md bg-surface-container p-2.5"
    >
      <Icon name={icon} size={16} className="text-on-surface-variant" />
      <span className={`font-mono text-[15px] font-medium tabular-nums ${TONES[tone]}`}>
        {value}
      </span>
      <span className="type-label-s text-on-surface-variant">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data display
// ---------------------------------------------------------------------------

type Tone = 'default' | 'safe' | 'caution' | 'danger' | 'primary'

const TONES: Record<Tone, string> = {
  default: 'text-on-surface',
  safe: 'text-safe',
  caution: 'text-caution',
  danger: 'text-error',
  primary: 'text-primary',
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: Tone
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]" title={hint}>
      <span className="type-body-s text-on-surface-variant">{label}</span>
      <span className={`font-mono text-[13px] font-medium tabular-nums ${TONES[tone]}`}>
        {value}
      </span>
    </div>
  )
}

/** Label/value pair for the diagnostics dialog. */
export function Field({
  label,
  value,
  tone = 'default',
  mono = true,
}: {
  label: string
  value: ReactNode
  tone?: Tone
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="type-label-s uppercase text-on-surface-variant">{label}</div>
      <div
        className={`truncate ${mono ? 'font-mono tabular-nums' : ''} text-[14px] font-medium ${TONES[tone]}`}
      >
        {value}
      </div>
    </div>
  )
}

export function LinearProgress({ value, tone = 'primary' }: { value: number; tone?: Tone }) {
  const bg = {
    primary: 'bg-primary',
    safe: 'bg-safe',
    caution: 'bg-caution',
    danger: 'bg-error',
    default: 'bg-on-surface',
  }[tone]
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${bg}`}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  )
}

/** M3 assist/suggestion chip. */
export function Chip({
  label,
  icon,
  tone = 'default',
}: {
  label: string
  icon?: IconName
  tone?: Tone
}) {
  const styles = {
    default: 'border-outline text-on-surface-variant',
    safe: 'border-safe/50 text-safe',
    caution: 'border-caution/50 text-caution',
    danger: 'border-error/50 text-error',
    primary: 'border-primary/50 text-primary',
  }[tone]
  return (
    <span
      className={`type-label-s inline-flex h-6 items-center gap-1 rounded-sm border px-2 ${styles}`}
    >
      {icon && <Icon name={icon} size={14} />}
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5"
      title={hint}
    >
      <span className="type-body-m text-on-surface">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-13 shrink-0 rounded-full border-2 transition-colors ${
          checked
            ? 'border-primary bg-primary'
            : 'border-outline bg-surface-container-highest'
        }`}
        style={{ width: 52 }}
      >
        <span
          className={`absolute top-1/2 block -translate-y-1/2 rounded-full transition-all ${
            checked ? 'bg-on-primary' : 'bg-outline'
          }`}
          style={{
            width: checked ? 24 : 16,
            height: checked ? 24 : 16,
            left: checked ? 24 : 6,
          }}
        />
      </button>
    </div>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="type-body-s text-on-surface-variant">{label}</span>
        <span className="font-mono text-[13px] tabular-nums text-on-surface">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
    </div>
  )
}

/** M3 outlined select. */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <label className="block py-1.5">
      {label && (
        <span className="type-body-s mb-1 block text-on-surface-variant">{label}</span>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="type-body-m w-full appearance-none rounded-xs border border-outline bg-surface-container px-3 py-2 pr-9 text-on-surface outline-none transition-colors focus:border-primary"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-container">
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="expandMore"
          size={18}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
      </div>
    </label>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5">
      <span
        onClick={(e) => {
          e.preventDefault()
          onChange(!checked)
        }}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-xs border-2 transition-colors ${
          checked ? 'border-primary bg-primary' : 'border-on-surface-variant'
        }`}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9.3 16.2 4.8 11.7l1.4-1.4 3.1 3.1 8.5-8.5 1.4 1.4z"
              fill="var(--color-on-primary)"
            />
          </svg>
        )}
      </span>
      <span className="type-body-m text-on-surface">{label}</span>
    </label>
  )
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export function Dialog({
  open,
  onClose,
  children,
  labelledBy,
  width = 'min(40rem, 94vw)',
}: {
  open: boolean
  onClose?: () => void
  children: ReactNode
  labelledBy?: string
  width?: string
}) {
  if (!open) return null
  return (
    <div className="md3-scope absolute inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="scrim-enter absolute inset-0 bg-scrim/32 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ width }}
        className="dialog-enter elevation-3 relative flex max-h-full flex-col overflow-hidden rounded-xl bg-surface-container-high text-on-surface"
      >
        {children}
      </div>
    </div>
  )
}

export function DialogActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-outline-variant bg-surface-container-high px-6 py-4">
      {children}
    </div>
  )
}
