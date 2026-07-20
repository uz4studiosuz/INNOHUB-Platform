"use client";

import { GliderNavbar } from "../../../components/glider-lab/GliderNavbar";
import { EngineeringSidebar } from "../../../components/glider-lab/EngineeringSidebar";
import { DockingStation } from "../../../components/glider-lab/DockingStation";

export default function GliderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#d0d0d0" }}>
      {/* Top Navbar */}
      <GliderNavbar />

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Engineering Sidebar */}
        <EngineeringSidebar />

        {/* Docking Station (renders based on activePanel) */}
        <DockingStation />

        {/* Main Content Area (page.tsx renders here) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
