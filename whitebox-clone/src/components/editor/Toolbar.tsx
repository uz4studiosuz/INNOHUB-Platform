"use client";

import { useProjectStore } from "@/store/projectStore";
import { Box, Disc, Minus } from "lucide-react";

export default function Toolbar() {
  const { addElement } = useProjectStore();

  const tools = [
    {
      type: "chassis" as const,
      label: "Chassis (Korpus)",
      icon: Box,
      color: "from-blue-600 to-cyan-600",
      description: "Asosiy tana qismi"
    },
    {
      type: "wheel" as const,
      label: "Wheel (G'ildirak)",
      icon: Disc,
      color: "from-emerald-600 to-teal-600",
      description: "Harakatlantiruvchi qism"
    },
    {
      type: "axle" as const,
      label: "Axle (O'q)",
      icon: Minus,
      color: "from-violet-600 to-purple-600",
      description: "Ulovchi o'q"
    }
  ];

  return (
    <div className="flex gap-3 bg-[#0d1220]/75 border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 shadow-xl backdrop-blur-md">
      {tools.map((t, idx) => (
        <button
          key={idx}
          onClick={() => addElement(t.type, 150 + idx * 40, 100 + idx * 20)}
          className="group flex items-center gap-2.5 bg-[#090c14] border border-[rgba(255,255,255,0.05)] rounded-xl px-4 py-2 hover:border-blue-500/30 transition-all cursor-pointer hover:bg-[#121829] active:scale-95"
        >
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${t.color} flex items-center justify-center text-white shadow-md`}>
            <t.icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
              {t.label}
            </div>
            <div className="text-[9px] text-gray-500 font-semibold">{t.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
