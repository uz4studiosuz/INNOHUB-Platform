"use client";

import { StructuresNavbar } from "../../../components/structures-lab/StructuresNavbar";

export default function StructuresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#d0d0d0" }}>
      <StructuresNavbar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
