"use client";

import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { MODULES } from "../../../components/module-shell/moduleConfig";

const HARDWARE_TABS = [{ labelKey: "nav.hardware", segment: "" }];

export default function HardwareLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleWorkspace basePath={MODULES.hardware.basePath} accent={MODULES.hardware.accent} tabs={HARDWARE_TABS}>
      {children}
    </ModuleWorkspace>
  );
}
