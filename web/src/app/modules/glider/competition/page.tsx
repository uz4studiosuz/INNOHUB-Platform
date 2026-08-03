"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useGliderStore, GliderShape } from "../../../../store/gliderStore";
import { GliderModel } from "../../../../components/glider-viewport/GliderModel";

// Bot design generator
function getBotDesign(): GliderShape {
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
    // Scenery, so it only has to look unplanned - but it is generated during
    // render, and Math.random() there makes the horizon jump on every re-render
    // and disagree between server and client. A hash of the index gives the
    // same scatter every time.
    const scatter = (i: number, salt: number) => {
      const h = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return h - Math.floor(h);
    };
    const m = [];
    // Generate a ring of mountains in the distance
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const radius = 6000 + scatter(i, 1) * 2000;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 800 + scatter(i, 2) * 1200;
      m.push({ x, z, height, radius: 1000 + scatter(i, 3) * 800 });
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

      {/* Runway centerline, launch line and low edge lamps keep depth readable. */}
      {Array.from({ length: 48 }, (_, index) => (
        <mesh key={`center-${index}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 760 - index * 160]}>
          <planeGeometry args={[3.5, 82]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, -18]}>
        <planeGeometry args={[112, 5]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>
      {[-55, 55].flatMap((x) => Array.from({ length: 32 }, (_, index) => (
        <mesh key={`lamp-${x}-${index}`} position={[x, 1.15, 720 - index * 240]}>
          <sphereGeometry args={[1.2, 10, 8]} />
          <meshStandardMaterial color="#dbeafe" emissive="#60a5fa" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      )))}

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
  design, isBot, phase, flightTime, flightDistance, objectRef,
}: { 
  design: GliderShape, isBot: boolean, phase: string, flightTime: number, flightDistance: number,
  objectRef?: React.MutableRefObject<THREE.Group | null>,
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
    <group ref={(group) => { groupRef.current = group; if (objectRef) objectRef.current = group; }}>
      {/* Wrapper to scale down the UI model to match arena scale. UI uses mm natively. */}
      <group scale={[0.4, 0.4, 0.4]}>
        <GliderModel designOverride={design} hideUI={true} />
      </group>
    </group>
  );
}

function MainCameraRig({ resetToken }: { resetToken: number }) {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(210, 135, 290);
    camera.up.set(0, 1, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 34, -260);
      controlsRef.current.update();
    }
  }, [camera, resetToken]);
  return <OrbitControls ref={controlsRef} makeDefault target={[0, 34, -260]} enableDamping dampingFactor={0.075} maxPolarAngle={Math.PI / 2 - 0.05} />;
}

function FollowCamera({ targetRef, isBot }: { targetRef: React.MutableRefObject<THREE.Group | null>, isBot: boolean }) {
  const { camera } = useThree();
  const lookAtRef = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    const target = targetRef.current;
    if (!target) return;
    const desiredLook = target.position.clone().add(new THREE.Vector3(0, 2, -18));
    const desiredPosition = target.position.clone().add(new THREE.Vector3(isBot ? 42 : -42, 22, 92));
    const alpha = 1 - Math.exp(-7 * Math.min(delta, 0.05));
    camera.position.lerp(desiredPosition, alpha);
    lookAtRef.current.lerp(desiredLook, alpha);
    camera.lookAt(lookAtRef.current);
  });
  return null;
}

function PipRunway() {
  return (
    <>
      <color attach="background" args={["#9fc3d5"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[80, 130, 40]} intensity={1.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, -1300]}>
        <planeGeometry args={[2500, 4000]} />
        <meshStandardMaterial color="#9a5127" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1300]} receiveShadow>
        <planeGeometry args={[120, 3800]} />
        <meshStandardMaterial color="#25292c" roughness={0.88} />
      </mesh>
      {Array.from({ length: 24 }, (_, index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, -index * 145 - 40]}>
          <planeGeometry args={[3, 72]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      ))}
    </>
  );
}

function PipScene({ design, isBot, phase, flightTime, flightDistance }: { design: GliderShape, isBot: boolean, phase: string, flightTime: number, flightDistance: number }) {
  const targetRef = useRef<THREE.Group | null>(null);
  return (
    <Canvas dpr={[1, 1.35]} camera={{ position: [isBot ? 60 : -60, 50, 110], fov: 48 }} gl={{ antialias: true }}>
      <PipRunway />
      <SimulatedGlider design={design} isBot={isBot} phase={phase} flightTime={flightTime} flightDistance={flightDistance} objectRef={targetRef} />
      <FollowCamera targetRef={targetRef} isBot={isBot} />
    </Canvas>
  );
}


// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export default function CompetitionPage() {
  const store = useGliderStore();
  const metrics = store.getComputedMetrics();
  const botDesign = useMemo(() => getBotDesign(), []);
  
  const [phase, setPhase] = useState<"IDLE" | "LAUNCHING" | "GLIDING" | "LANDED">("IDLE");
  const [cameraResetToken, setCameraResetToken] = useState(0);
  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
  }, []);

  // Simplified Bot Metrics (Pre-calculated roughly)
  const botMetrics = {
    mass: 12.5,
    liftEfficiencyRatio: 22.4,
    flightTimeSec: 4.12,
    specViolations: []
  };

  const startFlight = () => {
    if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
    setPhase("LAUNCHING");
    // Launch phase runs, then after flightTime we could set LANDED, but the component handles animation automatically
    const maxTime = Math.max(metrics.flightTimeSec, botMetrics.flightTimeSec);
    flightTimerRef.current = setTimeout(() => {
      setPhase("LANDED");
    }, maxTime * 1000);
  };

  const resetFlight = () => {
    if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
    setPhase("IDLE");
    setCameraResetToken((token) => token + 1);
  };

  const userFlightDist = metrics.flightTimeSec * 200; // Arbitrary distance scale
  const botFlightDist = botMetrics.flightTimeSec * 200;

  return (
    <div className="flex-1 bg-[#060814] text-white overflow-hidden relative flex">
      {/* 3D ARENA CANVAS */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 1.6]} camera={{ position: [210, 135, 290], fov: 50 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
          <MainCameraRig resetToken={cameraResetToken} />
          
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
              if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
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

      {/* Ikki mustaqil kamera: har biri gliderga real vaqtda ergashadi. */}
      <div className="absolute bottom-5 left-[336px] right-5 flex justify-between gap-5 pointer-events-none">
        {/* Left PIP (User) */}
        <div className="w-[290px] h-[176px] bg-[#101820] border border-slate-500 rounded-lg overflow-hidden relative shadow-2xl">
          <PipScene design={store} isBot={false} phase={phase} flightTime={metrics.flightTimeSec} flightDistance={userFlightDist} />
          <div className="absolute top-2 left-2 bg-[#071018]/85 border border-blue-400/40 rounded px-2 py-1 text-[10px] text-blue-300 font-mono font-bold">CAM 1 · SIZ</div>
          <div className="absolute bottom-2 right-2 bg-[#071018]/80 rounded px-2 py-1 text-[10px] text-slate-200 font-mono">{phase === "LANDED" ? "LANDED" : phase}</div>
        </div>

        {/* Right PIP (Bot) */}
        <div className="w-[290px] h-[176px] bg-[#101820] border border-slate-500 rounded-lg overflow-hidden relative shadow-2xl">
          <PipScene design={botDesign} isBot phase={phase} flightTime={botMetrics.flightTimeSec} flightDistance={botFlightDist} />
          <div className="absolute top-2 left-2 bg-[#071018]/85 border border-slate-400/40 rounded px-2 py-1 text-[10px] text-slate-200 font-mono font-bold">CAM 2 · BOT</div>
          <div className="absolute bottom-2 right-2 bg-[#071018]/80 rounded px-2 py-1 text-[10px] text-slate-200 font-mono">{phase === "LANDED" ? "LANDED" : phase}</div>
        </div>
      </div>
    </div>
  );
}
