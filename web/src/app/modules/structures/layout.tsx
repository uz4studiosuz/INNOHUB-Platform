"use client";

import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { MODULES } from "../../../components/module-shell/moduleConfig";

export default function StructuresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleWorkspace basePath={MODULES.structures.basePath}>
      {children}
    </ModuleWorkspace>
  );
}
