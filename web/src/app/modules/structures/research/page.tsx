"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { ResearchSidebar } from "@/components/structures-lab/research/ResearchSidebar";
import { ResearchContent } from "@/components/structures-lab/research/ResearchContent";
import { researchT } from "@/components/structures-lab/research/i18n";
import {
  RESEARCH_SECTIONS_FLAT,
  DEFAULT_SECTION_ID,
  sectionIndex,
} from "@/components/structures-lab/research/sections";

export default function StructuresResearchPage() {
  const [activeId, setActiveId] = useState(DEFAULT_SECTION_ID);
  const { lang } = useI18n();
  const t = researchT(lang);

  const idx = sectionIndex(activeId);
  const prev = idx > 0 ? RESEARCH_SECTIONS_FLAT[idx - 1] : null;
  const next = idx < RESEARCH_SECTIONS_FLAT.length - 1 ? RESEARCH_SECTIONS_FLAT[idx + 1] : null;

  return (
    <div className="flex min-h-0 flex-1">
      <ResearchSidebar activeId={activeId} onSelect={setActiveId} />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-surface">
        <div className="mx-auto w-full max-w-3xl flex-1 p-8">
          <ResearchContent sectionId={activeId} />
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-outline-variant bg-surface-container-lowest px-8 py-3">
          <button
            type="button"
            onClick={() => prev && setActiveId(prev.id)}
            disabled={!prev}
            className="state-layer type-label-l flex min-w-0 cursor-pointer items-center gap-1 rounded-full px-3 py-2 text-on-surface-variant disabled:pointer-events-none disabled:opacity-38"
          >
            <span className="truncate">
              ← {t("nav.prev")}
              {prev ? `: ${t(prev.titleKey)}` : ""}
            </span>
          </button>
          <button
            type="button"
            onClick={() => next && setActiveId(next.id)}
            disabled={!next}
            className="state-layer type-label-l flex min-w-0 cursor-pointer items-center gap-1 rounded-full px-3 py-2 text-on-surface-variant disabled:pointer-events-none disabled:opacity-38"
          >
            <span className="truncate">
              {t("nav.next")}
              {next ? `: ${t(next.titleKey)}` : ""} →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
