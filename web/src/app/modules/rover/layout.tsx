"use client";

import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { MODULES } from "../../../components/module-shell/moduleConfig";

export default function RoverLayout({ children }: { children: React.ReactNode }) {
  const cfg = MODULES.rover;
  return (
    <ModuleWorkspace basePath={cfg.basePath} accent={cfg.accent}>
      {children}
    </ModuleWorkspace>
  );
}
