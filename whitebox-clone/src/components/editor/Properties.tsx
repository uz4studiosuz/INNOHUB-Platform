"use client";

import { useProjectStore } from "@/store/projectStore";
import { Sliders, Trash2 } from "lucide-react";

export default function Properties() {
  const { elements, selectedId, updateElement, deleteElement } = useProjectStore();
  const selectedElement = elements.find(el => el.id === selectedId);

  if (!selectedElement) {
    return (
      <div className="flex flex-col h-full bg-[#0c101b] border-l border-[rgba(255,255,255,0.06)] p-5">
        <h3 className="font-bold text-sm text-white border-b border-[rgba(255,255,255,0.06)] pb-2.5 mb-6 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-gray-400" />
          <span>Xususiyatlar (Properties)</span>
        </h3>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 text-xs border border-dashed border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
          <span>Tahrirlash uchun ish stolidan biror elementni bosing.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0c101b] border-l border-[rgba(255,255,255,0.06)] overflow-y-auto p-5">
      <h3 className="font-bold text-sm text-white border-b border-[rgba(255,255,255,0.06)] pb-2.5 mb-6 flex items-center gap-2">
        <Sliders className="w-4 h-4 text-blue-500" />
        <span>Xususiyatlar: {selectedElement.type.toUpperCase()}</span>
      </h3>

      <div className="flex flex-col gap-5 flex-1">
        {/* Name input */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Element nomi:</span>
          <input 
            type="text" 
            value={selectedElement.name} 
            onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
            className="bg-[#12192c] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
          />
        </label>

        {/* X coordinate */}
        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wide">
            <span>X koordinata:</span>
            <span className="font-mono text-blue-400 font-semibold">{selectedElement.x} px</span>
          </div>
          <input 
            type="range" 
            min={10} 
            max={600} 
            step={5} 
            value={selectedElement.x} 
            onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
            className="w-full"
          />
        </label>

        {/* Y coordinate */}
        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wide">
            <span>Y koordinata:</span>
            <span className="font-mono text-blue-400 font-semibold">{selectedElement.y} px</span>
          </div>
          <input 
            type="range" 
            min={10} 
            max={400} 
            step={5} 
            value={selectedElement.y} 
            onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
            className="w-full"
          />
        </label>

        {/* Width */}
        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wide">
            <span>Kengligi (Width):</span>
            <span className="font-mono text-blue-400 font-semibold">{selectedElement.width} px</span>
          </div>
          <input 
            type="range" 
            min={20} 
            max={350} 
            step={5} 
            value={selectedElement.width} 
            onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
            className="w-full"
          />
        </label>

        {/* Height */}
        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wide">
            <span>Balandligi (Height):</span>
            <span className="font-mono text-blue-400 font-semibold">{selectedElement.height} px</span>
          </div>
          <input 
            type="range" 
            min={10} 
            max={200} 
            step={5} 
            value={selectedElement.height} 
            onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
            className="w-full"
          />
        </label>
      </div>

      {/* Delete button */}
      <button
        onClick={() => deleteElement(selectedElement.id)}
        className="mt-6 w-full rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs py-2.5 hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        <span>O&apos;chirish</span>
      </button>
    </div>
  );
}
