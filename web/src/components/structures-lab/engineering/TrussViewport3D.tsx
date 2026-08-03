"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PCFShadowMap } from "three";
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
    <div className="relative flex-1 bg-[#17212b]">
      <Canvas
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 2]}
        camera={{ position: [radius * 1.6, radius * 1.3, radius * 1.6], fov: 45 }}
      >
        <color attach="background" args={["#17212b"]} />
        <ambientLight intensity={0.72} />
        <hemisphereLight args={["#d9eee7", "#17212b", 0.58]} />
        <directionalLight position={[radius * 2, radius * 3, radius]} intensity={1.45} castShadow />
        <directionalLight position={[-radius * 2, radius, -radius]} intensity={0.35} color="#b8d9cc" />

        <TrussSceneContents nodes={nodes} members={members} solved={solved} />
        <gridHelper args={[radius * 4, 20, "#2b6f5d", "#25323c"]} position={[0, -radius - 1, 0]} />
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={2} maxDistance={radius * 8} />
      </Canvas>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-[#111820]/90 px-3 py-2 text-[10px] font-medium text-slate-300">
        Faqat ko‘rish · chap tugma: aylantirish · g‘altak: zoom · o‘ng tugma: surish
      </div>
    </div>
  );
}
