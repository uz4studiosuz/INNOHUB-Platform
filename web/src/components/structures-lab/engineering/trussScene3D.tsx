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

export function memberColorFor(res: SolvedMember | undefined): string {
  if (!res) return "#94a3b8";
  return res.safetyFactor < 1 ? "#ff0000" : res.inTension ? "#3b82f6" : "#ef4444";
}

export function MemberBeam({
  a,
  b,
  color,
  thick,
  onClick,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  color: string;
  thick: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid, quaternion: quat, length: len };
  }, [a, b]);

  const radius = thick ? 0.09 : 0.06;

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow onClick={onClick}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.15} />
    </mesh>
  );
}

export function SupportGlyph3D({ pos, type }: { pos: THREE.Vector3; type: TrussNode["support"] }) {
  if (type === "none") return null;
  return (
    <mesh position={[pos.x, pos.y - 0.3, pos.z]} rotation={[Math.PI, 0, 0]} castShadow>
      <coneGeometry args={[0.32, 0.45, 4]} />
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
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
            {memberFirstNode === n.id && (
              <mesh position={pos} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.22, 0.28, 24]} />
                <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
              </mesh>
            )}
            <SupportGlyph3D pos={pos} type={n.support} />
          </group>
        );
      })}
    </>
  );
}
