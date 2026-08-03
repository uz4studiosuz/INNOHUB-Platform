"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping, PCFSoftShadowMap } from "three";
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
        shadows={{ type: PCFSoftShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        camera={{ position: [radius * 1.7, radius * 0.9, radius * 2.65], fov: 40, near: 0.1, far: radius * 30 }}
      >
        <color attach="background" args={["#17212b"]} />
        <fog attach="fog" args={["#17212b", radius * 5.5, radius * 15]} />
        <ambientLight intensity={0.42} />
        <hemisphereLight args={["#e3f1ec", "#293136", 0.78]} />
        <directionalLight
          position={[radius * 2.5, radius * 4, radius * 2]}
          intensity={2.15}
          color="#fff8ea"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.1}
          shadow-camera-far={radius * 12}
          shadow-bias={-0.00015}
        />
        <directionalLight position={[-radius * 2.2, radius * 1.5, radius]} intensity={0.72} color="#b9d9ff" />
        <directionalLight position={[0, radius * 2, -radius * 3]} intensity={0.46} color="#d9eee7" />

        <TrussSceneContents nodes={nodes} members={members} solved={solved} />
        <mesh position={[0, -radius * 1.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[radius * 12, radius * 12]} />
          <meshStandardMaterial color="#222c31" roughness={0.96} metalness={0.02} />
        </mesh>
        <gridHelper args={[radius * 8, 36, "#397565", "#2a3a40"]} position={[0, -radius * 1.075, 0]} />
        <ContactShadows frames={1} position={[0, -radius * 1.065, 0]} opacity={0.38} scale={radius * 6} blur={2.6} far={radius * 4} color="#09100e" />
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
        Faqat ko‘rish · chap tugma: aylantirish · g‘altak: zoom · o‘ng tugma: surish
      </div>
    </div>
  );
}
