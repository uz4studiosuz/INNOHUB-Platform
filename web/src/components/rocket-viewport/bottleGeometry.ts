import * as THREE from "three";

/**
 * The pressure vessel, built as a real PET bottle instead of a plain cylinder.
 *
 * A soda bottle is a lathed profile - straight body, a shoulder that tapers in,
 * a neck, and the thick moulded ring the launcher clamps - closed off at the
 * other end by a petaloid base: five hollow feet the blow-moulding leaves
 * behind, which is what lets the bottle hold several bar of pressure.
 *
 * ORIENTATION. A water rocket flies with the bottle UPSIDE DOWN: its mouth is
 * the nozzle, so the neck points at the ground and the petaloid base points at
 * the sky with the payload tube glued on top of it. Everything here is therefore
 * emitted in the rocket's own frame - y = 0 at the nozzle, y = height at the base
 * the nose section sits on - so callers never have to flip anything.
 *
 * All of it is generated in code, so there is no model file to ship and nothing
 * to load at runtime. Every dimension is a fraction of the bottle's own diameter
 * and length, so one profile fits a 20 oz and a 2 litre alike.
 */

/**
 * One point of the lathe profile, in *bottle* coordinates: radius and height as
 * fractions, with h = 0 at the base and h = 1 at the mouth. `toRocketFrame`
 * turns these into the flown orientation.
 */
type ProfilePoint = [r: number, h: number];

/**
 * Coke and Pepsi differ in where the shoulder starts and how hard it turns,
 * which is exactly why swapping them changes the drag. The neck finish is the
 * same standard on both.
 */
const PROFILES: Record<string, ProfilePoint[]> = {
  // Straight-walled body, fairly high shoulder.
  coke: [
    [0.00, 0.000],
    [0.62, 0.000],
    [0.86, 0.012],
    [0.97, 0.038],
    [1.00, 0.075],
    [1.00, 0.660],   // top of the straight body
    [0.99, 0.700],
    [0.92, 0.760],
    [0.78, 0.822],
    [0.60, 0.876],
    [0.42, 0.920],
    [0.30, 0.948],
    [0.25, 0.966],   // neck
    [0.25, 0.980],
    [0.29, 0.984],   // support ring the launcher grips
    [0.29, 0.991],
    [0.25, 0.993],
    [0.26, 1.000],   // thread finish
    [0.00, 1.000],
  ],
  // Pepsi's shoulder starts lower and sweeps longer, so it is a touch draggier.
  pepsi: [
    [0.00, 0.000],
    [0.60, 0.000],
    [0.85, 0.014],
    [0.97, 0.042],
    [1.00, 0.082],
    [1.00, 0.600],
    [0.99, 0.648],
    [0.94, 0.712],
    [0.83, 0.784],
    [0.66, 0.848],
    [0.46, 0.904],
    [0.32, 0.942],
    [0.25, 0.964],
    [0.25, 0.980],
    [0.29, 0.984],
    [0.29, 0.991],
    [0.25, 0.993],
    [0.26, 1.000],
    [0.00, 1.000],
  ],
};

function profileFor(bottleSize: string): ProfilePoint[] {
  return bottleSize === "2L_pepsi" ? PROFILES.pepsi : PROFILES.coke;
}

/** Bottle height fraction -> rocket height fraction. The bottle flies inverted. */
function toRocketFrame(h: number): number {
  return 1 - h;
}

/**
 * Where the neck's shoulder finishes, measured up from the nozzle. Below this the
 * bottle is still tapering out; above it the wall is straight.
 */
export function shoulderTopFraction(bottleSize: string): number {
  const full = profileFor(bottleSize).filter(([r]) => r >= 0.999);
  // Flipping reverses the order, so the straight section's *highest* point in
  // bottle coordinates is its *lowest* one in the rocket - the top of the neck's
  // shoulder. Reading the wrong end of this list made both helpers agree, which
  // is how the mistake showed itself.
  return toRocketFrame(full.length ? full[full.length - 1][1] : 0.66);
}

/** Where the straight body ends and the petaloid base begins, from the nozzle. */
export function baseStartFraction(bottleSize: string): number {
  const full = profileFor(bottleSize).filter(([r]) => r >= 0.999);
  return toRocketFrame(full.length ? full[0][1] : 0.075);
}

/**
 * The bottle wall, lathed from the profile above and already the right way up for
 * flight: neck and support ring at the bottom, full body diameter at the top.
 */
export function makeBottleBody(radius: number, height: number, bottleSize: string): THREE.BufferGeometry {
  const profile = profileFor(bottleSize);
  // Points that sit on the axis belong to the base and the mouth; a lathe run
  // through r = 0 pinches into a spike, so they are dropped. Reversed as well,
  // because flipping h also reverses the winding order.
  const pts = profile
    .filter(([r]) => r > 0.001)
    .map(([r, h]) => new THREE.Vector2(r * radius, toRocketFrame(h) * height))
    .reverse();
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.computeVertexNormals();
  return geo;
}

/**
 * The petaloid base: five lobes around the axis, each a rounded foot with a
 * valley between it and the next. It caps the TOP of the flown bottle, so the
 * feet point upward into the transition cone that is glued over them.
 */
export function makePetaloidBase(radius: number, height: number, lobes = 5): THREE.BufferGeometry {
  const RADIAL = 160;      // around the axis
  const RINGS = 22;        // from the axis out to where it meets the wall
  /** How far the valleys between the feet dip back down into the bottle. */
  const depth = radius * 0.42;
  const yTop = height;

  const positions: number[] = [];
  const indices: number[] = [];

  // v = 0 on the axis, 1 where the base meets the straight wall.
  for (let ring = 0; ring <= RINGS; ring++) {
    const v = ring / RINGS;
    for (let seg = 0; seg <= RADIAL; seg++) {
      const theta = (seg / RADIAL) * Math.PI * 2;

      // Lobe pattern: +1 on a foot, -1 in a valley.
      const lobe = Math.cos(theta * lobes);
      // The pattern only exists away from the axis and fades out at the wall,
      // which is what makes the feet look moulded rather than crimped.
      const shape = Math.sin(Math.PI * Math.min(1, v * 1.15));
      const r = radius * v;
      // Feet reach up to the top of the bottle; valleys hang below by `depth`.
      const drop = depth * (0.5 - 0.5 * lobe) * shape
        + radius * 0.10 * (1 - Math.cos((Math.PI / 2) * v));

      positions.push(Math.cos(theta) * r, yTop - drop, Math.sin(theta) * r);
    }
  }

  const stride = RADIAL + 1;
  for (let ring = 0; ring < RINGS; ring++) {
    for (let seg = 0; seg < RADIAL; seg++) {
      const a = ring * stride + seg;
      const b = a + stride;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * The water column. Water pools at the bottom, which on a flown bottle is the
 * neck - so a small charge sits entirely inside the narrow shoulder and its
 * surface is small, while a big one reaches the straight body and widens out.
 * The lathe follows the bottle's own inner wall, so the surface is always the
 * right diameter for the height it has reached.
 */
export function makeWaterGeometry(
  radius: number,
  height: number,
  bottleSize: string,
  fillFraction: number
): THREE.BufferGeometry | null {
  if (fillFraction <= 0.001) return null;
  const inner = radius * 0.965;
  // Wall radius as a function of height above the nozzle, in rocket frame.
  const wall = profileFor(bottleSize)
    .filter(([r]) => r > 0.001)
    .map(([r, h]) => [toRocketFrame(h), r] as const)
    .sort((a, b) => a[0] - b[0]);

  const radiusAt = (y: number): number => {
    if (y <= wall[0][0]) return wall[0][1];
    for (let i = 1; i < wall.length; i++) {
      const [y0, r0] = wall[i - 1], [y1, r1] = wall[i];
      if (y <= y1) {
        const t = y1 > y0 ? (y - y0) / (y1 - y0) : 0;
        return r0 + t * (r1 - r0);
      }
    }
    return wall[wall.length - 1][1];
  };

  // Fill by volume: integrate the profile from the nozzle up until the requested
  // fraction of the bottle's capacity is reached. That is what makes a quarter
  // fill actually look like a quarter of the bottle.
  const STEPS = 400;
  const dy = 1 / STEPS;
  const slice: number[] = [];
  let total = 0;
  for (let i = 0; i < STEPS; i++) {
    const r = radiusAt((i + 0.5) * dy);
    const v = r * r * dy;      // proportional to volume, constants cancel
    slice.push(v);
    total += v;
  }
  let want = fillFraction * total;
  let surfaceY = 0;
  for (let i = 0; i < STEPS; i++) {
    if (want <= slice[i]) { surfaceY = (i + want / slice[i]) * dy; break; }
    want -= slice[i];
    surfaceY = (i + 1) * dy;
  }

  const pts: THREE.Vector2[] = [new THREE.Vector2(0.001, 0)];
  for (const [y, r] of wall) {
    if (y > surfaceY) break;
    pts.push(new THREE.Vector2(r * inner, y * height));
  }
  pts.push(new THREE.Vector2(radiusAt(surfaceY) * inner, surfaceY * height));
  pts.push(new THREE.Vector2(0.001, surfaceY * height));

  const geo = new THREE.LatheGeometry(pts, 64);
  geo.computeVertexNormals();
  return geo;
}
