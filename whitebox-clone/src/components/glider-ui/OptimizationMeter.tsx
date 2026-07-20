"use client";

import { useGliderStore } from "@/store/gliderStore";
import { Gauge } from "lucide-react";

export default function OptimizationMeter() {
  const { physics } = useGliderStore();
  
  // Calculate pointer percentage on 0 - 30 scale
  const percentage = Math.min(100, Math.max(0, (physics.liftEfficiency / 30) * 100));

  return (
    <div className="w-full glass-panel border border-[rgba(255,255,255,0.06)] bg-[#0c101b]/80 rounded-2xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Ko&apos;tarish samaradorligi (Lift-to-Drag Ratio)</div>
            <div className="text-[10px] text-gray-500 font-semibold">Aerodinamik nisbat tahlili (maks: 30)</div>
          </div>
        </div>

        {/* Live numerical indicator */}
        <div className="bg-[#090d16] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-1.5 flex flex-col items-end">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">L/D Qiymati</span>
          <span className="text-lg font-extrabold text-blue-400 font-mono leading-none mt-0.5">
            {physics.liftEfficiency.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Meter Bar Container */}
      <div className="relative pt-4 pb-2 px-1">
        {/* Sliding Pointer (Triangle Arrow) */}
        <div 
          className="absolute top-0 transform -translate-x-1/2 transition-all duration-300 ease-out flex flex-col items-center"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-md" />
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-blue-500 mt-0.5" />
        </div>

        {/* Gradient Progress Bar */}
        <div className="h-3 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 border border-[rgba(255,255,255,0.04)]" />

        {/* Notches / Marks */}
        <div className="flex justify-between mt-2.5 text-[9px] font-bold text-gray-600 font-mono">
          <span>0 (Yomon)</span>
          <span>7.5</span>
          <span>15 (O&apos;rtacha)</span>
          <span>22.5</span>
          <span>30 (A&apos;lo)</span>
        </div>
      </div>
    </div>
  );
}
