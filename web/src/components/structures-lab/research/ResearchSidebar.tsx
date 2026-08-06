"use client";

import { IconFileText } from "@tabler/icons-react";
import { useI18n } from "@/i18n";
import { RESEARCH_GROUPS } from "./sections";
import { researchT } from "./i18n";

export function ResearchSidebar({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const { lang } = useI18n();
  const t = researchT(lang);

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-r border-outline-variant bg-surface-container-low">
      {RESEARCH_GROUPS.map((group) => (
        <div key={group.id}>
          <div className="type-label-m border-y border-outline-variant bg-surface-container px-4 py-2 uppercase text-on-surface-variant">
            {t(group.labelKey)}
          </div>
          <div className="flex flex-col">
            {group.items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onSelect(item.id)}
                  className={`state-layer type-body-m flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-secondary-container font-medium text-on-secondary-container"
                      : "text-on-surface-variant"
                  }`}
                >
                  <span>{t(item.titleKey)}</span>
                  <IconFileText
                    size={15}
                    stroke={1.8}
                    className={isActive ? "" : "text-outline"}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}
