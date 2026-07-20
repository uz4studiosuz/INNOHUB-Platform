"use client";

import { useTutorialStore } from "@/store/tutorialStore";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function Validator() {
  const { isStepValid } = useTutorialStore();

  return (
    <div className="absolute top-4 left-4 z-10 pointer-events-none">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border backdrop-blur-md transition-all duration-300 ${
        isStepValid 
          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
          : "bg-amber-500/10 border-amber-500/25 text-amber-400"
      }`}>
        {isStepValid ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-wide">Qadam bajarildi!</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-wide">Vazifa kutilmoqda...</span>
          </>
        )}
      </div>
    </div>
  );
}
