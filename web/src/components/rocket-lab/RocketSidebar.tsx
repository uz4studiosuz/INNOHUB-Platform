"use client";

import React from "react";
import { useRocketStore, RocketPanelType } from "../../store/rocketStore";
import { Eye, EyeOff, Wrench, RotateCcw } from "lucide-react";

const DESIGN_COMPONENTS: { id: RocketPanelType; label: string }[] = [
  { id: "propulsion", label: "Dvigatel" },
  { id: "recovery", label: "Qutqaruv" },
  { id: "nose", label: "Nos konusi" },
  { id: "conetube", label: "Yuk trubasi" },
  { id: "conetransition", label: "O'tish konusi" },
  { id: "fins", label: "Qanotlar" },
  { id: "designmodel", label: "Dizayn xulosasi" },
];

const ANALYSIS_COMPONENTS: { id: RocketPanelType; label: string }[] = [
  { id: "weight", label: "Massa" },
  { id: "thrust", label: "Tortish kuchi" },
  { id: "drag", label: "Qarshilik" },
  { id: "stability", label: "Barqarorlik" },
];

export function RocketSidebar() {
  const { activePanel, setActivePanel, visibility, toggleVisibility, resetAll, analysis } = useRocketStore();

  const renderItem = (item: { id: RocketPanelType; label: string }, isAnalysis = false) => {
    const isActive = activePanel === item.id;
    const isVisible = visibility[item.id] ?? true;
    // "designmodel" is a summary panel, not a part, so it has nothing to hide.
    const hideable = !isAnalysis && item.id !== "designmodel";

    return (
      <div
        key={item.id}
        className={`flex items-center justify-between px-3 py-2 cursor-pointer border-l-4 transition-colors ${
          isActive ? "bg-white border-orange-500" : "hover:bg-gray-200 border-transparent"
        }`}
        onClick={() => setActivePanel(item.id)}
      >
        <span className={`text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-700"}`}>
          {item.label}
        </span>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className={`p-1 rounded transition-colors ${isActive ? "bg-orange-500 text-white" : "text-gray-400 hover:text-gray-700 hover:bg-gray-300"}`}
            onClick={() => setActivePanel(item.id)}
            title="Sozlash panelini ochish"
          >
            <Wrench size={14} />
          </button>
          {hideable && (
            <button
              className={`p-1 rounded transition-colors hover:bg-gray-300 ${!isVisible ? "text-gray-300" : "text-gray-500"}`}
              onClick={() => toggleVisibility(item.id)}
              title={isVisible ? "3D'da yashirish" : "3D'da ko'rsatish"}
            >
              {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  const statusColor =
    analysis.specStatus === "IN_SPEC" ? "text-green-700 bg-green-50 border-green-200"
      : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="w-60 bg-[#f4f4f4] border-r border-gray-300 flex flex-col shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10 flex-shrink-0 overflow-y-auto custom-scrollbar">
      <div className="bg-[#e0e0e0] px-4 py-1.5 text-[11px] font-extrabold text-gray-500 tracking-[0.09em] text-center border-b border-gray-300">
        MUHANDISLIK
      </div>

      {/* A live verdict at the top, so the student never has to hunt for it. */}
      <div className={`m-2 px-2 py-1.5 rounded border text-[11px] font-bold text-center ${statusColor}`}>
        {analysis.specStatus === "IN_SPEC" ? "TALABGA JAVOB BERADI" : "TALABGA JAVOB BERMAYDI"}
        <div className="font-mono font-normal mt-0.5">
          {analysis.maxHeightM.toFixed(1)} m · {analysis.staticMarginCal.toFixed(2)} kalibr
        </div>
      </div>

      <div className="bg-[#ebebeb] px-4 py-1 text-[11px] text-gray-500 text-center border-y border-gray-300">
        Dizayn
      </div>
      <div className="py-1">{DESIGN_COMPONENTS.map((c) => renderItem(c))}</div>

      <div className="bg-[#ebebeb] px-4 py-1 text-[11px] text-gray-500 text-center border-y border-gray-300">
        Tahlil
      </div>
      <div className="py-1">{ANALYSIS_COMPONENTS.map((c) => renderItem(c, true))}</div>

      <div className="mt-auto p-2 border-t border-gray-300">
        <button
          onClick={() => { if (window.confirm("Butun dizayn standart qiymatlarga qaytariladi. Davom etamizmi?")) resetAll(); }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-gray-600 bg-[#e0e0e0] border border-gray-400 rounded hover:bg-gray-300"
        >
          <RotateCcw size={12} /> HAMMASINI QAYTARISH
        </button>
      </div>
    </div>
  );
}
