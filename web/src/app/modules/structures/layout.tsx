"use client";

import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { STRUCTURES_MODULE_TABS } from "../../../components/module-shell/ModuleNavbar";
import { MODULES } from "../../../components/module-shell/moduleConfig";

export default function StructuresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleWorkspace basePath={MODULES.structures.basePath} tabs={STRUCTURES_MODULE_TABS}>
      {children}
    </ModuleWorkspace>
  );
}
