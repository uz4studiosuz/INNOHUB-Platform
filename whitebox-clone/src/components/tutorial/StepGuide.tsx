"use client";

import { useTutorialStore } from "@/store/tutorialStore";
import { useProjectStore } from "@/store/projectStore";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Trophy } from "lucide-react";

export default function StepGuide() {
  const { 
    lessons, 
    currentLessonId, 
    currentStepIndex, 
    validationResults, 
    isStepValid, 
    nextStep, 
    prevStep 
  } = useTutorialStore();

  const { elements } = useProjectStore();
  const runValidation = useTutorialStore((state) => state.runValidation);

  const lesson = lessons.find((l) => l.id === currentLessonId);
  const step = lesson?.steps[currentStepIndex];

  // Re-run validation on every project element change or step change
  useEffect(() => {
    runValidation(elements);
  }, [elements, currentStepIndex, runValidation]);

  if (!lesson || !step) {
    return (
      <div className="p-6 text-gray-500 text-sm">
        Darslik tanlanmagan yoki yuklanmoqda...
      </div>
    );
  }

  const isLastStep = currentStepIndex === lesson.steps.length - 1;

  const handleFinish = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0c101b] border-r border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Lesson Header */}
      <div className="p-5 border-b border-[rgba(255,255,255,0.06)] bg-[#090c14]/80">
        <span className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">
          STEM Interaktiv Dars
        </span>
        <h2 className="text-base font-extrabold text-white mt-1 leading-snug">
          {lesson.title}
        </h2>
        <div className="flex gap-1.5 mt-3">
          {lesson.steps.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                idx === currentStepIndex 
                  ? "bg-blue-500" 
                  : idx < currentStepIndex 
                    ? "bg-emerald-500" 
                    : "bg-gray-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
            {currentStepIndex + 1}-Qadam ({lesson.steps.length} dan)
          </span>
          <h3 className="text-lg font-bold text-white mt-1">
            {step.title}
          </h3>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed bg-[#0f1423]/50 border border-[rgba(255,255,255,0.04)] rounded-xl p-3.5">
            {step.description}
          </p>
        </div>

        {/* Validation Checklist */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
            Topshiriq mezonlari:
          </span>
          
          <div className="flex flex-col gap-2.5">
            {step.validationRules.map((rule) => {
              const isValid = validationResults[rule.id] || false;
              return (
                <div 
                  key={rule.id} 
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-xs ${
                    isValid 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300" 
                      : "bg-[#111625]/60 border-[rgba(255,255,255,0.05)] text-gray-400"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/10" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <span className="leading-tight">{rule.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#090c14] flex gap-3">
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="flex items-center justify-center p-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)] disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {isLastStep ? (
          <button
            onClick={handleFinish}
            disabled={!isStepValid}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white text-xs font-bold py-2.5 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:from-emerald-800 disabled:to-teal-800 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95"
          >
            <Trophy className="w-4 h-4" />
            <span>Darsni yakunlash</span>
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!isStepValid}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-xs font-bold py-2.5 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-40 transition-all shadow-lg shadow-blue-500/10 cursor-pointer active:scale-95"
          >
            <span>Keyingi qadam</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
