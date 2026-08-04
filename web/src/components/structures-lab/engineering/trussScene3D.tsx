"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TrussNode, TrussMemberDraft, SolvedMember, BuilderMode } from "./types";
import { GRID_SIZE, UNIT_METERS } from "./trussApiParams";

export const SCALE = 1 / 15; // canvas px -> 3D units

/** 3D units per real metre. Everything with a real-world size - the deck
 * width, the vehicle that drives across - has to derive from this, otherwise
 * it is only guessing at the scene's scale. */
export const UNITS_PER_METER = (GRID_SIZE / UNIT_METERS) * SCALE;

/** Real bridges aren't a single flat truss - they have two parallel truss
 * sides (the ones the user draws in 2D), spaced apart by the deck width and
 * tied together by floor beams (bottom) and lateral bracing (top) at every
 * joint. This is a rendering-only extrusion: the analyzed structure is still
 * the single 2D truss (both sides carry an identical, symmetric copy of it).
 */
export const MAX_BRIDGE_DEPTH_METERS = 3.5;

/**
 * Deck width for a given span, in metres.
 *
 * A fixed 3.5 m carriageway made short spans look wrong: the 4 m example
 * bridge came out 4 m long and 3.5 m wide - very nearly square, which is why
 * it read as a stubby platform rather than a bridge. Real footbridges and
 * model spans are narrow; only a span long enough to carry two lanes gets the
 * full width.
 */
export function deckWidthMeters(spanMeters: number): number {
  return Math.max(1.2, Math.min(MAX_BRIDGE_DEPTH_METERS, spanMeters * 0.42));
}

export function toVec3(n: TrussNode, centerX: number, centerY: number): THREE.Vector3 {
  // Screen y grows downward; flip so "up" on screen is +Y in 3D too.
  return new THREE.Vector3((n.x - centerX) * SCALE, -(n.y - centerY) * SCALE, 0);
}

/** Inverse of toVec3: a 3D point on the truss plane back to grid-snapped canvas px. */
export function fromVec3XY(x: number, y: number, centerX: number, centerY: number): { x: number; y: number } {
  const rawX = x / SCALE + centerX;
  const rawY = -(y / SCALE) + centerY;
  return { x: Math.round(rawX / GRID_SIZE) * GRID_SIZE, y: Math.round(rawY / GRID_SIZE) * GRID_SIZE };
}

export function useTrussBounds(nodes: TrussNode[]) {
  return useMemo(() => {
    if (nodes.length === 0) {
      const fallbackDepth = deckWidthMeters(2) * UNITS_PER_METER;
      return { center: { x: 0, y: 0 }, radius: 5, spanMeters: 2, depthUnits: fallbackDepth, halfDepth: fallbackDepth / 2 };
    }
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const spanPx = Math.max(...xs) - Math.min(...xs);
    const span = Math.max(spanPx, Math.max(...ys) - Math.min(...ys), 60);
    const spanMeters = Math.max((spanPx / GRID_SIZE) * UNIT_METERS, 0.5);
    const depthUnits = deckWidthMeters(spanMeters) * UNITS_PER_METER;
    return {
      center: { x: cx, y: cy },
      radius: (span * SCALE) / 2 + 2,
      spanMeters,
      depthUnits,
      halfDepth: depthUnits / 2,
    };
  }, [nodes]);
}

const UNSOLVED_WOOD_COLOR = "#c19a6b";

type MaterialProfile = {
  color: string;
  roughness: number;
  metalness: number;
  round: boolean;
  wood: boolean;
};

function materialProfileFor(label = "Balsa yog'och"): MaterialProfile {
  const normalized = label.toLowerCase();
  if (normalized.includes("alyuminiy")) return { color: "#aeb8bf", roughness: 0.28, metalness: 0.82, round: true, wood: false };
  if (normalized.includes("po'lat") || normalized.includes("po‘lat")) return { color: "#68747d", roughness: 0.22, metalness: 0.9, round: true, wood: false };
  if (normalized.includes("uglerod")) return { color: "#20262b", roughness: 0.34, metalness: 0.35, round: true, wood: false };
  return { color: UNSOLVED_WOOD_COLOR, roughness: 0.82, metalness: 0.02, round: false, wood: true };
}

export function memberColorFor(res: SolvedMember | undefined, materialLabel?: string): string {
  if (!res) return materialProfileFor(materialLabel).color;
  return res.safetyFactor < 1 ? "#ff0000" : res.inTension ? "#3b82f6" : "#ef4444";
}

/** WhiteBox Truck Rally colors members by force magnitude (N) rather than by
 * tension/compression - this is a distinct legend from the Engineering "Load
 * Test" safety-factor coloring (memberColorFor above), used only when the
 * Truck Rally scene opts in via TrussSceneContents' colorByForce prop. */
export const FORCE_BANDS: { max: number; color: string; label: string }[] = [
  { max: 100, color: "#facc15", label: "100N" },
  { max: 300, color: "#f97316", label: "300N" },
  { max: 500, color: "#22c55e", label: "500N" },
  { max: 700, color: "#3b82f6", label: "700N" },
  { max: 900, color: "#92400e", label: "900N" },
  { max: Infinity, color: "#0a0a0a", label: "1100N" },
];

export function forceBandColor(forceN: number): string {
  const f = Math.abs(forceN);
  return FORCE_BANDS.find((b) => f <= b.max)!.color;
}

let woodTextureCache: THREE.CanvasTexture | null = null;

/** A small procedural wood-grain texture, generated once and reused by every
 * beam (a shared THREE.Texture instance - repeat/wrap are set once here and
 * never mutated per-instance, since mutating a shared texture's repeat per
 * beam would make every beam jump to whatever beam last touched it). */
function getWoodTexture(): THREE.CanvasTexture {
  if (woodTextureCache) return woodTextureCache;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c19a6b";
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 36; i++) {
    const y = Math.random() * 64;
    ctx.strokeStyle = `rgba(110, 76, 42, ${0.08 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.3;
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 4);
    ctx.bezierCurveTo(16, y + (Math.random() - 0.5) * 6, 48, y + (Math.random() - 0.5) * 6, 64, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 3);
  woodTextureCache = texture;
  return texture;
}

/** Deterministic pseudo-random in [0,1). The procedural textures below are
 * generated once per page load, but a shared cache means the *first* caller's
 * result is what every later beam sees - so the noise has to be reproducible,
 * not Math.random(), or a hot reload silently repaints the whole bridge. */
function seeded(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

let concreteTextureCache: THREE.CanvasTexture | null = null;

/** Weathered cast concrete: a mid-grey base with form-board seams, aggregate
 * speckle and vertical staining. Used by the abutments and the deck slab. */
function getConcreteTexture(): THREE.CanvasTexture {
  if (concreteTextureCache) return concreteTextureCache;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8d9195";
  ctx.fillRect(0, 0, 128, 128);
  // aggregate / pitting
  for (let i = 0; i < 2200; i++) {
    const shade = seeded(i * 3 + 1);
    ctx.fillStyle = shade > 0.5 ? `rgba(255,255,255,${0.03 + shade * 0.07})` : `rgba(20,24,28,${0.03 + shade * 0.1})`;
    ctx.fillRect(seeded(i * 3 + 2) * 128, seeded(i * 3 + 3) * 128, 1.4, 1.4);
  }
  // horizontal form-board seams (concrete is poured in lifts)
  for (let y = 16; y < 128; y += 32) {
    ctx.fillStyle = "rgba(45,52,58,0.22)";
    ctx.fillRect(0, y, 128, 1.5);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(0, y + 1.5, 128, 1);
  }
  // vertical rain staining
  for (let i = 0; i < 26; i++) {
    const x = seeded(i * 11 + 5) * 128;
    ctx.fillStyle = `rgba(56,62,66,${0.04 + seeded(i * 11 + 6) * 0.08})`;
    ctx.fillRect(x, 0, 1 + seeded(i * 11 + 7) * 4, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  concreteTextureCache = texture;
  return texture;
}

let asphaltTextureCache: THREE.CanvasTexture | null = null;

/** Asphalt wearing course: dark bitumen with light aggregate grains and a
 * couple of faint wheel-path polish streaks running along the carriageway. */
function getAsphaltTexture(): THREE.CanvasTexture {
  if (asphaltTextureCache) return asphaltTextureCache;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#2c3033";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3200; i++) {
    const g = seeded(i * 5 + 9);
    const tone = 60 + Math.floor(g * 80);
    ctx.fillStyle = `rgba(${tone},${tone + 3},${tone + 6},${0.25 + g * 0.4})`;
    ctx.fillRect(seeded(i * 5 + 10) * 128, seeded(i * 5 + 11) * 128, 1 + g * 1.4, 1 + g * 1.4);
  }
  // wheel paths (slightly polished, so lighter)
  [30, 98].forEach((x) => {
    ctx.fillStyle = "rgba(150,158,164,0.06)";
    ctx.fillRect(x - 9, 0, 18, 128);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  asphaltTextureCache = texture;
  return texture;
}

let rivetRingCache: THREE.BufferGeometry | null = null;

/** One merged ring of eight rivet heads on a unit-radius circle in the XY
 * plane, protruding along +Z. Merged into a single geometry on purpose: a
 * 30-joint bridge renders two gusset plates per joint, and eight separate
 * rivet meshes each would put ~500 extra draw calls on the frame for detail
 * that is only a few pixels across. */
function getRivetRingGeometry(): THREE.BufferGeometry {
  if (rivetRingCache) return rivetRingCache;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const head = new THREE.SphereGeometry(0.12, 8, 6);
    head.scale(1, 1, 0.62);
    head.translate(Math.cos(angle) * 0.66, Math.sin(angle) * 0.66, 0.5);
    parts.push(head);
  }
  rivetRingCache = mergeGeometries(parts, false) ?? parts[0];
  parts.forEach((p) => p.dispose());
  return rivetRingCache;
}

/** The steel connection plate every real truss joint is built around: members
 * are never welded end-to-end, they all bolt onto a shared gusset. Purely a
 * rendering detail - the analysis still treats the joint as a single pin. */
function GussetPlate({ radius, side, materialLabel }: { radius: number; side: "front" | "back"; materialLabel?: string }) {
  const plateR = Math.max(radius * 0.075, 0.2);
  const plateT = Math.max(radius * 0.012, 0.04);
  const outward = side === "front" ? -1 : 1;
  const profile = materialProfileFor(materialLabel);
  const plateColor = profile.wood ? "#5d6a72" : profile.color;
  return (
    <group>
      {/* octagonal plate, its axis along Z so the flat face reads from the side */}
      <mesh rotation={[Math.PI / 2, Math.PI / 8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[plateR, plateR, plateT, 8]} />
        <meshStandardMaterial color={plateColor} roughness={0.34} metalness={0.86} envMapIntensity={1.2} />
      </mesh>
      {/* bolt heads around the plate edge */}
      <mesh geometry={getRivetRingGeometry()} scale={[plateR, plateR, plateT * 1.6]} position={[0, 0, outward * plateT * 0.5]}>
        <meshStandardMaterial color="#cfd6db" roughness={0.24} metalness={0.94} />
      </mesh>
      {/* the pin itself, capped on the outer face */}
      <mesh position={[0, 0, outward * plateT * 0.9]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[plateR * 0.34, plateR * 0.34, plateT * 1.9, 14]} />
        <meshStandardMaterial color="#dee4e8" roughness={0.16} metalness={0.95} />
      </mesh>
    </group>
  );
}

export function MemberBeam({
  a,
  b,
  color,
  thick,
  isWood,
  materialLabel,
  sceneRadius,
  onClick,
  highlight,
  onPointerOver,
  onPointerOut,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  color: string;
  thick: boolean;
  /** True for the default (not-yet-analyzed) state - renders as a square
   * timber beam with a wood-grain texture. Once solved, force-colored
   * members render as plain flat color for a clearer tension/compression read.
   */
  isWood: boolean;
  materialLabel?: string;
  /** The overall truss's bounding radius (useTrussBounds) - beam thickness
   * is a fraction of this, not a fixed absolute size, so members stay
   * visibly beam-like (not hairline-thin) regardless of the design's scale.
   */
  sceneRadius: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  /** When true, the beam glows with an emissive highlight so it stands out
   * visually from all other members - used for hover and selection feedback. */
  highlight?: boolean;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid, quaternion: quat, length: len };
  }, [a, b]);

  const side = Math.max(sceneRadius * (thick || highlight ? 0.06 : 0.042), 0.11);
  const profile = materialProfileFor(materialLabel);
  const woodTexture = isWood && profile.wood ? getWoodTexture() : null;

  return (
    <mesh
      position={position}
      quaternion={quaternion}
      castShadow
      receiveShadow
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {profile.round
        ? <cylinderGeometry args={[side * 0.62, side * 0.62, length, 16, 1]} />
        : <boxGeometry args={[side, length, side]} />}
      <meshStandardMaterial
        color={highlight ? "#fbbf24" : color}
        map={highlight ? null : woodTexture}
        roughness={highlight ? 0.3 : isWood ? profile.roughness : Math.min(profile.roughness + 0.18, 0.72)}
        metalness={highlight ? 0.6 : profile.metalness}
        emissive={highlight ? "#f59e0b" : "#000000"}
        emissiveIntensity={highlight ? 0.55 : 0}
        envMapIntensity={highlight ? 2.0 : profile.wood ? 0.35 : 1.15}
      />
    </mesh>
  );
}

export function SupportGlyph3D({
  pos,
  type,
  sceneRadius,
}: {
  pos: THREE.Vector3;
  type: TrussNode["support"];
  sceneRadius: number;
}) {
  if (type === "none") return null;
  const coneRadius = sceneRadius * 0.14;
  const coneHeight = sceneRadius * 0.2;
  const baseY = pos.y - coneHeight * 1.18;
  const rollerRadius = coneRadius * 0.28;
  return (
    <group>
      <mesh position={[pos.x, pos.y - coneHeight * 0.65, pos.z]} rotation={[Math.PI, 0, 0]} castShadow receiveShadow>
        <coneGeometry args={[coneRadius, coneHeight, 4]} />
        <meshStandardMaterial color="#66737d" roughness={0.3} metalness={0.78} />
      </mesh>
      {type !== "pin" && (
        <>
          <mesh position={[pos.x - coneRadius * 0.45, baseY, pos.z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[rollerRadius, rollerRadius, coneRadius * 0.7, 16]} />
            <meshStandardMaterial color="#aab4bb" roughness={0.2} metalness={0.9} />
          </mesh>
          <mesh position={[pos.x + coneRadius * 0.45, baseY, pos.z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[rollerRadius, rollerRadius, coneRadius * 0.7, 16]} />
            <meshStandardMaterial color="#aab4bb" roughness={0.2} metalness={0.9} />
          </mesh>
        </>
      )}
      <mesh position={[pos.x, baseY - rollerRadius * 0.75, pos.z]} receiveShadow>
        <boxGeometry args={[coneRadius * 2.4, rollerRadius * 0.35, coneRadius * 1.5]} />
        <meshStandardMaterial color="#414c54" roughness={0.55} metalness={0.52} />
      </mesh>
    </group>
  );
}

/** The one place the bridge's overall extents are derived. Every piece of
 * scenery below (deck, railings, abutments) has to agree on where the
 * carriageway sits, and they used to each recompute it slightly differently. */
function useDeckGeometry(nodes: TrussNode[], centerX: number, centerY: number, radius: number) {
  return useMemo(() => {
    if (nodes.length < 2) return null;
    const points = nodes.map((node) => toVec3(node, centerX, centerY));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const chordY = Math.min(...points.map((point) => point.y));
    const slabThickness = Math.max(radius * 0.04, 0.09);
    // Roadway hangs just under the bottom chord, on top of the floor beams.
    const surfaceY = chordY - Math.max(radius * 0.045, 0.1);
    return {
      minX,
      maxX,
      chordY,
      surfaceY,
      slabThickness,
      span: maxX - minX,
      floorY: -radius * 1.075,
    };
  }, [centerX, centerY, nodes, radius]);
}

type DeckStyle = "timber" | "asphalt";

/** The carriageway: a running surface between two raised kerbs, carried on
 * transverse floor beams. Timber decks get individual planks (the balsa
 * competition bridges); metal decks get an asphalt wearing course with lane
 * markings, which is what a real steel or aluminium truss span carries. */
function BridgeDeck({
  nodes,
  centerX,
  centerY,
  radius,
  depthUnits,
  style,
}: {
  nodes: TrussNode[];
  centerX: number;
  centerY: number;
  radius: number;
  depthUnits: number;
  style: DeckStyle;
}) {
  const deck = useDeckGeometry(nodes, centerX, centerY, radius);
  const asphalt = useMemo(() => (style === "asphalt" ? getAsphaltTexture() : null), [style]);
  const concrete = useMemo(() => (style === "asphalt" ? getConcreteTexture() : null), [style]);
  const wood = useMemo(() => (style === "timber" ? getWoodTexture() : null), [style]);
  if (!deck) return null;

  const { minX, maxX, surfaceY, slabThickness, span } = deck;
  const midX = (minX + maxX) / 2;
  const roadWidth = depthUnits * 1.08;
  const kerbHeight = Math.max(radius * 0.03, 0.07);
  const kerbWidth = roadWidth * 0.07;

  // Lane markings: a dashed centre line plus a continuous edge line each side.
  const dashCount = Math.max(4, Math.min(24, Math.round(span / Math.max(radius * 0.34, 0.6))));
  const dashLength = (span / dashCount) * 0.5;
  const markingY = surfaceY + slabThickness / 2 + 0.004;

  return (
    <group>
      {/* running surface */}
      {style === "timber" ? (
        (() => {
          const plankCount = Math.max(8, Math.min(30, Math.round(span / Math.max(radius * 0.16, 0.28))));
          const plankWidth = span / plankCount;
          return (
            <group position={[midX, surfaceY, 0]}>
              {Array.from({ length: plankCount }, (_, index) => (
                <mesh key={index} position={[-span / 2 + plankWidth * (index + 0.5), 0, 0]} castShadow receiveShadow>
                  <boxGeometry args={[plankWidth * 0.9, slabThickness, roadWidth]} />
                  <meshStandardMaterial color="#a77a4d" map={wood} roughness={0.88} metalness={0.01} />
                </mesh>
              ))}
            </group>
          );
        })()
      ) : (
        <>
          <mesh position={[midX, surfaceY, 0]} castShadow receiveShadow>
            <boxGeometry args={[span, slabThickness, roadWidth]} />
            <meshStandardMaterial color="#5c6367" map={asphalt} roughness={0.95} metalness={0.03} />
          </mesh>
          {/* dashed centre line */}
          {Array.from({ length: dashCount }, (_, index) => (
            <mesh key={`dash-${index}`} position={[minX + (span / dashCount) * (index + 0.5), markingY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[dashLength, roadWidth * 0.035]} />
              <meshStandardMaterial color="#e8e2cf" roughness={0.8} metalness={0} />
            </mesh>
          ))}
          {/* edge lines */}
          {[roadWidth * 0.38, -roadWidth * 0.38].map((z) => (
            <mesh key={`edge-${z}`} position={[midX, markingY, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[span, roadWidth * 0.03]} />
              <meshStandardMaterial color="#dcd6c4" roughness={0.85} metalness={0} />
            </mesh>
          ))}
        </>
      )}

      {/* kerbs / safety curbs down both edges */}
      {[roadWidth / 2 - kerbWidth / 2, -roadWidth / 2 + kerbWidth / 2].map((z) => (
        <mesh key={`kerb-${z}`} position={[midX, surfaceY + slabThickness / 2 + kerbHeight / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[span, kerbHeight, kerbWidth]} />
          <meshStandardMaterial
            color={style === "timber" ? "#8f6a41" : "#9aa0a4"}
            map={style === "timber" ? wood : concrete}
            roughness={0.9}
            metalness={0.02}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Pedestrian parapet down both sides of the deck: a post at every panel point
 * with a top rail and a mid rail threaded through them. */
function BridgeRailings({ nodes, centerX, centerY, radius, depthUnits }: { nodes: TrussNode[]; centerX: number; centerY: number; radius: number; depthUnits: number }) {
  const deck = useDeckGeometry(nodes, centerX, centerY, radius);
  if (!deck) return null;

  const { minX, maxX, surfaceY, slabThickness, span } = deck;
  const midX = (minX + maxX) / 2;
  const roadWidth = depthUnits * 1.08;
  const baseY = surfaceY + slabThickness / 2;
  const postHeight = Math.max(radius * 0.14, 0.32);
  const postSide = Math.max(radius * 0.014, 0.035);
  const railSide = postSide * 0.78;
  const postCount = Math.max(4, Math.min(26, Math.round(span / Math.max(radius * 0.3, 0.5))));
  const railZ = roadWidth / 2 - postSide;

  return (
    <group>
      {[railZ, -railZ].map((z) => (
        <group key={`rail-side-${z}`}>
          {Array.from({ length: postCount + 1 }, (_, index) => (
            <mesh key={`post-${index}`} position={[minX + (span / postCount) * index, baseY + postHeight / 2, z]} castShadow>
              <boxGeometry args={[postSide, postHeight, postSide]} />
              <meshStandardMaterial color="#8d979e" roughness={0.4} metalness={0.8} />
            </mesh>
          ))}
          {[postHeight * 0.98, postHeight * 0.55].map((h) => (
            <mesh key={`rail-${h}`} position={[midX, baseY + h, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[railSide, railSide, span, 10]} />
              <meshStandardMaterial color="#a3adb4" roughness={0.32} metalness={0.88} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Concrete substructure at both ends: a battered (sloping-faced) abutment
 * wall with wing walls, a bearing pedestal the truss actually sits on, and the
 * approach slab that carries the road onto the bank. */
function BridgeInfrastructure({ nodes, centerX, centerY, radius, depthUnits }: { nodes: TrussNode[]; centerX: number; centerY: number; radius: number; depthUnits: number }) {
  const deck = useDeckGeometry(nodes, centerX, centerY, radius);
  const concrete = getConcreteTexture();

  const abutmentGeometry = useMemo(() => {
    if (!deck) return null;
    const height = Math.max(0.4, deck.chordY - deck.floorY - radius * 0.05);
    const topHalf = radius * 0.13;
    const baseHalf = radius * 0.3;
    const depth = depthUnits * 1.42;
    const shape = new THREE.Shape();
    shape.moveTo(-topHalf, height);
    shape.lineTo(topHalf, height);
    shape.lineTo(baseHalf, 0);
    shape.lineTo(-baseHalf, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    geo.translate(0, 0, -depth / 2);
    geo.computeVertexNormals();
    return { geo, height, topHalf };
  }, [deck, radius, depthUnits]);

  if (!deck || !abutmentGeometry) return null;

  const { minX, maxX, chordY, floorY, surfaceY, slabThickness } = deck;
  const { geo, height, topHalf } = abutmentGeometry;

  return (
    <group>
      {[
        { x: minX - radius * 0.06, sign: -1 },
        { x: maxX + radius * 0.06, sign: 1 },
      ].map(({ x, sign }) => (
        <group key={`abutment-${sign}`}>
          {/* battered abutment wall */}
          <mesh geometry={geo} position={[x, floorY, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#8b9094" map={concrete} roughness={0.96} metalness={0.01} />
          </mesh>
          {/* bearing shelf the truss ends land on */}
          <mesh position={[x, chordY - radius * 0.035, 0]} castShadow receiveShadow>
            <boxGeometry args={[topHalf * 2.6, Math.max(0.1, radius * 0.055), depthUnits * 1.24]} />
            <meshStandardMaterial color="#6f767b" map={concrete} roughness={0.9} metalness={0.03} />
          </mesh>
          {/* elastomeric bearing pads under each truss line */}
          {[depthUnits / 2, -depthUnits / 2].map((z) => (
            <mesh key={`pad-${z}`} position={[x, chordY - radius * 0.005, z]} castShadow>
              <boxGeometry args={[topHalf * 0.9, Math.max(0.05, radius * 0.025), depthUnits * 0.16]} />
              <meshStandardMaterial color="#22282c" roughness={0.85} metalness={0.1} />
            </mesh>
          ))}
          {/* approach slab carrying the road off the bridge and onto the bank */}
          <mesh position={[x + sign * radius * 0.34, surfaceY, 0]} receiveShadow castShadow>
            <boxGeometry args={[radius * 0.62, slabThickness * 1.1, depthUnits * 1.1]} />
            <meshStandardMaterial color="#7e8489" map={concrete} roughness={0.94} metalness={0.02} />
          </mesh>
          {/* wing walls flaring back into the embankment */}
          {[1, -1].map((zs) => (
            <mesh
              key={`wing-${zs}`}
              position={[x + sign * radius * 0.2, floorY + height * 0.42, zs * depthUnits * 0.66]}
              rotation={[0, sign * zs * 0.24, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[radius * 0.5, height * 0.84, Math.max(0.08, radius * 0.045)]} />
              <meshStandardMaterial color="#868c90" map={concrete} roughness={0.96} metalness={0.01} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

interface TrussSceneContentsProps {
  nodes: TrussNode[];
  members: TrussMemberDraft[];
  solved: Map<string, SolvedMember> | null;
  /** When provided, the scene becomes interactive: clicking the (invisible)
   * base plane adds a node in "node" mode, clicking a node/member fires the
   * matching handler - mirroring TrussCanvas's 2D click model.
   */
  mode?: BuilderMode;
  memberFirstNode?: string | null;
  onAddNode?: (x: number, y: number) => void;
  onNodeClick?: (id: string) => void;
  onMemberClick?: (id: string) => void;
  /** Truck Rally opts in to color solved members by force magnitude (N)
   * against FORCE_BANDS instead of the default tension/compression coloring.
   */
  colorByForce?: boolean;
  /** Truck Rally realism mode: keep every member as natural timber (matching
   * the real WhiteBox rally, where the bridge stays wood while the truck
   * crosses) and only highlight the single first-failing member in red -
   * instead of the multi-colored per-member force/safety scheme, which reads
   * as noisy and un-serious in the arena view. */
  keepWood?: boolean;
  /** Member ID currently hovered (from sidebar or from the 3D scene itself).
   * The matching beam renders with an emissive glow. */
  highlightMemberId?: string | null;
  /** Fires when the pointer enters/leaves a beam in the 3D scene. */
  onMemberHover?: (id: string | null) => void;
}

export function TrussSceneContents({
  nodes,
  members,
  solved,
  mode,
  memberFirstNode,
  onAddNode,
  onNodeClick,
  onMemberClick,
  colorByForce,
  keepWood,
  highlightMemberId,
  onMemberHover,
}: TrussSceneContentsProps) {
  const { center, radius, depthUnits, halfDepth } = useTrussBounds(nodes);
  // The design (nodes/members) is drawn as one 2D truss; rendered as the two
  // real physical sides of the bridge, offset +-halfDepth in Z. Editing only
  // ever targets the front side - the back side is a pure visual mirror.
  const frontNodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, toVec3(n, center.x, center.y).setZ(-halfDepth)])),
    [nodes, center, halfDepth]
  );
  const backNodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, toVec3(n, center.x, center.y).setZ(halfDepth)])),
    [nodes, center, halfDepth]
  );
  const interactive = !!onAddNode || !!onNodeClick || !!onMemberClick;
  // A timber truss carries a plank deck; a steel or aluminium one carries an
  // asphalt carriageway. keepWood (the Truck Rally arena) forces the timber
  // deck regardless, because there the bridge is always a balsa model.
  const deckStyle: DeckStyle = keepWood || materialProfileFor(members[0]?.materialLabel).wood ? "timber" : "asphalt";

  const renderMembers = (nodeMap: Map<string, THREE.Vector3>, side: "front" | "back") =>
    members.map((m) => {
      const a = nodeMap.get(m.nodeA);
      const b = nodeMap.get(m.nodeB);
      if (!a || !b) return null;
      const res = solved?.get(m.id);
      const failing = !!res && res.safetyFactor < 1;
      let color: string;
      let isWoodBeam: boolean;
      if (keepWood) {
        color = failing ? "#b91c1c" : UNSOLVED_WOOD_COLOR;
        isWoodBeam = !failing;
      } else {
        color = colorByForce && res ? forceBandColor(res.forceN) : memberColorFor(res, m.materialLabel);
        isWoodBeam = !res;
      }
      const isHighlighted = highlightMemberId === m.id;
      return (
        <MemberBeam
          key={`${side}-${m.id}`}
          a={a}
          b={b}
          color={color}
          thick={failing}
          isWood={isWoodBeam}
          materialLabel={m.materialLabel}
          sceneRadius={radius}
          highlight={isHighlighted}
          onClick={
            side === "front"
              ? (e) => {
                  e.stopPropagation();
                  if (onMemberClick) onMemberClick(m.id);
                }
              : undefined
          }
          onPointerOver={
            side === "front" && onMemberHover
              ? (e) => { e.stopPropagation(); onMemberHover(m.id); }
              : undefined
          }
          onPointerOut={
            side === "front" && onMemberHover
              ? () => onMemberHover(null)
              : undefined
          }
        />
      );
    });

  const renderNodes = (nodeMap: Map<string, THREE.Vector3>, side: "front" | "back") =>
    nodes.map((n) => {
      const pos = nodeMap.get(n.id);
      if (!pos) return null;
      return (
        <group key={`${side}-${n.id}`}>
          <group
            position={pos}
            onClick={
              side === "front" && onNodeClick
                ? (e) => {
                    e.stopPropagation();
                    onNodeClick(n.id);
                  }
                : undefined
            }
          >
            <GussetPlate radius={radius} side={side} materialLabel={members[0]?.materialLabel} />
          </group>
          {side === "front" && memberFirstNode === n.id && (
            <mesh position={pos} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius * 0.07, radius * 0.09, 24]} />
              <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
            </mesh>
          )}
          <SupportGlyph3D pos={pos} type={n.support} sceneRadius={radius} />
        </group>
      );
    });

  // Floor beams (bottom joints) + lateral struts (top joints) tying the two
  // sides together - one straight cross beam per joint, front side to back side.
  const crossBraces = nodes.map((n) => {
    const a = frontNodeMap.get(n.id);
    const b = backNodeMap.get(n.id);
    if (!a || !b) return null;
    return <MemberBeam key={`brace-${n.id}`} a={a} b={b} color={materialProfileFor(members[0]?.materialLabel).color} thick={false} isWood materialLabel={members[0]?.materialLabel} sceneRadius={radius} />;
  });

  // Diagonal (X) bracing across the deck and across the top: real truss
  // bridges brace every chord panel this way, not just with straight struts.
  // A member counts as a "chord" segment (top or bottom row) when its two
  // ends sit at the same height in the original 2D drawing; only those get
  // crossed diagonally between the front and back sides.
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const topRowY = nodes.length ? Math.min(...nodes.map((node) => node.y)) : 0;
  const xBracing = members.flatMap((m) => {
    const na = nodeById.get(m.nodeA);
    const nb = nodeById.get(m.nodeB);
    if (!na || !nb || Math.abs(na.y - nb.y) >= GRID_SIZE / 2 || Math.abs(na.y - topRowY) >= GRID_SIZE / 2) return [];
    const fa = frontNodeMap.get(m.nodeA);
    const bb = backNodeMap.get(m.nodeB);
    const ba = backNodeMap.get(m.nodeA);
    const fb = frontNodeMap.get(m.nodeB);
    if (!fa || !bb || !ba || !fb) return [];
    return [
      <MemberBeam key={`xbrace-a-${m.id}`} a={fa} b={bb} color={materialProfileFor(m.materialLabel).color} thick={false} isWood materialLabel={m.materialLabel} sceneRadius={radius} />,
      <MemberBeam key={`xbrace-b-${m.id}`} a={ba} b={fb} color={materialProfileFor(m.materialLabel).color} thick={false} isWood materialLabel={m.materialLabel} sceneRadius={radius} />,
    ];
  });

  return (
    <>
      {interactive && (
        <mesh
          position={[0, 0, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (mode === "node" && onAddNode) {
              const { x, y } = fromVec3XY(e.point.x, e.point.y, center.x, center.y);
              onAddNode(x, y);
            }
          }}
        >
          <planeGeometry args={[Math.max(radius * 8, 60), Math.max(radius * 8, 60)]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      <BridgeDeck nodes={nodes} centerX={center.x} centerY={center.y} radius={radius} depthUnits={depthUnits} style={deckStyle} />
      <BridgeRailings nodes={nodes} centerX={center.x} centerY={center.y} radius={radius} depthUnits={depthUnits} />
      <BridgeInfrastructure nodes={nodes} centerX={center.x} centerY={center.y} radius={radius} depthUnits={depthUnits} />
      {renderMembers(frontNodeMap, "front")}
      {renderMembers(backNodeMap, "back")}
      {crossBraces}
      {xBracing}
      {renderNodes(frontNodeMap, "front")}
      {renderNodes(backNodeMap, "back")}
    </>
  );
}
