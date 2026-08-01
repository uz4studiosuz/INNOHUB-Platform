"use client";

import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { RocketModel } from "../../../components/rocket-viewport/RocketModel";
import { useRocketStore } from "../../../store/rocketStore";
import { FinProfileEditor } from "../../../components/rocket-lab/FinProfileEditor";

export default function RocketEngineeringPage() {
  const { analysis, activePanel, fins, updateFins } = useRocketStore();
  // The fin outline is edited on top of the rocket, not off to the side, so the
  // shape and the airframe it belongs to are in the same picture.
  const editingFins = activePanel === "fins";
  // The CG/CP rings are the whole subject of the stability panel, so they come
  // up automatically when it is open, and can be pinned on from the overlay.
  const [pinMarkers, setPinMarkers] = useState(false);
  const showMarkers = pinMarkers || activePanel === "stability";

  return (
    <div className="absolute inset-0 bg-[#0a192f]">
      <Canvas camera={{ position: [70, 30, 70], fov: 42 }} shadows gl={{ antialias: true }}>
        <color attach="background" args={["#0a192f"]} />
        <fog attach="fog" args={["#0a192f", 220, 700]} />

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
          enablePan
          enableZoom
          enableRotate
          minDistance={15}
          maxDistance={260}
          target={[0, 22, 0]}
        />

        <Grid
          infiniteGrid
          fadeDistance={260}
          sectionColor="#2563eb"
          cellColor="#0ea5e9"
          position={[0, -0.01, 0]}
        />

        {/* Nose up, tail on the ground: the way it stands on the pad, and the
            orientation every dimension in the panels is measured in. */}
        <RocketModel showMarkers={showMarkers} />

        <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.9} />
        </GizmoHelper>

        <Environment preset="city" />
      </Canvas>

      {/* Live dimensions, so the 3D view is readable without the side panels. */}
      <div className="absolute top-4 left-4 bg-[#0f2540]/85 backdrop-blur-sm rounded-lg border border-white/10 px-4 py-3 text-xs text-slate-200 font-mono space-y-1 pointer-events-none">
        <div className="font-sans font-bold text-[11px] tracking-wider text-orange-400 mb-1.5">
          O&apos;LCHAMLAR
        </div>
        <div>Uzunlik <span className="text-white">{analysis.bodyLengthMm.toFixed(0)} mm</span></div>
        <div>Diametr <span className="text-white">{analysis.bodyDiameterMm} mm</span></div>
        <div>Massa <span className="text-white">{analysis.totalMassG.toFixed(0)} g</span></div>
        <div className="pt-1 border-t border-white/10 mt-1">
          OM <span className="text-blue-400">{analysis.cgDryMm.toFixed(0)}</span>
          {"  "}BM <span className="text-red-400">{analysis.cpMm.toFixed(0)}</span> mm
        </div>
        <div>
          Zapas{" "}
          <span className={
            analysis.stability === "STABLE" ? "text-green-400"
              : analysis.stability === "MARGINAL" ? "text-amber-400" : "text-red-400"
          }>
            {analysis.staticMarginCal.toFixed(2)} kalibr
          </span>
        </div>
      </div>

      {/* Fin outline, laid over the model while the Fins panel is open. */}
      {editingFins && (
        <FinProfileEditor
          variant="overlay"
          fins={fins}
          onChange={(points) => updateFins({ points })}
        />
      )}

      <button
        onClick={() => setPinMarkers((v) => !v)}
        className={`absolute top-4 right-4 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wide border transition-colors ${
          showMarkers
            ? "bg-orange-500 text-white border-orange-400"
            : "bg-[#0f2540]/85 text-slate-300 border-white/10 hover:text-white"
        }`}
        title="Og'irlik markazi va bosim markazi halqalarini ko'rsatish"
      >
        OM / BM
      </button>
    </div>
  );
}
