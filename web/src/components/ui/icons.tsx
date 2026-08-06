import type { SVGProps } from 'react'

/**
 * Icon set.
 *
 * Hand-authored SVG on the Material Symbols 24 dp grid — no emoji, no icon font,
 * no network request. Every glyph inherits `currentColor` so it picks up the M3
 * role colour of whatever it sits inside.
 *
 * Solid forms use `fill`, linework uses `stroke` at 2 dp with round caps, which
 * is what keeps a mixed set looking like one family.
 */

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** dp — M3 uses 18 / 20 / 24 / 40 */
  size?: number
}

export function Icon({ name, size = 20, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
}

const thin = { ...stroke, strokeWidth: 1.5 }

const PATHS = {
  // --- editor tools -------------------------------------------------------
  select: <path d="M5.5 2.8v16.4l4.1-3.9 2.6 5.5 2.7-1.3-2.6-5.4 5.7-.2z" fill="currentColor" />,

  node: (
    <>
      <circle cx="9" cy="15" r="3.4" fill="currentColor" />
      <path d="M16 4h2v3h3v2h-3v3h-2V9h-3V7h3z" fill="currentColor" />
    </>
  ),

  member: (
    <>
      <path d="M7.4 16.6 16.6 7.4" {...stroke} />
      <circle cx="5.5" cy="18.5" r="2.6" fill="currentColor" />
      <circle cx="18.5" cy="5.5" r="2.6" fill="currentColor" />
    </>
  ),

  delete: (
    <path
      d="M7 21a2 2 0 0 1-2-2V6H4V4h5V3h6v1h5v2h-1v13a2 2 0 0 1-2 2zM9 17h2V8H9zm4 0h2V8h-2z"
      fill="currentColor"
    />
  ),

  brush: (
    <>
      <path
        d="M20.7 3.3a1.1 1.1 0 0 0-1.6 0L9.6 12.9l2 2 9.6-9.6a1.1 1.1 0 0 0 0-1.6z"
        fill="currentColor"
      />
      <path
        d="M7.7 14.9c-1.4 0-2.5 1.1-2.5 2.5 0 1.1-.9 1.7-2 1.7 .9 1.3 2.4 2 3.8 2 2.1 0 3.7-1.6 3.7-3.6 0-1.5-1.4-2.6-3-2.6z"
        fill="currentColor"
      />
    </>
  ),

  support: (
    <>
      <path d="M12 4 20 17H4z" fill="currentColor" />
      <path d="M3 20h18" {...stroke} />
    </>
  ),

  undo: (
    <path
      d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62A7.45 7.45 0 0 1 12.5 10.5c3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
      fill="currentColor"
    />
  ),

  redo: (
    <path
      d="M18.4 10.6A10.4 10.4 0 0 0 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16a7.98 7.98 0 0 1 7.6-5.5c1.95 0 3.73.72 5.12 1.88L13 16h9V7z"
      fill="currentColor"
    />
  ),

  // --- layout / chrome ----------------------------------------------------
  panelLeft: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" {...stroke} />
      <path d="M9.5 4v16" {...stroke} />
    </>
  ),

  panelRight: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" {...stroke} />
      <path d="M14.5 4v16" {...stroke} />
    </>
  ),

  view2d: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" {...stroke} />
      <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" {...thin} />
    </>
  ),

  view3d: (
    <>
      <path d="M12 2.6 20.5 7v10L12 21.4 3.5 17V7z" {...stroke} />
      <path d="m3.8 7.2 8.2 4.6 8.2-4.6M12 11.8v9.4" {...thin} />
    </>
  ),

  viewSplit: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" {...stroke} />
      <path d="M12 4v16" {...stroke} />
    </>
  ),

  close: (
    <path
      d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"
      fill="currentColor"
    />
  ),

  arrowBack: (
    <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z" fill="currentColor" />
  ),

  expandMore: <path d="M7.4 9.4 12 14l4.6-4.6L18 10.8 12 16.8 6 10.8z" fill="currentColor" />,

  // --- media / test transport --------------------------------------------
  play: <path d="M8 5v14l11-7z" fill="currentColor" />,

  pause: <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />,

  restart: (
    <path
      d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"
      fill="currentColor"
    />
  ),

  volumeOn: (
    <>
      <path d="M4 9v6h3.5L13 20V4L7.5 9z" fill="currentColor" />
      <path d="M16.5 8.8a4.5 4.5 0 0 1 0 6.4M19.3 6a8.5 8.5 0 0 1 0 12" {...stroke} />
    </>
  ),

  volumeOff: (
    <>
      <path d="M4 9v6h3.5L13 20V4L7.5 9z" fill="currentColor" />
      <path d="m16.5 9.5 5 5M21.5 9.5l-5 5" {...stroke} />
    </>
  ),

  // --- status -------------------------------------------------------------
  error: (
    <path
      d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-1 4h2v7h-2zm0 9h2v2h-2z"
      fill="currentColor"
    />
  ),

  checkCircle: (
    <path
      d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-1.4 13.2L6.4 12l1.4-1.4 2.8 2.8 5.6-5.6L17.6 9.2z"
      fill="currentColor"
    />
  ),

  warning: (
    <path d="M12 3 22.5 20.5h-21zm-1 6.5v5h2v-5zm0 6.5v2h2v-2z" fill="currentColor" />
  ),

  info: (
    <path
      d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-1 4h2v2h-2zm0 4h2v6h-2z"
      fill="currentColor"
    />
  ),

  // --- domain -------------------------------------------------------------
  truck: (
    <>
      <path d="M3 6.5h11V16H3zM14 9.5h3.6L21 13v3h-7z" {...stroke} />
      <circle cx="7" cy="18" r="1.9" fill="currentColor" />
      <circle cx="17.5" cy="18" r="1.9" fill="currentColor" />
    </>
  ),

  wind: (
    <>
      <path d="M3 8h9.5A2.75 2.75 0 1 0 9.8 4.7" {...stroke} />
      <path d="M3 12.5h12.5a2.75 2.75 0 1 1-2.7 3.3" {...stroke} />
      <path d="M3 17h5.5" {...stroke} />
    </>
  ),

  bolt: <path d="M13.5 2 4 14h6l-1.5 8L19 10h-6.5z" fill="currentColor" />,

  layers: (
    <>
      <path d="M12 2.8 2.5 8.4 12 14l9.5-5.6z" {...stroke} />
      <path d="m2.5 13.6 9.5 5.6 9.5-5.6" {...stroke} />
    </>
  ),

  ruler: (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="1.5" {...stroke} />
      <path d="M7 8v3.2M11 8v4.4M15 8v3.2M19 8v4.4" {...thin} />
    </>
  ),

  weight: (
    <path
      d="M12 3a3 3 0 0 0-2.8 2H6.2L3 20.5h18L17.8 5h-3A3 3 0 0 0 12 3zm0 2.2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
      fill="currentColor"
    />
  ),

  cost: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" {...stroke} />
      <path d="M2.5 10h19" {...stroke} />
    </>
  ),

  analytics: (
    <path
      d="M4 19.5h16.5v2H3.5V3h2zM8 17.5V9.5h2.5v8zm4.5 0V5h2.5v12.5zm4.5 0v-6h2.5v6z"
      fill="currentColor"
    />
  ),

  deflection: (
    <>
      <path d="M3 6h18" {...stroke} />
      <path d="M3 12c4.5 6 13.5 6 18 0" {...stroke} />
      <path d="M12 7.5v6.5m0 0-2-2m2 2 2-2" {...thin} />
    </>
  ),

  visibility: (
    <path
      d="M12 5C6.6 5 2.8 9.5 1.5 12c1.3 2.5 5.1 7 10.5 7s9.2-4.5 10.5-7C21.2 9.5 17.4 5 12 5zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"
      fill="currentColor"
    />
  ),

  camera: (
    <path
      d="M16.5 10.2V7.5a1.5 1.5 0 0 0-1.5-1.5H4.5A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18H15a1.5 1.5 0 0 0 1.5-1.5v-2.7L21 18V6z"
      fill="currentColor"
    />
  ),

  description: (
    <>
      <path d="M13.5 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V8z" {...stroke} />
      <path d="M13.5 2.5V8H19M8.5 13h7M8.5 17h5" {...thin} />
    </>
  ),

  download: <path d="M11 3h2v8.2h3.5L12 17l-4.5-5.8H11zM4 19h16v2H4z" fill="currentColor" />,

  tune: (
    <>
      <path d="M3 8h9M17.5 8H21M3 16h3.5M12 16h9" {...stroke} />
      <circle cx="14.5" cy="8" r="2.5" {...stroke} />
      <circle cx="9" cy="16" r="2.5" {...stroke} />
    </>
  ),

  science: (
    <>
      <path d="M9.5 3v6.6L4.6 18a1.8 1.8 0 0 0 1.6 2.8h11.6a1.8 1.8 0 0 0 1.6-2.8l-4.9-8.4V3" {...stroke} />
      <path d="M8.5 3h7" {...stroke} />
    </>
  ),

  add: <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor" />,

  remove: <path d="M5 11h14v2H5z" fill="currentColor" />,

  fitScreen: (
    <path
      d="M3 9V3h6v2H5v4zm12-6h6v6h-2V5h-4zM3 15h2v4h4v2H3zm16 0h2v6h-6v-2h4z"
      fill="currentColor"
    />
  ),

  help: (
    <>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M9.7 9.4a2.35 2.35 0 1 1 3.2 2.2c-.65.28-.95.8-.95 1.5v.5" {...stroke} />
      <circle cx="12" cy="16.8" r="1.15" fill="currentColor" />
    </>
  ),

  language: (
    <>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M3.2 9h17.6M3.2 15h17.6" {...thin} />
      <path d="M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3z" {...thin} />
    </>
  ),

  target: (
    <>
      <circle cx="12" cy="12" r="7.5" {...stroke} />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" {...stroke} />
    </>
  ),

  anchor: (
    <>
      <path d="M12 7v13" {...stroke} />
      <circle cx="12" cy="4.5" r="2.2" {...stroke} />
      <path d="M4.5 13a7.5 7.5 0 0 0 15 0" {...stroke} />
    </>
  ),
} as const
