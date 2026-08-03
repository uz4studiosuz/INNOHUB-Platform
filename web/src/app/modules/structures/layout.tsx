"use client";

import { ModuleWorkspace } from "../../../components/module-shell/ModuleWorkspace";
import { MODULES } from "../../../components/module-shell/moduleConfig";

const STRUCTURE_TABS = [
  { label: "HOME", segment: "home" },
  { label: "RESEARCH", segment: "research" },
  { label: "ENGINEERING", segment: "" },
  { label: "TRUCK RALLY", segment: "competition" },
  { label: "OUTPUTS", segment: "outputs" },
  { label: "BUILD AND TEST", segment: "build-test" },
];

export default function StructuresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleWorkspace basePath={MODULES.structures.basePath} accent={MODULES.structures.accent} tabs={STRUCTURE_TABS}>
      {children}
    </ModuleWorkspace>
  );
}
