"use client";

import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { MODULES } from "../../../components/module-shell/moduleConfig";

export default function ElectronicsLayout({ children }: { children: React.ReactNode }) {
  const cfg = MODULES.electronics;
  return (
    <ModuleWorkspace basePath={cfg.basePath} accent={cfg.accent}>
      {children}
    </ModuleWorkspace>
  );
}
