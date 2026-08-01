import * as THREE from "three";

/**
 * The standard rocketry markers, drawn in code rather than shipped as images.
 *
 * Centre of gravity has been a quartered black-and-white ball since long before
 * anyone simulated it, and centre of pressure the red-and-white counterpart.
 * Using the conventional symbols means a student who has seen a model rocketry
 * diagram recognises them immediately.
 */

const SIZE = 128;

/**
 * A two-colour quartered sphere map: four alternating quadrants, which wrap onto
 * a sphere as the familiar checkered ball.
 */
export function makeCheckerBallTexture(a = "#111827", b = "#f8fafc"): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  // Two columns x two rows of the UV square gives four quadrants on the sphere.
  const half = SIZE / 2;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Colour per design component, matching the order the sidebar lists them in. */
export const COMPONENT_MARKER_COLOURS: Record<string, string> = {
  propulsion: "#22d3ee",
  recovery: "#a855f7",
  nose: "#ef4444",
  conetube: "#f8fafc",
  conetransition: "#f59e0b",
  fins: "#2563eb",
};
