"use client";

import { useGliderStore } from "@/store/gliderStore";
import { Sliders, CheckCircle, AlertTriangle } from "lucide-react";

export default function Sidebar() {
  const { wing, physics, isOutOfSpec, setWingParams } = useGliderStore();

  const AR = wing.chord > 0 ? (wing.span / wing.chord).toFixed(2) : "0";

  return (
    <div className="flex flex-col h-full bg-[#0c101b] border-r border-[rgba(255,255,255,0.06)] overflow-y-auto p-5 gap-6">
      
      {/* Sidebar Header */}
      <h3 className="font-bold text-sm text-white border-b border-[rgba(255,255,255,0.06)] pb-2.5 flex items-center gap-2">
        <Sliders className="w-4 h-4 text-blue-500" />
        <span>Glider Parametrlari</span>
      </h3>

      {/* Inputs Form */}
      <div className="flex flex-col gap-5">
        
        {/* Span Slider */}
        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-gray-300">
            <span>Qanot uzunligi (Span)</span>
            <span className="font-mono text-blue-400 font-bold">{wing.span} mm</span>
          </div>
          <input 
            type="range" 
            min={100} 
            max={400} 
            step={5} 
            value={wing.span} 
            onChange={(e) => setWingParams({ span: Number(e.target.value) })}
            className="w-full"
          />
        </label>

        {/* Chord Slider */}
        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-gray-300">
            <span>Qanot kengligi (Chord)</span>
            <span className="font-mono text-blue-400 font-bold">{wing.chord} mm</span>
          </div>
          <input 
            type="range" 
            min={20} 
            max={100} 
            step={2} 
            value={wing.chord} 
            onChange={(e) => setWingParams({ chord: Number(e.target.value) })}
            className="w-full"
          />
        </label>

        {/* Dihedral Angle Slider */}
        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-gray-300">
            <span>V-shakli burchagi (Dihedral)</span>
            <span className="font-mono text-blue-400 font-bold">{wing.dihedralAngle}°</span>
          </div>
          <input 
            type="range" 
            min={-15} 
            max={15} 
            step={0.5} 
            value={wing.dihedralAngle} 
            onChange={(e) => setWingParams({ dihedralAngle: Number(e.target.value) })}
            className="w-full"
          />
        </label>

      </div>

      {/* Live Physical Characteristics Card */}
      <div className="bg-[#090d16] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex flex-col gap-3.5 mt-2">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fizik ko&apos;rsatkichlar</h4>
        
        <div className="flex flex-col gap-2.5 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Aspect Ratio (AR):</span>
            <span className="font-mono text-white font-bold">{AR}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxminiy og&apos;irlik:</span>
            <span className="font-mono text-white font-bold">{physics.weight} g</span>
          </div>
          <div className="flex justify-between">
            <span>Uchish burchagi (Glide):</span>
            <span className="font-mono text-white font-bold">{physics.effectiveAngle}°</span>
          </div>
        </div>
      </div>

      {/* Validation Panel */}
      <div className="mt-auto pt-4">
        {isOutOfSpec ? (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 flex flex-col gap-1.5 shadow-md">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Texnik me&apos;yordan chetlanish!</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Model me&apos;yor doirasida barqaror uchishi uchun parametrlarni quyidagicha to&apos;g&apos;rilang:
              <br />• Uzunlik (Span): 120 - 380 mm
              <br />• Kenglik (Chord): 30 - 90 mm
              <br />• V-burchak (Dihedral): -12° dan 12° gacha
            </p>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-4 flex items-center gap-2.5 shadow-md">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <div>
              <div className="font-bold text-xs">Model mos keladi</div>
              <div className="text-[10px] text-gray-500 font-semibold mt-0.5">Glider barcha STEM talablariga javob beradi.</div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
