/**
 * Canvas colours.
 *
 * Konva paints to a bitmap and cannot read CSS custom properties, so the M3
 * role values from `globals.css` are mirrored here. Keep the two in step —
 * these are the same tokens, not a second palette.
 */

export const CANVAS = {
  /* 60% — the field the drawing sits on */
  surface: '#fafcff',
  surfaceLowest: '#ffffff',

  /* 30% — grid and chrome */
  gridMinor: '#e6e9f0',
  gridMajor: '#c9cfda',
  rulerBg: '#f4f6fb',
  rulerLine: '#c3c7cf',

  /* 10% — accents and data */
  primary: '#0061a4',
  tertiary: '#006a58',
  onSurface: '#1a1c1e',
  onSurfaceVariant: '#43474e',
  outline: '#73777f',

  /* semantic */
  tension: '#0b57d0',
  compression: '#c5221f',
  neutral: '#73777f',
  error: '#ba1a1a',

  /* the valley below the deck */
  water: '#d7e7f5',
  waterLine: '#8fb6d4',

  /* label plates */
  labelBg: '#ffffff',
} as const
