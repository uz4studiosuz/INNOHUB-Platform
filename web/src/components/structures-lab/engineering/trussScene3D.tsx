"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { TrussNode, TrussMemberDraft, SolvedMember, BuilderMode } from "./types";
import { GRID_SIZE, UNIT_METERS } from "./trussApiParams";

export const SCALE = 1 / 15; // canvas px -> 3D units

/** Real bridges aren't a single flat truss - they have two parallel truss
 * sides (the ones the user draws in 2D), spaced apart by the deck width and
 * tied together by floor beams (bottom) and lateral bracing (top) at every
 * joint. This is a rendering-only extrusion: the analyzed structure is still
 * the single 2D truss (both sides carry an identical, symmetric copy of it).
 */
export const BRIDGE_DEPTH_METERS = 3.5;
const DEPTH_UNITS = BRIDGE_DEPTH_METERS * (GRID_SIZE / UNIT_METERS) * SCALE;
const HALF_DEPTH = DEPTH_UNITS / 2;

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
    if (nodes.length === 0) return { center: { x: 0, y: 0 }, radius: 5 };
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 60);
    return { center: { x: cx, y: cy }, radius: (span * SCALE) / 2 + 2 };
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

export function MemberBeam({
  a,
  b,
  color,
  thick,
  isWood,
  materialLabel,
  sceneRadius,
  onClick,
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
}) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid, quaternion: quat, length: len };
  }, [a, b]);

  const side = Math.max(sceneRadius * (thick ? 0.09 : 0.065), 0.14);
  const profile = materialProfileFor(materialLabel);
  const woodTexture = isWood && profile.wood ? getWoodTexture() : null;

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow onClick={onClick}>
      {profile.round
        ? <cylinderGeometry args={[side * 0.62, side * 0.62, length, 16, 1]} />
        : <boxGeometry args={[side, length, side]} />}
      <meshStandardMaterial
        color={color}
        map={woodTexture}
        roughness={isWood ? profile.roughness : Math.min(profile.roughness + 0.18, 0.72)}
        metalness={profile.metalness}
        envMapIntensity={profile.wood ? 0.35 : 1.15}
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

function BridgeDeck({ nodes, centerX, centerY, radius }: { nodes: TrussNode[]; centerX: number; centerY: number; radius: number }) {
  const dimensions = useMemo(() => {
    if (nodes.length < 2) return null;
    const points = nodes.map((node) => toVec3(node, centerX, centerY));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    return { minX, maxX, y: minY - Math.max(radius * 0.045, 0.1) };
  }, [centerX, centerY, nodes, radius]);
  if (!dimensions) return null;

  const width = dimensions.maxX - dimensions.minX;
  const plankCount = Math.max(8, Math.min(28, Math.round(width / Math.max(radius * 0.16, 0.28))));
  const plankWidth = width / plankCount;
  const texture = getWoodTexture();
  return (
    <group position={[(dimensions.minX + dimensions.maxX) / 2, dimensions.y, 0]}>
      {Array.from({ length: plankCount }, (_, index) => (
        <mesh key={index} position={[-width / 2 + plankWidth * (index + 0.5), 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[plankWidth * 0.9, Math.max(radius * 0.035, 0.08), DEPTH_UNITS * 1.08]} />
          <meshStandardMaterial color="#a77a4d" map={texture} roughness={0.86} metalness={0.01} />
        </mesh>
      ))}
    </group>
  );
}

function BridgeInfrastructure({ nodes, centerX, centerY, radius }: { nodes: TrussNode[]; centerX: number; centerY: number; radius: number }) {
  const geometry = useMemo(() => {
    if (nodes.length < 2) return null;
    const points = nodes.map((node) => toVec3(node, centerX, centerY));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const deckY = Math.min(...points.map((point) => point.y));
    const floorY = -radius * 1.075;
    return { minX, maxX, deckY, floorY, width: maxX - minX };
  }, [centerX, centerY, nodes, radius]);
  if (!geometry) return null;

  const { minX, maxX, deckY, floorY, width } = geometry;
  const abutmentHeight = Math.max(0.4, deckY - floorY - radius * 0.08);
  const railY = deckY + Math.max(radius * 0.22, 0.65);
  const postCount = Math.max(5, Math.min(18, Math.round(width / Math.max(radius * 0.3, 0.8))));
  const steel = "Po'lat";

  return (
    <group>
      {[minX - radius * 0.11, maxX + radius * 0.11].map((x) => (
        <mesh key={`abutment-${x}`} position={[x, floorY + abutmentHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[radius * 0.42, abutmentHeight, DEPTH_UNITS * 1.55]} />
          <meshStandardMaterial color="#6d7376" roughness={0.92} metalness={0.02} />
        </mesh>
      ))}
      <group position={[0, 0, 0]}>
        <mesh position={[0, floorY + (deckY - floorY) * 0.46, 0]} castShadow receiveShadow>
          <boxGeometry args={[radius * 0.62, Math.max(0.22, radius * 0.16), DEPTH_UNITS * 1.1]} />
          <meshStandardMaterial color="#747a7c" roughness={0.9} />
        </mesh>
        {[-DEPTH_UNITS * 0.24, DEPTH_UNITS * 0.24].map((z) => (
          <mesh key={`pier-${z}`} position={[0, floorY + (deckY - floorY) * 0.23, z]} castShadow receiveShadow>
            <cylinderGeometry args={[radius * 0.095, radius * 0.12, Math.max(0.3, deckY - floorY - radius * 0.2), 18]} />
            <meshStandardMaterial color="#7b8082" roughness={0.88} />
          </mesh>
        ))}
      </group>
      {[-HALF_DEPTH * 1.13, HALF_DEPTH * 1.13].flatMap((z, sideIndex) => {
        const rails = [railY, railY - radius * 0.1].map((y, railIndex) => (
          <MemberBeam key={`rail-${sideIndex}-${railIndex}`} a={new THREE.Vector3(minX, y, z)} b={new THREE.Vector3(maxX, y, z)} color="#aeb8bf" thick={false} isWood={false} materialLabel={steel} sceneRadius={radius * 0.44} />
        ));
        const posts = Array.from({ length: postCount + 1 }, (_, index) => {
          const x = minX + (width * index) / postCount;
          return <MemberBeam key={`rail-post-${sideIndex}-${index}`} a={new THREE.Vector3(x, deckY, z)} b={new THREE.Vector3(x, railY, z)} color="#aeb8bf" thick={false} isWood={false} materialLabel={steel} sceneRadius={radius * 0.44} />;
        });
        return [...rails, ...posts];
      })}
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
}: TrussSceneContentsProps) {
  const { center, radius } = useTrussBounds(nodes);
  // The design (nodes/members) is drawn as one 2D truss; rendered as the two
  // real physical sides of the bridge, offset +-halfDepth in Z. Editing only
  // ever targets the front side - the back side is a pure visual mirror.
  const frontNodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, toVec3(n, center.x, center.y).setZ(-HALF_DEPTH)])),
    [nodes, center]
  );
  const backNodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, toVec3(n, center.x, center.y).setZ(HALF_DEPTH)])),
    [nodes, center]
  );
  const interactive = !!onAddNode || !!onNodeClick || !!onMemberClick;

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
          onClick={
            side === "front" && onMemberClick
              ? (e) => {
                  e.stopPropagation();
                  if (mode === "delete") onMemberClick(m.id);
                }
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
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[Math.max(radius * 0.085, 0.22), Math.max(radius * 0.085, 0.22), Math.max(radius * 0.025, 0.07), 24]} />
              <meshStandardMaterial color="#59656e" roughness={0.28} metalness={0.82} />
            </mesh>
            <mesh position={[0, 0, side === "front" ? -Math.max(radius * 0.024, 0.075) : Math.max(radius * 0.024, 0.075)]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[Math.max(radius * 0.028, 0.08), Math.max(radius * 0.028, 0.08), Math.max(radius * 0.035, 0.09), 16]} />
              <meshStandardMaterial color="#c8d0d5" roughness={0.18} metalness={0.92} />
            </mesh>
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
  const xBracing = members.flatMap((m) => {
    const na = nodeById.get(m.nodeA);
    const nb = nodeById.get(m.nodeB);
    if (!na || !nb || Math.abs(na.y - nb.y) >= GRID_SIZE / 2) return [];
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

      <BridgeDeck nodes={nodes} centerX={center.x} centerY={center.y} radius={radius} />
      <BridgeInfrastructure nodes={nodes} centerX={center.x} centerY={center.y} radius={radius} />
      {renderMembers(frontNodeMap, "front")}
      {renderMembers(backNodeMap, "back")}
      {crossBraces}
      {xBracing}
      {renderNodes(frontNodeMap, "front")}
      {renderNodes(backNodeMap, "back")}
    </>
  );
}
