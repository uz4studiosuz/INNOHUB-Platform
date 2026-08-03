"use client";

import { EngineeringSidebar } from "../../../components/glider-lab/EngineeringSidebar";
import { DockingStation } from "../../../components/glider-lab/DockingStation";
import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { MODULES } from "../../../components/module-shell/moduleConfig";
import { usePathname } from "next/navigation";

export default function GliderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const engineeringOpen = pathname === MODULES.glider.basePath;

  return (
    <ModuleWorkspace basePath={MODULES.glider.basePath} accent={MODULES.glider.accent}>
      <div className="flex flex-1 min-h-0">
        {engineeringOpen && <EngineeringSidebar />}
        {engineeringOpen && <DockingStation />}

        {/* Main Content Area (page.tsx renders here) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {children}
        </div>
      </div>
    </ModuleWorkspace>
  );
}
