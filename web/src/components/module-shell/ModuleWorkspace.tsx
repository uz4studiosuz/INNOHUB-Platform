"use client";

import { ModuleNavbar, ModuleTab } from "./ModuleNavbar";

export function ModuleWorkspace({
  basePath,
  tabs,
  accent,
  children,
}: {
  basePath: string;
  tabs?: ModuleTab[];
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#d0d0d0" }}>
      <ModuleNavbar basePath={basePath} tabs={tabs} accent={accent} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
