"use client";

import React, { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { GliderModel } from "./GliderModel";
import { WindTunnel } from "./WindTunnel";
import * as THREE from "three";
import { useGliderStore } from "../../store/gliderStore";

function CameraController() {
  const { activePanel } = useGliderStore();
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (activePanel === "wing") {
      // Top-down view for wing editing
      camera.position.set(0, 120, -30);
      camera.lookAt(0, 0, 0);
    } else if (activePanel === "fuselage") {
      // Side view
      camera.position.set(100, 20, 0);
      camera.lookAt(0, 0, 0);
    } else if (activePanel === "h-stab" || activePanel === "v-stab") {
      // Rear view
      camera.position.set(40, 30, 80);
      camera.lookAt(0, 0, 20);
    } else {
      // Default isometric view (WhiteBox style)
      camera.position.set(70, 40, -100);
      camera.lookAt(0, 0, 0);
    }
  }, [activePanel, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.07}
      minDistance={20}
      maxDistance={350}
      maxPolarAngle={Math.PI / 2 + 0.1}
    />
  );
}

export function Scene3D() {
  const activePanel = useGliderStore(state => state.activePanel);
  const analysisModes = ["weight", "lift", "drag", "roll", "pitch", "yaw", "optimization"];
  const isAnalysisMode = activePanel && analysisModes.includes(activePanel);
  const showWindTunnel = isAnalysisMode === true;

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: "#1a2744" }}>
      {/* Minimal mode indicator */}
      <div style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 10,
        pointerEvents: "none",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: "#64748b",
        background: "rgba(0, 0, 0, 0.4)",
        padding: "4px 8px",
        borderRadius: 4,
      }}>
        {activePanel ? activePanel.toUpperCase() : "DESIGN"}
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

        {/* Postprocessing Bloom & Vignette Effects (Three.js Postprocessing Skill) */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.2} intensity={showWindTunnel ? 0.8 : 0.3} />
          <Vignette eskil={false} offset={0.15} darkness={0.5} />
        </EffectComposer>

        <CameraController />
      </Canvas>
    </div>
  );
}
