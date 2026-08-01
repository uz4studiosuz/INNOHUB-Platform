// Shared canvas scale for the component artwork.
//
// Every part graphic comes from the Fritzing parts library, whose SVGs are
// dimensionally accurate: a 5mm LED really is 0.2in wide and an Arduino Uno
// really is 2.95in long. Pushing all of them through one pixels-per-inch
// constant is what keeps their sizes true to each other on the canvas, the way
// they are in Tinkercad — a resistor next to a breadboard looks like a
// resistor next to a breadboard.

/** Canvas pixels per real-world inch. */
export const PX_PER_INCH = 144;

/**
 * Tie-point pitch: 0.1in, the spacing every through-hole part and every
 * breadboard hole shares. It is the grid a dragged part snaps onto.
 */
export const PITCH = PX_PER_INCH / 10;

/**
 * Fritzing authored its SVGs at either 72 or 100 units per inch depending on
 * the part's age, so each one needs its own converter into canvas pixels.
 */
export function svgScale(unitsPerInch: number): (v: number) => number {
  const k = PX_PER_INCH / unitsPerInch;
  return (v) => v * k;
}
