"use client";

import { EngineeringSidebar } from "../../../components/glider-lab/EngineeringSidebar";
import { DockingStation } from "../../../components/glider-lab/DockingStation";
import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { MODULES } from "../../../components/module-shell/moduleConfig";

export default function GliderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleWorkspace basePath={MODULES.glider.basePath} accent={MODULES.glider.accent}>
      <div className="flex flex-1 min-h-0">
        {/* Engineering Sidebar */}
        <EngineeringSidebar />

        {/* Docking Station (renders based on activePanel) */}
        <DockingStation />

        {/* Main Content Area (page.tsx renders here) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {children}
        </div>
      </div>
    </ModuleWorkspace>
  );
}
