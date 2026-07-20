"use client";

import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { RocketModel } from "../../../components/rocket-viewport/RocketModel";

export default function RocketEngineeringPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#0a192f]">
      <Canvas
        camera={{ position: [0, 50, 150], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#0a192f"]} />
        <fog attach="fog" args={["#0a192f", 200, 600]} />
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[100, 150, 50]} 
          intensity={1.5} 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-50, -50, -50]} intensity={0.5} />

        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={20}
          maxDistance={300}
          target={[0, 30, 0]}
        />

        <Grid 
          infiniteGrid 
          fadeDistance={300} 
          sectionColor="#2563eb" 
          cellColor="#0ea5e9" 
          position={[0, -20, 0]} 
        />

        <group position={[0, -20, 0]}>
          {/* Rotate the rocket to be horizontal for design view, or keep vertical? Let's keep it horizontal like glider, or vertical since it's a rocket. 
              The screenshot shows it horizontal! "Right-facing".
          */}
          <group rotation={[0, 0, -Math.PI / 2]}>
            <RocketModel />
          </group>
        </group>

        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
