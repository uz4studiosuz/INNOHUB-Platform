"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TrussNode, TrussMemberDraft, SolvedMember } from "./types";
import { useTrussBounds, TrussSceneContents } from "./trussScene3D";

interface TrussViewport3DProps {
  nodes: TrussNode[];
  members: TrussMemberDraft[];
  solved: Map<string, SolvedMember> | null;
}

export default function TrussViewport3D({ nodes, members, solved }: TrussViewport3DProps) {
  const { radius } = useTrussBounds(nodes);

  return (
    <div className="flex-1 relative" style={{ background: "#0f1e3d" }}>
      <Canvas shadows camera={{ position: [radius * 1.6, radius * 1.3, radius * 1.6], fov: 45 }}>
        <color attach="background" args={["#0f1e3d"]} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={["#93c5fd", "#0f1e3d", 0.5]} />
        <directionalLight position={[radius * 2, radius * 3, radius]} intensity={1.3} castShadow />
        <directionalLight position={[-radius * 2, radius, -radius]} intensity={0.4} color="#b0c4de" />

        <TrussSceneContents nodes={nodes} members={members} solved={solved} />

        <gridHelper args={[radius * 4, 20, "#24365c", "#182642"]} position={[0, -radius - 1, 0]} />
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={2} maxDistance={radius * 8} />
      </Canvas>
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 bg-[#0a0e18]/70 px-2 py-1 rounded pointer-events-none">
        Sichqoncha: aylantirish (chap tugma) · zoom (g&apos;altak) · surish (o&apos;ng tugma)
      </div>
    </div>
  );
}
