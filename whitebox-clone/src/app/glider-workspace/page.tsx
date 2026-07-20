"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Sidebar from "@/components/glider-ui/Sidebar";
import OptimizationMeter from "@/components/glider-ui/OptimizationMeter";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useGliderStore } from "@/store/gliderStore";

// Dynamically import 3D Canvas Viewport to prevent SSR canvas document object lookup errors during builds
const Scene3D = dynamic(
  () => import("@/components/glider-viewport/Scene3D"),
  { ssr: false }
);

export default function GliderWorkspacePage() {
  const { setWingParams } = useGliderStore();

  const handleReset = () => {
    setWingParams({ span: 200, chord: 50, dihedralAngle: 0 });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080b11] overflow-hidden text-[#f8fafc]">
      
      {/* Workspace Header */}
      <header className="h-16 border-b border-[rgba(255,255,255,0.06)] bg-[#0c101b] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-[rgba(255,255,255,0.08)] bg-[#080b11] px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Chiqish</span>
          </Link>
          <span className="h-4 w-[1px] bg-gray-800" />
          <div>
            <h1 className="text-sm font-extrabold text-white leading-tight">Glider Yig&apos;ish & Optimizatsiya</h1>
            <span className="text-[9px] block text-blue-500 font-bold uppercase tracking-wider">3D STEM Simulyator</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-white border border-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Modelni tiklash</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col overflow-hidden w-full p-6 gap-6">
        
        {/* Top: Optimization Meter */}
        <section className="shrink-0">
          <OptimizationMeter />
        </section>

        {/* Bottom Split Layout */}
        <div className="flex-1 flex gap-6 overflow-hidden w-full">
          
          {/* Left panel: parameters controls (30% width) */}
          <aside className="w-80 shrink-0 h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl">
            <Sidebar />
          </aside>

          {/* Right panel: 3D interactive viewport (70% width) */}
          <main className="flex-1 h-full relative">
            <Scene3D />
          </main>

        </div>

      </div>

    </div>
  );
}
