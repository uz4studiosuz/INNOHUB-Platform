"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping, PCFShadowMap } from "three";
import { TrussNode, TrussMemberDraft, SolvedMember } from "./types";
import { useTrussBounds, TrussSceneContents } from "./trussScene3D";
import { StudioStage } from "./trussStudioScene";

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
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        camera={{ position: [radius * 1.7, radius * 0.9, radius * 2.65], fov: 40, near: 0.1, far: radius * 30 }}
      >
        <StudioStage radius={radius} />
        <TrussSceneContents nodes={nodes} members={members} solved={solved} />
        <OrbitControls
          makeDefault
          target={[0, -radius * 0.12, 0]}
          enableDamping
          dampingFactor={0.075}
          minDistance={Math.max(2, radius * 0.8)}
          maxDistance={radius * 8}
          maxPolarAngle={Math.PI * 0.49}
        />
      </Canvas>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-[#111820]/90 px-3 py-2 text-[10px] font-medium text-slate-300">
        Faqat ko&apos;rish · chap tugma: aylantirish · g&apos;altak: zoom · o&apos;ng tugma: surish
      </div>
    </div>
  );
}
