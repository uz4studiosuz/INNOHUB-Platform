"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { RocketSidebar } from "../../../components/rocket-lab/RocketSidebar";
import { RocketDockingStation } from "../../../components/rocket-lab/RocketDockingStation";
import { useRocketStore } from "../../../store/rocketStore";
import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { MODULES } from "../../../components/module-shell/moduleConfig";

/**
 * The navbar belongs to the whole section and is rendered exactly once here -
 * the competition and file pages used to render a second copy of their own.
 * The engineering rails (component list and settings panel) only make sense on
 * the design page, so they are mounted for that route alone.
 */
export default function RocketLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesign = pathname === "/modules/rockets";

  return (
    <ModuleWorkspace basePath={MODULES.rockets.basePath}>
      <div className="flex flex-1 min-h-0">
        {isDesign && <RocketSidebar />}
        <main className="flex-1 relative overflow-hidden min-w-0">{children}</main>
        {isDesign && <RocketDockingStation />}
      </div>

      <Toast />
    </ModuleWorkspace>
  );
}

/** Confirms that a button press did something, then gets out of the way. */
function Toast() {
  const { toast, setToast } = useRocketStore();

  React.useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast, setToast]);

  if (!toast) return null;
  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-2xl z-[80]"
      style={{ animation: "fadeIn 0.18s ease-out" }}
    >
      {toast}
    </div>
  );
}
