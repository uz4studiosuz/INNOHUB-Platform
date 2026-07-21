"use client";

import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { MODULES } from "../../../components/module-shell/moduleConfig";

export default function DroneLayout({ children }: { children: React.ReactNode }) {
  const cfg = MODULES.drone;
  return (
    <ModuleWorkspace basePath={cfg.basePath} accent={cfg.accent}>
      {children}
    </ModuleWorkspace>
  );
}
