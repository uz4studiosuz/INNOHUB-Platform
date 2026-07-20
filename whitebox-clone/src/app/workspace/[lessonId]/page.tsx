"use client";

import { use, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import StepGuide from "@/components/tutorial/StepGuide";
import Properties from "@/components/editor/Properties";
import Toolbar from "@/components/editor/Toolbar";
import Validator from "@/components/tutorial/Validator";
import { useTutorialStore } from "@/store/tutorialStore";
import { useProjectStore } from "@/store/projectStore";
import lessonsData from "@/content/lessons.json";
import { ArrowLeft, RotateCcw } from "lucide-react";

// Dynamically import the Konva canvas stage with SSR disabled to prevent window/canvas reference errors
const SchemaCanvasClient = dynamic(
  () => import("@/components/2d-canvas/SchemaCanvasClient"),
  { ssr: false }
);

interface WorkspaceParams {
  lessonId: string;
}

export default function WorkspacePage({ params }: { params: Promise<WorkspaceParams> }) {
  // Unwrap Next.js 16 dynamic route params
  const resolvedParams = use(params);
  const { lessonId } = resolvedParams;

  const { loadLessons, selectLesson, resetProgress } = useTutorialStore();
  const { clearElements } = useProjectStore();

  useEffect(() => {
    // Load lessons and select current lesson on mount
    loadLessons(lessonsData as any);
    selectLesson(lessonId);
  }, [lessonId, loadLessons, selectLesson]);

  const handleReset = () => {
    resetProgress();
    clearElements();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080b11] overflow-hidden">
      
      {/* Workspace Header */}
      <header className="h-14 border-b border-[rgba(255,255,255,0.06)] bg-[#0c101b] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link 
            href="/"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-[rgba(255,255,255,0.08)] bg-[#080b11] px-3 py-1.5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span className="h-4 w-[1px] bg-gray-800" />
          <span className="text-xs font-bold text-gray-400">STEM Workspace / IDE</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-white border border-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Qadamni tiklash</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden w-full">
        
        {/* Left: StepGuide Tutorial Box */}
        <aside className="w-80 shrink-0 h-full">
          <StepGuide />
        </aside>

        {/* Center: Interactive Canvas Editor */}
        <main className="flex-1 h-full relative flex flex-col">
          {/* Floating Indicators */}
          <Validator />
          
          <div className="absolute top-4 right-4 z-10">
            <Toolbar />
          </div>

          {/* Konva Stage Render */}
          <div className="flex-1 w-full h-full">
            <SchemaCanvasClient />
          </div>
        </main>

        {/* Right: Selected Component Properties Panel */}
        <aside className="w-72 shrink-0 h-full">
          <Properties />
        </aside>

      </div>
    </div>
  );
}
export type { WorkspaceParams };
