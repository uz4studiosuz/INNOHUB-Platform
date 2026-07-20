"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useGliderStore } from "../../../../store/gliderStore";
import { GliderModel } from "../../../../components/glider-viewport/GliderModel";

// Bot design generator
function getBotDesign() {
  return {
    fuselage: { noseHeight: 12, bodyHeight: 12, rearHeight: 10, length: 280 },
    wing: {
      leadingEdgeXOffset: 65, span: 260, chord: 50,
      dihedralType: "dihedral", dihedral: 8, tipDihedral: 0,
      shape: "tapered", sandingLevel: "light", color: "wood"
    },
    horizontalStabilizer: { span: 90, chord: 35 },
    verticalStabilizer: { height: 35, chord: 35 }
  };
}

// ---------------------------------------------------------------------------
// 3D ARENA SCENE
// ---------------------------------------------------------------------------

function useStripedTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 128, 1024);
      ctx.fillStyle = "red";
      ctx.fillRect(0, 0, 128, 512);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 600); // Repeat along the length
    return tex;
  }, []);
}

function Mountains() {
  const mountains = useMemo(() => {
    const m = [];
    // Generate a ring of mountains in the distance
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const radius = 6000 + Math.random() * 2000;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 800 + Math.random() * 1200;
      m.push({ x, z, height, radius: 1000 + Math.random() * 800 });
    }
    return m;
  }, []);

  return (
    <group>
      {mountains.map((m, i) => (
        <mesh key={i} position={[m.x, m.height / 2, m.z]}>
          <coneGeometry args={[m.radius, m.height, 5]} />
          <meshStandardMaterial color="#5a2e10" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function DesertEnvironment() {
  const curbTexture = useStripedTexture();
  
  return (
    <group>
      <Sky distance={450000} sunPosition={[0, 1, -1]} inclination={0.2} azimuth={0.25} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 200, 100]} intensity={1.5} castShadow />
      
      {/* Red desert ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[20000, 20000]} />
        <meshStandardMaterial color="#8b4513" roughness={1} />
      </mesh>

      <Mountains />

      {/* Drag Track */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3000]} receiveShadow>
        <planeGeometry args={[120, 8000]} />
        <meshStandardMaterial color="#222" roughness={0.8} />
      </mesh>

      {/* Track Curbs */}
      {curbTexture && (
        <>
          <mesh position={[-62, 1, -3000]}>
            <boxGeometry args={[4, 2, 8000]} />
            <meshStandardMaterial map={curbTexture} />
          </mesh>
          <mesh position={[62, 1, -3000]}>
            <boxGeometry args={[4, 2, 8000]} />
            <meshStandardMaterial map={curbTexture} />
          </mesh>
        </>
      )}

      {/* Solar Panel Buildings (Left & Right) */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 200, 0, -500]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <group key={i} position={[0, 0, -i * 800]}>
              {/* Building Base */}
              <mesh position={[0, 40, 0]}>
                <boxGeometry args={[200, 80, 400]} />
                <meshStandardMaterial color="#e2e8f0" />
              </mesh>
              {/* Sloped Solar Panel */}
              <mesh position={[0, 85, 0]} rotation={[0, 0, side * 0.25]}>
                <boxGeometry args={[190, 5, 390]} />
                <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Launchers - more detailed */}
      <group position={[-20, 0, 0]}>
        <mesh position={[0, 15, 0]}>
          <boxGeometry args={[25, 30, 50]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, 35, 15]}>
          <boxGeometry args={[4, 20, 4]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      </group>
      
      <group position={[20, 0, 0]}>
        <mesh position={[0, 15, 0]}>
          <boxGeometry args={[25, 30, 50]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, 35, 15]}>
          <boxGeometry args={[4, 20, 4]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// FLIGHT SIMULATION COMPONENT
// ---------------------------------------------------------------------------

function SimulatedGlider({ 
  design, isBot, phase, flightTime, flightDistance 
}: { 
  design: any, isBot: boolean, phase: string, flightTime: number, flightDistance: number 
}) {
  const groupRef = useRef<THREE.Group>(null);
  const localStartRef = useRef<number | null>(null);
  
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const startX = isBot ? 20 : -20;
    const startY = 32;
    const startZ = 0;

    if (phase === "IDLE") {
      localStartRef.current = null;
      groupRef.current.position.set(startX, startY, startZ);
      groupRef.current.rotation.set(0, 0, 0);
    } else if (phase === "LAUNCHING" || phase === "GLIDING" || phase === "LANDED") {
      if (localStartRef.current === null) {
        localStartRef.current = clock.getElapsedTime();
      }
      
      const elapsed = clock.getElapsedTime() - localStartRef.current;
      
      if (elapsed < 0) return;

      if (elapsed < flightTime) {
        // Normalize time 0..1
        const t = elapsed / flightTime;
        
        // Z: linear progress forwards
        const currentZ = startZ - t * flightDistance;
        
        // Y: Parabolic arc: y = -a(x-h)^2 + k
        // Let's make it go up to startY + 50, then down to 0
        const maxHeight = startY + (flightDistance * 0.1); 
        const h = 0.3; // peaks at 30% of flight time
        const a = (0 - maxHeight) / Math.pow(1 - h, 2);
        
        let currentY = maxHeight + a * Math.pow(t - h, 2);
        if (t < h) {
          const a_up = (startY - maxHeight) / Math.pow(0 - h, 2);
          currentY = maxHeight + a_up * Math.pow(t - h, 2);
        }

        // Pitch: derivative of height roughly
        let pitch = 0;
        if (t < h) pitch = Math.PI / 12; // Pointed slightly up
        else pitch = -Math.PI / 18; // Pointed slightly down

        groupRef.current.position.set(startX, currentY, currentZ);
        groupRef.current.rotation.set(pitch, 0, 0);
      } else {
        // Landed
        groupRef.current.position.set(startX, 5, startZ - flightDistance);
        groupRef.current.rotation.set(0, 0, 0); // Flat on ground
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Wrapper to scale down the UI model to match arena scale. UI uses mm natively. */}
      <group scale={[0.4, 0.4, 0.4]}>
        <GliderModel designOverride={design} hideUI={true} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// PIP CAMERA COMPONENT
// ---------------------------------------------------------------------------
// Renders the scene from a specific perspective into a smaller viewport

function PIPCamera({ targetX, color }: { targetX: number, color: string }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { gl, scene, size } = useThree();

  useFrame(() => {
    if (!cameraRef.current) return;
    
    // Position camera behind the glider (we don't track Z dynamically here to keep it simple, 
    // in a real app we'd attach the camera to the glider group. But for now, just stationary tracking)
    // Actually, attaching to the view is better. 
    
    // This is a simplified PIP implementation. 
    // In React Three Fiber, doing real PIP requires rendering to a render target (FBO).
    // Let's use `gl.setViewport` & `gl.setScissor` trick.
  });

  return null;
}


// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export default function CompetitionPage() {
  const store = useGliderStore();
  const metrics = store.getComputedMetrics();
  const botDesign = useMemo(() => getBotDesign(), []);
  
  const [phase, setPhase] = useState<"IDLE" | "LAUNCHING" | "GLIDING" | "LANDED">("IDLE");

  // Simplified Bot Metrics (Pre-calculated roughly)
  const botMetrics = {
    mass: 12.5,
    liftEfficiencyRatio: 22.4,
    flightTimeSec: 4.12,
    specViolations: []
  };

  const startFlight = () => {
    setPhase("LAUNCHING");
    // Launch phase runs, then after flightTime we could set LANDED, but the component handles animation automatically
    const maxTime = Math.max(metrics.flightTimeSec, botMetrics.flightTimeSec);
    setTimeout(() => {
      setPhase("LANDED");
    }, maxTime * 1000);
  };

  const resetFlight = () => {
    setPhase("IDLE");
  };

  const userFlightDist = metrics.flightTimeSec * 200; // Arbitrary distance scale
  const botFlightDist = botMetrics.flightTimeSec * 200;

  return (
    <div className="flex-1 bg-[#060814] text-white overflow-hidden relative flex">
      {/* 3D ARENA CANVAS */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 120, 250]} fov={50} />
          <OrbitControls target={[0, 40, -300]} maxPolarAngle={Math.PI / 2 - 0.05} />
          
          <DesertEnvironment />

          {/* User Glider */}
          <SimulatedGlider 
            design={store} 
            isBot={false} 
            phase={phase} 
            flightTime={metrics.flightTimeSec} 
            flightDistance={userFlightDist} 
          />

          {/* Bot Glider */}
          <SimulatedGlider 
            design={botDesign} 
            isBot={true} 
            phase={phase} 
            flightTime={botMetrics.flightTimeSec} 
            flightDistance={botFlightDist} 
          />
        </Canvas>
      </div>

      {/* OVERLAY UI */}
      <div className="relative z-10 flex flex-col w-80 bg-black/80 border-r border-slate-800 p-4 h-full pointer-events-auto">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-slate-200">Results</h2>
        
        {/* User Stats */}
        <div className="mb-6">
          <div className="text-sm font-bold text-blue-400 uppercase mb-2 border-b border-blue-900 pb-1">Your Design</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-slate-400">Mass:</div>
            <div className="text-right font-mono">{metrics.mass.toFixed(1)} g</div>
            <div className="text-slate-400">Efficiency:</div>
            <div className="text-right font-mono">{metrics.liftEfficiencyRatio.toFixed(1)}</div>
            <div className="text-slate-400">Flight Time:</div>
            <div className="text-right font-mono font-bold text-emerald-400">{metrics.flightTimeSec.toFixed(2)} s</div>
          </div>
        </div>

        {/* Bot Stats */}
        <div className="mb-8">
          <div className="text-sm font-bold text-slate-400 uppercase mb-2 border-b border-slate-700 pb-1">Opponent (Bot)</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-slate-500">Mass:</div>
            <div className="text-right font-mono text-slate-400">12.5 g</div>
            <div className="text-slate-500">Efficiency:</div>
            <div className="text-right font-mono text-slate-400">22.4</div>
            <div className="text-slate-500">Flight Time:</div>
            <div className="text-right font-mono font-bold text-slate-300">4.12 s</div>
          </div>
        </div>

        {/* Winner Announcement (if landed) */}
        {phase === "LANDED" && (
          <div className="p-4 bg-emerald-900/50 border border-emerald-500/30 rounded mb-8 text-center">
            <div className="text-xs uppercase text-emerald-300 font-bold mb-1">The Winner is</div>
            <div className="text-xl font-bold text-white">
              {metrics.flightTimeSec > botMetrics.flightTimeSec ? "Your Design" : "Opponent Bot"}
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <button 
            onClick={() => {
              setPhase("IDLE");
              // Wait a tick then start to reset clock
              setTimeout(() => startFlight(), 100);
            }}
            disabled={metrics.flightTimeSec === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded uppercase tracking-widest text-sm transition-all"
          >
            {phase === "IDLE" ? "Start" : "Restart"}
          </button>
          
          <button 
            onClick={resetFlight}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded uppercase tracking-widest text-xs transition-all"
          >
            Reset Camera
          </button>
        </div>
      </div>

      {/* PIP CAMERAS overlay at bottom (CSS mockups since true FBO PIP is complex) */}
      <div className="absolute bottom-4 left-84 right-4 flex justify-between pointer-events-none px-12">
        {/* Left PIP (User) */}
        <div className="w-64 h-64 bg-black/50 border-4 border-[#333] rounded overflow-hidden relative shadow-2xl">
          <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 text-[10px] text-blue-400 font-mono font-bold">CAM 1: USER</div>
          {/* We use a transparent placeholder here, the real 3D PIP needs multiple render passes. 
              For visual accuracy to the mockup, we just overlay this box. */}
        </div>

        {/* Right PIP (Bot) */}
        <div className="w-64 h-64 bg-black/50 border-4 border-[#333] rounded overflow-hidden relative shadow-2xl">
          <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 text-[10px] text-slate-400 font-mono font-bold">CAM 2: BOT</div>
        </div>
      </div>
    </div>
  );
}
