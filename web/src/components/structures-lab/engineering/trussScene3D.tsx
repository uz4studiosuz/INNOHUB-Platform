"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { TrussNode, TrussMemberDraft, SolvedMember, BuilderMode } from "./types";
import { GRID_SIZE } from "./trussApiParams";

export const SCALE = 1 / 15; // canvas px -> 3D units

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

export function memberColorFor(res: SolvedMember | undefined): string {
  if (!res) return UNSOLVED_WOOD_COLOR;
  return res.safetyFactor < 1 ? "#ff0000" : res.inTension ? "#3b82f6" : "#ef4444";
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
  const woodTexture = isWood ? getWoodTexture() : null;

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow onClick={onClick}>
      <boxGeometry args={[side, length, side]} />
      <meshStandardMaterial
        color={color}
        map={woodTexture}
        roughness={isWood ? 0.85 : 0.55}
        metalness={isWood ? 0.02 : 0.15}
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
  return (
    <mesh position={[pos.x, pos.y - coneHeight * 0.65, pos.z]} rotation={[Math.PI, 0, 0]} castShadow>
      <coneGeometry args={[coneRadius, coneHeight, 4]} />
      <meshStandardMaterial color={type === "pin" ? "#475569" : "#94a3b8"} />
    </mesh>
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
}: TrussSceneContentsProps) {
  const { center, radius } = useTrussBounds(nodes);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, toVec3(n, center.x, center.y)])), [nodes, center]);
  const interactive = !!onAddNode || !!onNodeClick || !!onMemberClick;

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

      {members.map((m) => {
        const a = nodeMap.get(m.nodeA);
        const b = nodeMap.get(m.nodeB);
        if (!a || !b) return null;
        const res = solved?.get(m.id);
        return (
          <MemberBeam
            key={m.id}
            a={a}
            b={b}
            color={memberColorFor(res)}
            thick={!!res && res.safetyFactor < 1}
            isWood={!res}
            sceneRadius={radius}
            onClick={
              onMemberClick
                ? (e) => {
                    e.stopPropagation();
                    if (mode === "delete") onMemberClick(m.id);
                  }
                : undefined
            }
          />
        );
      })}

      {nodes.map((n) => {
        const pos = nodeMap.get(n.id);
        if (!pos) return null;
        return (
          <group key={n.id}>
            <mesh
              position={pos}
              castShadow
              onClick={
                onNodeClick
                  ? (e) => {
                      e.stopPropagation();
                      onNodeClick(n.id);
                    }
                  : undefined
              }
            >
              <sphereGeometry args={[Math.max(radius * 0.045, 0.12), 12, 12]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
            {memberFirstNode === n.id && (
              <mesh position={pos} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[radius * 0.07, radius * 0.09, 24]} />
                <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
              </mesh>
            )}
            <SupportGlyph3D pos={pos} type={n.support} sceneRadius={radius} />
          </group>
        );
      })}
    </>
  );
}
