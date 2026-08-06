"use client";

import { ModuleNavbar, ModuleTab } from "./ModuleNavbar";

export function ModuleWorkspace({
  basePath,
  tabs,
  children,
}: {
  basePath: string;
  tabs?: ModuleTab[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-on-background">
      <ModuleNavbar basePath={basePath} tabs={tabs} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
