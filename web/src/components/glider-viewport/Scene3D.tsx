"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { IconBox, IconCamera, IconLayoutSidebarRight, IconView360 } from "@tabler/icons-react";
import { GliderModel } from "./GliderModel";
import { WindTunnel } from "./WindTunnel";
import { useGliderStore } from "../../store/gliderStore";

type CameraPreset = "iso" | "top" | "side";

const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  iso: { position: [48, 32, -66], target: [0, 0, 0] },
  top: { position: [0, 82, -4], target: [0, 0, 0] },
  side: { position: [74, 15, 0], target: [0, 0, 0] },
};

function CameraController({ preset, resetToken }: { preset: CameraPreset; resetToken: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);

  useEffect(() => {
    const next = CAMERA_PRESETS[preset];
    camera.position.set(...next.position);
    camera.up.set(0, 1, 0);
    controlsRef.current?.target.set(...next.target);
    controlsRef.current?.update();
  }, [camera, preset, resetToken]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.07}
      enablePan
      screenSpacePanning
      minDistance={12}
      maxDistance={240}
      maxPolarAngle={Math.PI / 2 + 0.1}
    />
  );
}

export function Scene3D() {
  const activePanel = useGliderStore(state => state.activePanel);
  const analysisModes = ["weight", "lift", "drag", "roll", "pitch", "yaw", "optimization"];
  const isAnalysisMode = activePanel && analysisModes.includes(activePanel);
  const showWindTunnel = isAnalysisMode === true;
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("iso");
  const [resetToken, setResetToken] = useState(0);

  const chooseCamera = (preset: CameraPreset) => {
    setCameraPreset(preset);
    setResetToken((token) => token + 1);
  };

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: "#1a2744" }}>
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-xl border border-white/15 bg-[#101923]/90 p-1 shadow-lg">
        {([
          ["iso", "3D", IconView360],
          ["top", "Yuqori", IconBox],
          ["side", "Yon", IconLayoutSidebarRight],
        ] as const).map(([preset, label, PresetIcon]) => (
          <button key={preset} type="button" onClick={() => chooseCamera(preset)} className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-colors ${cameraPreset === preset ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
            <PresetIcon size={15} stroke={1.8} /> {label}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-[#101923]/85 px-3 py-2 text-[10px] text-slate-300">
        <IconCamera size={14} stroke={1.8} /> Chap tugma: aylantirish, o'ng tugma: surish, g'ildirak: zoom
      </div>

      <Canvas
        shadows
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [70, 40, -100], fov: 45, near: 0.1, far: 1000 }}
      >
        {/* Dark blue environment background */}
        <color attach="background" args={["#1a2744"]} />

        {/* Lighting setup (Three.js Lighting Skill) */}
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#93c5fd", "#1e293b", 0.4]} />
        <directionalLight
          position={[60, 80, -40]}
          intensity={1.8}
          color="#ffffff"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={10}
          shadow-camera-far={400}
          shadow-camera-left={-100}
          shadow-camera-right={100}
          shadow-camera-top={100}
          shadow-camera-bottom={-100}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-40, 20, 60]} intensity={0.6} color="#b0c4de" />
        <directionalLight position={[0, -30, 0]} intensity={0.2} color="#334155" />

        {/* Glider Model */}
        <GliderModel />

        {/* Wind Tunnel Flow Particles (only in analysis modes) */}
        {showWindTunnel && <WindTunnel />}

        {/* Floor grid */}
        <gridHelper args={[300, 30, "#2a3a5c", "#1e2e4a"]} position={[0, -30, 0]} />

        <ContactShadows frames={1} position={[0, -29.8, 0]} opacity={0.32} scale={180} blur={2.5} far={80} color="#07101c" />
        <CameraController preset={cameraPreset} resetToken={resetToken} />
      </Canvas>
    </div>
  );
}
