"use client";

import { RocketNavbar } from "../../../components/rocket-lab/RocketNavbar";
import { RocketSidebar } from "../../../components/rocket-lab/RocketSidebar";
import { RocketDockingStation } from "../../../components/rocket-lab/RocketDockingStation";

export default function RocketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#113854" }}>
      {/* Top Navbar */}
      <RocketNavbar />

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Engineering Sidebar */}
        <RocketSidebar />

        {/* Main Content Area (page.tsx renders here) */}
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>

        {/* Docking Station (renders based on activePanel) */}
        <RocketDockingStation />
      </div>
    </div>
  );
}
