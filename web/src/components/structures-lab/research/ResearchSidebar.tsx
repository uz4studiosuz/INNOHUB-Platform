"use client";

import { RESEARCH_GROUPS } from "./sections";

export function ResearchSidebar({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="w-72 shrink-0 h-full overflow-y-auto bg-[#f3f3f3] border-r border-gray-300">
      {RESEARCH_GROUPS.map((group) => (
        <div key={group.id}>
          <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-[#e4e4e4] border-y border-gray-300">
            {group.label}
          </div>
          <div className="flex flex-col">
            {group.items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`flex items-center justify-between gap-2 text-left px-4 py-1.5 text-[13px] transition-colors cursor-pointer ${
                    isActive
                      ? "bg-orange-500 text-white font-bold"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span>{item.title}</span>
                  <span className={isActive ? "text-white" : "text-gray-400"}>📄</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}
