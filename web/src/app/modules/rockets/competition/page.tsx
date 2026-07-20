"use client";

import React, { useState, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { useRocketStore } from "../../../../store/rocketStore";
import { RocketModel } from "../../../../components/rocket-viewport/RocketModel";
import { RocketNavbar } from "../../../../components/rocket-lab/RocketNavbar";
import { StadiumArena } from "../../../../components/rocket-viewport/StadiumArena";
import { DetailedLaunchPad } from "../../../../components/rocket-viewport/DetailedLaunchPad";

import { computeRocketMetrics } from "../../../../lib/physics/rocketPhysics";

const botDesign: any = {
  propulsion: { pressurePsi: 50, waterVolumeL: 0.35, bottleSize: "20oz_coke" },
  recovery: { system: "parachute", parachuteSizeMm: 200 },
  nose: { materialCode: "BT55", ballSizeMm: 38, clayMassG: 20.0 },
  coneTube: { lengthMm: 120.0, diameterMm: 60 },
  coneTransition: { transitionLengthMm: 120.0 },
  fins: { count: 3, shapePoints: 4, spanMm: 40, rootChordMm: 50, tipChordMm: 20, sweepMm: 20, material: "default" },
};

const BOTS = [
  {
    name: "Standard Bot",
    design: botDesign,
    analysis: computeRocketMetrics(botDesign)
  }
];

function SimulatedRocket({ design, analysis, isBot, phase, setFinished }: { design: any, analysis: any, isBot: boolean, phase: string, setFinished: (bot: boolean) => void }) {
  const ref = useRef<THREE.Group>(null);
  const parachuteRef = useRef<THREE.Mesh>(null);
  const flightStartTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const { clock } = useThree();

  useEffect(() => {
    if (phase === "LAUNCHING") {
      flightStartTimeRef.current = clock.getElapsedTime();
      finishedRef.current = false;
    } else if (phase === "STAGING") {
      if (ref.current) ref.current.position.y = 0;
      if (parachuteRef.current) parachuteRef.current.scale.set(0, 0, 0);
      finishedRef.current = false;
    }
  }, [phase, clock]);

  useFrame(() => {
    if (phase !== "LAUNCHING" || !ref.current) return;
    
    const t = clock.getElapsedTime() - flightStartTimeRef.current;
    const { flightPath, deployStatus, ascentTimeS } = analysis;

    if (!flightPath || flightPath.length === 0) return;

    const totalTime = flightPath[flightPath.length - 1].t;

    let currentY = 0;
    
    if (t < 0) {
      currentY = 0;
    } else if (t >= totalTime) {
      // Landed
      currentY = 0;
      if (parachuteRef.current && deployStatus === "Will Deploy") {
         parachuteRef.current.scale.set(0,0,0); // deflate
      }
      if (!finishedRef.current) {
        finishedRef.current = true;
        setFinished(isBot);
      }
    } else {
      // Find interpolation points in flightPath
      let idx = Math.floor(t / 0.01);
      if (idx >= flightPath.length - 1) idx = flightPath.length - 2;
      if (idx < 0) idx = 0;
      
      // Fine-tune index in case of slight dt variations
      while (idx < flightPath.length - 1 && flightPath[idx + 1].t < t) idx++;
      while (idx > 0 && flightPath[idx].t > t) idx--;

      const p1 = flightPath[idx];
      const p2 = flightPath[idx + 1] || p1;
      
      const timeDiff = p2.t - p1.t;
      const fraction = timeDiff > 0 ? (t - p1.t) / timeDiff : 0;
      currentY = p1.h + (p2.h - p1.h) * fraction;
      const currentV = p1.v + (p2.v - p1.v) * fraction;

      if (deployStatus === "Will Deploy") {
        if (currentV < 0) {
          if (parachuteRef.current) {
             const descentT = t - ascentTimeS;
             if (descentT > 0) {
                 const s = Math.min(1, descentT * 2); // open in 0.5s
                 parachuteRef.current.scale.set(s, s, s);
             }
          }
        } else {
          if (parachuteRef.current) parachuteRef.current.scale.set(0,0,0);
        }
      }
    }

    ref.current.position.y = Math.max(0, currentY); // prevent going underground
  });

  return (
    <group ref={ref}>
      <RocketModel designOverride={design} hideUI={true} />
      {/* Simple Parachute Mesh */}
      <mesh ref={parachuteRef} position={[0, 40, 0]} scale={[0,0,0]}>
        <sphereGeometry args={[20, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#fcd34d" side={THREE.DoubleSide} />
        <lineSegments>
          <edgesGeometry args={[new THREE.SphereGeometry(20, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)]} />
          <lineBasicMaterial color="#d97706" />
        </lineSegments>
      </mesh>
    </group>
  );
}

export default function CompetitionPage() {
  const store = useRocketStore();
  const [phase, setPhase] = useState<"STAGING" | "LAUNCHING" | "RESULTS">("STAGING");
  const [finishedCount, setFinishedCount] = useState(0);

  const bot = BOTS[0];
  const playerAnalysis = store.analysis;

  const handleStart = () => {
    setFinishedCount(0);
    setPhase("LAUNCHING");
  };

  const handleFinish = (isBot: boolean) => {
    setFinishedCount(prev => {
      const next = prev + 1;
      if (next >= 2) {
        setPhase("RESULTS");
      }
      return next;
    });
  };

  const determineWinner = () => {
    if (playerAnalysis.specStatus === "OUT_OF_SPEC") return bot.name;
    if (bot.analysis.specStatus === "OUT_OF_SPEC") return "You (Student)";
    
    return playerAnalysis.maxHeightM > bot.analysis.maxHeightM ? "You (Student)" : bot.name;
  };

  return (
    <div className="absolute inset-0 bg-[#f8f8f8] flex flex-col">
      <RocketNavbar />
      
      {/* Top Bar for Competition */}
      <div className="h-16 bg-white border-b border-gray-300 shadow-sm flex items-center justify-between px-8 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Launch Simulation</h2>
          <p className="text-xs text-gray-500">Compare your design against opponents</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setPhase("STAGING")} 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300"
            disabled={phase === "STAGING"}
          >
            RESET
          </button>
          <button 
            onClick={handleStart} 
            className="px-8 py-2 bg-green-500 text-white rounded font-bold shadow hover:bg-green-600"
            disabled={phase !== "STAGING"}
          >
            LAUNCH
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 30, 150], fov: 45 }} shadows gl={{ antialias: true }}>
          <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} target={[0, 20, 0]} />

          <StadiumArena />

          {/* Player Rocket Launch Pad */}
          <group position={[-30, 0, 0]}>
            <DetailedLaunchPad position={[0, 0, 0]} />
            <group position={[0, 10, 0]}>
              <SimulatedRocket design={store} analysis={store.analysis} isBot={false} phase={phase} setFinished={handleFinish} />
            </group>
          </group>

          {/* Bot Rocket Launch Pad */}
          <group position={[30, 0, 0]}>
            <DetailedLaunchPad position={[0, 0, 0]} />
            <group position={[0, 10, 0]}>
              <SimulatedRocket design={bot.design} analysis={bot.analysis} isBot={true} phase={phase} setFinished={handleFinish} />
            </group>
          </group>
        </Canvas>

        {/* Results Overlay */}
        {phase === "RESULTS" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="bg-white rounded-lg shadow-2xl w-[800px] overflow-hidden">
              <div className="bg-gray-800 p-6 text-center">
                <h2 className="text-3xl font-black text-white tracking-widest">RESULTS</h2>
                <div className="mt-2 text-yellow-400 font-bold text-xl">
                  WINNER: {determineWinner()}
                </div>
              </div>
              
              <div className="p-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-sm border-b-2 border-gray-300">
                      <th className="p-3">Metric</th>
                      <th className="p-3">You (Student)</th>
                      <th className="p-3">{bot.name}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    <tr className="border-b border-gray-200">
                      <td className="p-3 text-gray-500">Spec Status</td>
                      <td className={`p-3 ${playerAnalysis.specStatus === "IN_SPEC" ? "text-green-600" : "text-red-600"}`}>
                        {playerAnalysis.specStatus}
                      </td>
                      <td className={`p-3 ${bot.analysis.specStatus === "IN_SPEC" ? "text-green-600" : "text-red-600"}`}>
                        {bot.analysis.specStatus}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 text-gray-500">Deploy Status</td>
                      <td className={`p-3 ${playerAnalysis.deployStatus === "Will Deploy" ? "text-green-600" : "text-red-600"}`}>
                        {playerAnalysis.deployStatus}
                      </td>
                      <td className={`p-3 ${bot.analysis.deployStatus === "Will Deploy" ? "text-green-600" : "text-red-600"}`}>
                        {bot.analysis.deployStatus}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 text-gray-500">Max Height (m)</td>
                      <td className="p-3">{playerAnalysis.maxHeightM.toFixed(2)}</td>
                      <td className="p-3">{bot.analysis.maxHeightM.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 text-gray-500">Burnout Velocity (m/s)</td>
                      <td className="p-3">{playerAnalysis.burnoutVelocityMs.toFixed(2)}</td>
                      <td className="p-3">{bot.analysis.burnoutVelocityMs.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 text-gray-500">Total Flight Time (s)</td>
                      <td className="p-3">{playerAnalysis.totalFlightTimeS.toFixed(2)}</td>
                      <td className="p-3">{bot.analysis.totalFlightTimeS.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-100 p-4 flex justify-end gap-4 border-t border-gray-300">
                <button 
                  onClick={() => setPhase("STAGING")}
                  className="px-6 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
