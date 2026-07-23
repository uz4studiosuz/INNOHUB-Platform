"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TrussNode, TrussMemberDraft, SolvedMember } from "./types";
import { toVec3, useTrussBounds, TrussSceneContents } from "./trussScene3D";

function TruckModel({ position }: { position: THREE.Vector3 }) {
  const wheels: [number, number, number][] = [
    [-0.5, 0, 0.48],
    [-0.5, 0, -0.48],
    [0.5, 0, 0.48],
    [0.5, 0, -0.48],
  ];
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.5, 0.5, 0.85]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[-0.45, 0.72, 0]} castShadow>
        <boxGeometry args={[0.55, 0.45, 0.8]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
      {wheels.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.22, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </group>
  );
}

function GroundBank({ x, y, depth, width }: { x: number; y: number; depth: number; width: number }) {
  return (
    <mesh position={[x, y - 0.5, 0]} receiveShadow>
      <boxGeometry args={[width, 1, depth]} />
      <meshStandardMaterial color="#4d7c0f" roughness={0.9} />
    </mesh>
  );
}

interface TrussRally3DProps {
  nodes: TrussNode[];
  members: TrussMemberDraft[];
  solved: Map<string, SolvedMember> | null;
  /** 0..1 crossing progress; null hides the truck (test hasn't started). */
  truckProgress: number | null;
}

export default function TrussRally3D({ nodes, members, solved, truckProgress }: TrussRally3DProps) {
  const { center, radius } = useTrussBounds(nodes);

  const { minX, maxX, deckY } = useMemo(() => {
    if (nodes.length === 0) return { minX: -5, maxX: 5, deckY: 0 };
    const pts = nodes.map((n) => toVec3(n, center.x, center.y));
    return {
      minX: Math.min(...pts.map((p) => p.x)),
      maxX: Math.max(...pts.map((p) => p.x)),
      deckY: Math.min(...pts.map((p) => p.y)),
    };
  }, [nodes, center]);

  const bankWidth = Math.max((maxX - minX) * 0.6, 4);
  const bankDepth = radius * 3;

  const truckPos = useMemo(() => {
    const t = truckProgress === null ? 0 : Math.max(0, Math.min(1, truckProgress));
    const x = minX + (maxX - minX) * t;
    return new THREE.Vector3(x, deckY + 0.05, 0);
  }, [truckProgress, minX, maxX, deckY]);

  return (
    <div className="flex-1 relative" style={{ background: "#0f1e3d" }}>
      <Canvas shadows camera={{ position: [radius * 1.8, radius * 1.4, radius * 2], fov: 45 }}>
        <color attach="background" args={["#0f1e3d"]} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={["#93c5fd", "#0f1e3d", 0.5]} />
        <directionalLight position={[radius * 2, radius * 3, radius]} intensity={1.3} castShadow />
        <directionalLight position={[-radius * 2, radius, -radius]} intensity={0.4} color="#b0c4de" />

        <TrussSceneContents nodes={nodes} members={members} solved={solved} />

        <GroundBank x={minX - bankWidth / 2 - 0.5} y={deckY} width={bankWidth} depth={bankDepth} />
        <GroundBank x={maxX + bankWidth / 2 + 0.5} y={deckY} width={bankWidth} depth={bankDepth} />

        {truckProgress !== null && <TruckModel position={truckPos} />}

        <OrbitControls enableDamping dampingFactor={0.08} minDistance={2} maxDistance={radius * 8} />
      </Canvas>
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 bg-[#0a0e18]/70 px-2 py-1 rounded pointer-events-none">
        Sichqoncha: aylantirish (chap tugma) · zoom (g&apos;altak) · surish (o&apos;ng tugma)
      </div>
    </div>
  );
}
