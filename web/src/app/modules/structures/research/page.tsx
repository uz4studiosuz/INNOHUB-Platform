"use client";

import { useState } from "react";
import { ResearchSidebar } from "../../../../components/structures-lab/research/ResearchSidebar";
import { ResearchContent } from "../../../../components/structures-lab/research/ResearchContent";
import { RESEARCH_SECTIONS_FLAT, DEFAULT_SECTION_ID, sectionIndex } from "../../../../components/structures-lab/research/sections";

export default function StructuresResearchPage() {
  const [activeId, setActiveId] = useState(DEFAULT_SECTION_ID);

  const idx = sectionIndex(activeId);
  const prev = idx > 0 ? RESEARCH_SECTIONS_FLAT[idx - 1] : null;
  const next = idx < RESEARCH_SECTIONS_FLAT.length - 1 ? RESEARCH_SECTIONS_FLAT[idx + 1] : null;

  return (
    <div className="flex flex-1 min-h-0">
      <ResearchSidebar activeId={activeId} onSelect={setActiveId} />

      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto p-8 flex-1">
          <ResearchContent sectionId={activeId} />
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-3 flex justify-between items-center">
          <button
            onClick={() => prev && setActiveId(prev.id)}
            disabled={!prev}
            className="text-sm font-semibold text-gray-600 disabled:text-gray-300 hover:text-violet-700 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            ← Prev{prev ? `: ${prev.title}` : ""}
          </button>
          <button
            onClick={() => next && setActiveId(next.id)}
            disabled={!next}
            className="text-sm font-semibold text-gray-600 disabled:text-gray-300 hover:text-violet-700 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            Next{next ? `: ${next.title}` : ""} →
          </button>
        </div>
      </div>
    </div>
  );
}
