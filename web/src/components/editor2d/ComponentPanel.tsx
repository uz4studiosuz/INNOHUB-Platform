"use client";

import { ComponentDef } from "./types";
import { AVAILABLE_COMPONENTS } from "./components";

interface ComponentPanelProps {
  onDragStart: (component: ComponentDef) => void;
}

export default function ComponentPanel({ onDragStart }: ComponentPanelProps) {
  return (
    <aside className="w-64 border-r border-gray-300 bg-gray-50 p-4 overflow-y-auto flex flex-col gap-2">
      <h2 className="text-lg font-bold mb-2">Components</h2>
      {AVAILABLE_COMPONENTS.map((comp) => (
        <button
          key={comp.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/json", JSON.stringify(comp));
            onDragStart(comp);
          }}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-blue-50 hover:border-blue-400 cursor-grab active:cursor-grabbing"
        >
          <div className="font-semibold">{comp.name}</div>
          <div className="text-xs text-gray-500">{comp.type}</div>
        </button>
      ))}
    </aside>
  );
}
