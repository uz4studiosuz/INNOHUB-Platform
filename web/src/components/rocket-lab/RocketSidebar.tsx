"use client";

import React from "react";
import { useRocketStore, RocketPanelType } from "../../store/rocketStore";
import { Eye, EyeOff, Wrench } from "lucide-react";

const DESIGN_COMPONENTS = [
  { id: "propulsion", label: "Propulsion" },
  { id: "recovery", label: "Recovery" },
  { id: "nose", label: "Nose" },
  { id: "conetube", label: "Cone Tube" },
  { id: "conetransition", label: "Cone Transition" },
  { id: "fins", label: "Fins" },
  { id: "designmodel", label: "Design Model" },
];

const ANALYSIS_COMPONENTS = [
  { id: "weight", label: "Weight" },
  { id: "thrust", label: "Thrust" },
  { id: "drag", label: "Drag" },
  { id: "stability", label: "Stability" },
];

export function RocketSidebar() {
  const { activePanel, setActivePanel, visibility, toggleVisibility } = useRocketStore();

  const renderItem = (item: { id: string; label: string }, isAnalysis: boolean = false) => {
    const isActive = activePanel === item.id;
    const isVisible = visibility[item.id] ?? true;

    return (
      <div 
        key={item.id} 
        className={`flex items-center justify-between px-4 py-2 cursor-pointer border-l-4 transition-colors ${
          isActive ? "bg-white border-orange-500" : "hover:bg-gray-100 border-transparent"
        }`}
        onClick={() => setActivePanel(item.id as RocketPanelType)}
      >
        <span className={`text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-700"}`}>
          {item.label}
        </span>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button 
            className={`p-1 rounded transition-colors ${isActive ? "bg-orange-500 text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"}`}
            onClick={() => setActivePanel(item.id as RocketPanelType)}
          >
            <Wrench size={14} />
          </button>
          {!isAnalysis && (
            <button 
              className={`p-1 rounded transition-colors ${!isVisible ? "text-gray-300" : (isActive ? "text-gray-600" : "text-gray-400")} hover:bg-gray-200`}
              onClick={() => toggleVisibility(item.id)}
            >
              {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-64 bg-[#f4f4f4] border-r border-gray-300 flex flex-col shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10 flex-shrink-0 overflow-y-auto">
      <div className="bg-[#e0e0e0] px-4 py-1.5 text-xs font-bold text-gray-500 tracking-wider text-center border-b border-gray-300">
        ENGINEERING
      </div>

      <div className="bg-[#ebebeb] px-4 py-1 text-xs text-gray-500 text-center border-b border-gray-300">
        Design
      </div>
      <div className="py-2">
        {DESIGN_COMPONENTS.map(c => renderItem(c))}
      </div>

      <div className="bg-[#ebebeb] px-4 py-1 text-xs text-gray-500 text-center border-y border-gray-300">
        Analysis
      </div>
      <div className="py-2">
        {ANALYSIS_COMPONENTS.map(c => renderItem(c, true))}
      </div>
    </div>
  );
}
