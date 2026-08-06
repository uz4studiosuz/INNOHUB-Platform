/**
 * Material and cross-section library.
 *
 * Section properties (A, Ix, Iy) are *computed* from the real geometry rather
 * than hard-coded, so the analysis stays internally consistent if a profile is
 * tweaked. Formulas are the standard ones for each shape family.
 */

import type { CrossSection, Material, MaterialId, SectionShape } from '../types'

const GPa = 1e9
const MPa = 1e6

export const MATERIALS: Record<MaterialId, Material> = {
  steel: {
    id: 'steel',
    name: 'Steel',
    density: 7850,
    E: 200 * GPa,
    fyTension: 250 * MPa,
    fyCompression: 250 * MPa,
    costPerKg: 2.0,
    color: '#5b6673',
    metalness: 0.65,
    roughness: 0.25,
    bonus: 1.0,
  },
  wood: {
    id: 'wood',
    name: 'Timber',
    density: 600,
    E: 12 * GPa,
    fyTension: 30 * MPa,
    fyCompression: 20 * MPa,
    costPerKg: 1.5,
    color: '#d97706',
    metalness: 0.0,
    roughness: 0.85,
    bonus: 1.2,
  },
  composite: {
    id: 'composite',
    name: 'Composite',
    density: 1800,
    E: 50 * GPa,
    fyTension: 150 * MPa,
    fyCompression: 150 * MPa,
    costPerKg: 5.0,
    color: '#0f172a',
    metalness: 0.35,
    roughness: 0.4,
    bonus: 0.9,
  },
}

export const MATERIAL_LIST = Object.values(MATERIALS)

// ---------------------------------------------------------------------------
// Section property maths
// ---------------------------------------------------------------------------

/** Solid rectangle b (width) x h (depth). */
function rectProps(b: number, h: number) {
  return { area: b * h, Ix: (b * h ** 3) / 12, Iy: (h * b ** 3) / 12 }
}

/** Hollow rectangle (box girder) with uniform wall t. */
function boxProps(b: number, h: number, t: number) {
  const bi = b - 2 * t
  const hi = h - 2 * t
  return {
    area: b * h - bi * hi,
    Ix: (b * h ** 3 - bi * hi ** 3) / 12,
    Iy: (h * b ** 3 - hi * bi ** 3) / 12,
  }
}

/** Circular hollow section, outer diameter d, wall t. */
function tubeProps(d: number, t: number) {
  const di = d - 2 * t
  const area = (Math.PI / 4) * (d ** 2 - di ** 2)
  const I = (Math.PI / 64) * (d ** 4 - di ** 4)
  return { area, Ix: I, Iy: I }
}

/**
 * Doubly-symmetric I-section.
 * h = overall depth, bf = flange width, tf = flange thickness, tw = web thickness.
 */
function iBeamProps(h: number, bf: number, tf: number, tw: number) {
  const hw = h - 2 * tf // clear web depth
  return {
    area: 2 * bf * tf + hw * tw,
    Ix: (bf * h ** 3 - (bf - tw) * hw ** 3) / 12,
    Iy: (2 * tf * bf ** 3 + hw * tw ** 3) / 12,
  }
}

/**
 * Equal-leg angle, leg length L and thickness t.
 * Properties are taken about the centroidal axis parallel to a leg
 * (a conservative stand-in for the true principal axes).
 */
function angleProps(L: number, t: number) {
  const area = t * (2 * L - t)
  // Centroid measured from the outside face of a leg.
  const yBar = (t * L * (L / 2) + (L - t) * t * (t / 2)) / area
  // Second moment of the two rectangles about that axis (parallel axis theorem).
  const legA = { A: t * L, y: L / 2, I: (t * L ** 3) / 12 }
  const legB = { A: (L - t) * t, y: t / 2, I: ((L - t) * t ** 3) / 12 }
  const I =
    legA.I + legA.A * (legA.y - yBar) ** 2 + legB.I + legB.A * (legB.y - yBar) ** 2
  // The weak principal axis of an angle is roughly 40% of this value.
  return { area, Ix: I, Iy: I * 0.4 }
}

interface SectionDef {
  id: string
  name: string
  materialId: MaterialId
  shape: SectionShape
  depth: number
  width: number
  thickness: number
  props: { area: number; Ix: number; Iy: number }
}

function def(
  id: string,
  name: string,
  materialId: MaterialId,
  shape: SectionShape,
  depth: number,
  width: number,
  thickness: number,
  props: { area: number; Ix: number; Iy: number },
): SectionDef {
  return { id, name, materialId, shape, depth, width, thickness, props }
}

const DEFS: SectionDef[] = [
  // --- Steel -------------------------------------------------------------
  def('steel-i100', 'I-Beam 100×55', 'steel', 'ibeam', 0.1, 0.055, 0.0057,
    iBeamProps(0.1, 0.055, 0.0057, 0.0041)),
  def('steel-i160', 'I-Beam 160×82', 'steel', 'ibeam', 0.16, 0.082, 0.0074,
    iBeamProps(0.16, 0.082, 0.0074, 0.005)),
  def('steel-i220', 'I-Beam 220×110', 'steel', 'ibeam', 0.22, 0.11, 0.0092,
    iBeamProps(0.22, 0.11, 0.0092, 0.0059)),
  def('steel-i300', 'I-Beam 300×150', 'steel', 'ibeam', 0.3, 0.15, 0.0107,
    iBeamProps(0.3, 0.15, 0.0107, 0.0071)),
  def('steel-chs60', 'Tube ⌀60×4', 'steel', 'tube', 0.06, 0.06, 0.004,
    tubeProps(0.06, 0.004)),
  def('steel-chs101', 'Tube ⌀101×5', 'steel', 'tube', 0.101, 0.101, 0.005,
    tubeProps(0.101, 0.005)),
  def('steel-l70', 'Angle L70×7', 'steel', 'angle', 0.07, 0.07, 0.007,
    angleProps(0.07, 0.007)),

  // --- Timber ------------------------------------------------------------
  def('wood-90', 'Timber 90×45', 'wood', 'rect', 0.09, 0.045, 0.045,
    rectProps(0.045, 0.09)),
  def('wood-140', 'Timber 140×70', 'wood', 'rect', 0.14, 0.07, 0.07,
    rectProps(0.07, 0.14)),
  def('wood-190', 'Timber 190×90', 'wood', 'rect', 0.19, 0.09, 0.09,
    rectProps(0.09, 0.19)),
  def('wood-240', 'Glulam 240×115', 'wood', 'rect', 0.24, 0.115, 0.115,
    rectProps(0.115, 0.24)),

  // --- Composite ---------------------------------------------------------
  def('comp-box100', 'Box 100×80×6', 'composite', 'box', 0.1, 0.08, 0.006,
    boxProps(0.08, 0.1, 0.006)),
  def('comp-box150', 'Box 150×100×8', 'composite', 'box', 0.15, 0.1, 0.008,
    boxProps(0.1, 0.15, 0.008)),
  def('comp-box200', 'Box 200×140×10', 'composite', 'box', 0.2, 0.14, 0.01,
    boxProps(0.14, 0.2, 0.01)),
  def('comp-box260', 'Box 260×180×12', 'composite', 'box', 0.26, 0.18, 0.012,
    boxProps(0.18, 0.26, 0.012)),
]

export const CROSS_SECTIONS: CrossSection[] = DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  materialId: d.materialId,
  shape: d.shape,
  area: d.props.area,
  Ix: d.props.Ix,
  Iy: d.props.Iy,
  depth: d.depth,
  width: d.width,
  thickness: d.thickness,
}))

const SECTION_MAP = new Map(CROSS_SECTIONS.map((s) => [s.id, s]))

export function getSection(id: string): CrossSection {
  return SECTION_MAP.get(id) ?? CROSS_SECTIONS[0]
}

export function sectionsFor(materialId: MaterialId): CrossSection[] {
  return CROSS_SECTIONS.filter((s) => s.materialId === materialId)
}

/**
 * The section picked when a member is repainted with a new material, and the
 * one every preset is built with.
 *
 * These are deliberately sized for the default 24 m span: slender members are
 * governed by Euler buckling long before they reach yield (an I-160 diagonal
 * buckles at only 67 kN), so starting a student on an undersized profile means
 * their first test fails before they have changed anything.
 */
const DEFAULT_SECTIONS: Record<MaterialId, string> = {
  steel: 'steel-i220',
  wood: 'wood-240',
  composite: 'comp-box200',
}

export function defaultSectionFor(materialId: MaterialId): string {
  return DEFAULT_SECTIONS[materialId] ?? sectionsFor(materialId)[0].id
}

export const GRAVITY = 9.80665
