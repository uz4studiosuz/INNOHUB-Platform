"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TrussNode, TrussMemberDraft, SolvedMember } from "./types";

const SCALE = 1 / 15; // canvas px -> 3D units

function toVec3(n: TrussNode, centerX: number, centerY: number): THREE.Vector3 {
  // Screen y grows downward; flip so "up" on screen is +Y in 3D too.
  return new THREE.Vector3((n.x - centerX) * SCALE, -(n.y - centerY) * SCALE, 0);
}

function MemberBeam({ a, b, color, thick }: { a: THREE.Vector3; b: THREE.Vector3; color: string; thick: boolean }) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid, quaternion: quat, length: len };
  }, [a, b]);

  const radius = thick ? 0.09 : 0.06;

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.15} />
    </mesh>
  );
}

function SupportGlyph3D({ pos, type }: { pos: THREE.Vector3; type: TrussNode["support"] }) {
  if (type === "none") return null;
  return (
    <mesh position={[pos.x, pos.y - 0.3, pos.z]} rotation={[Math.PI, 0, 0]} castShadow>
      <coneGeometry args={[0.32, 0.45, 4]} />
      <meshStandardMaterial color={type === "pin" ? "#475569" : "#94a3b8"} />
    </mesh>
  );
}

interface TrussViewport3DProps {
  nodes: TrussNode[];
  members: TrussMemberDraft[];
  solved: Map<string, SolvedMember> | null;
}

export default function TrussViewport3D({ nodes, members, solved }: TrussViewport3DProps) {
  const { center, radius } = useMemo(() => {
    if (nodes.length === 0) return { center: { x: 0, y: 0 }, radius: 5 };
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 60);
    return { center: { x: cx, y: cy }, radius: (span * SCALE) / 2 + 2 };
  }, [nodes]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, toVec3(n, center.x, center.y)])), [nodes, center]);

  return (
    <div className="flex-1 relative" style={{ background: "#0f1e3d" }}>
      <Canvas shadows camera={{ position: [radius * 1.6, radius * 1.3, radius * 1.6], fov: 45 }}>
        <color attach="background" args={["#0f1e3d"]} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={["#93c5fd", "#0f1e3d", 0.5]} />
        <directionalLight position={[radius * 2, radius * 3, radius]} intensity={1.3} castShadow />
        <directionalLight position={[-radius * 2, radius, -radius]} intensity={0.4} color="#b0c4de" />

        {members.map((m) => {
          const a = nodeMap.get(m.nodeA);
          const b = nodeMap.get(m.nodeB);
          if (!a || !b) return null;
          const res = solved?.get(m.id);
          let color = "#94a3b8";
          if (res) {
            color = res.safetyFactor < 1 ? "#ff0000" : res.inTension ? "#3b82f6" : "#ef4444";
          }
          return <MemberBeam key={m.id} a={a} b={b} color={color} thick={!!res && res.safetyFactor < 1} />;
        })}

        {nodes.map((n) => {
          const pos = nodeMap.get(n.id);
          if (!pos) return null;
          return (
            <group key={n.id}>
              <mesh position={pos} castShadow>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshStandardMaterial color="#e2e8f0" />
              </mesh>
              <SupportGlyph3D pos={pos} type={n.support} />
            </group>
          );
        })}

        <gridHelper args={[radius * 4, 20, "#24365c", "#182642"]} position={[0, -radius - 1, 0]} />
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={2} maxDistance={radius * 8} />
      </Canvas>
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 bg-[#0a0e18]/70 px-2 py-1 rounded pointer-events-none">
        Sichqoncha: aylantirish (chap tugma) · zoom (g&apos;altak) · surish (o&apos;ng tugma)
      </div>
    </div>
  );
}
