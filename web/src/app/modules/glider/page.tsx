"use client";

import { OptimizationPanel } from "../../../components/glider-lab/OptimizationPanel";
import { Scene3D } from "../../../components/glider-viewport/Scene3D";
import { AnalysisView } from "../../../components/glider-lab/AnalysisView";
import { useGliderStore } from "../../../store/gliderStore";

const ANALYSIS_MODES = ["weight", "lift", "drag", "roll", "pitch", "yaw"];

export default function GliderEngineeringPage() {
  const activePanel = useGliderStore(state => state.activePanel);
  const isAnalysisMode = activePanel && ANALYSIS_MODES.includes(activePanel);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Optimization Panel — always visible at top */}
      <OptimizationPanel />

      {/* 3D Canvas Viewport — fills remaining space */}
      <div className="flex-1 min-h-0 relative">
        <Scene3D />

        {/* Analysis overlay panels */}
        {isAnalysisMode && <AnalysisView mode={activePanel} />}
      </div>
    </div>
  );
}
