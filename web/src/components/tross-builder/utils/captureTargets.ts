/**
 * Handles to the two live canvases, for the PDF export.
 *
 * These live outside the component modules on purpose: exporting a mutable
 * binding from a file that also exports a component breaks React Fast Refresh
 * ("export is incompatible"), forcing a full reload on every edit.
 */

import type Konva from 'konva'

export const captureTargets: {
  /** The react-three-fiber WebGL canvas (needs preserveDrawingBuffer). */
  scene3d: HTMLCanvasElement | null
  /** The Konva stage backing the 2D editor. */
  stage2d: Konva.Stage | null
} = {
  scene3d: null,
  stage2d: null,
}
