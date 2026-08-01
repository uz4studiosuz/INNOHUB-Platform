"use client";

import dynamic from "next/dynamic";

/**
 * The 3D Konstruktor was a standalone Vite app; it is ported here whole rather
 * than rewritten, so it stays a single client island.
 *
 * It is loaded with ssr:false on purpose. The scene builds THREE geometry and
 * reads `window` while the module initialises, which has nothing to render on
 * the server and would only cost a hydration mismatch if it tried.
 */
const HardwareApp = dynamic(() => import("@/components/hardware/App"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-sm text-gray-400">
      3D Konstruktor yuklanmoqda…
    </div>
  ),
});

export default function HardwarePage() {
  // The module paints its own full-bleed workspace, so the route only has to
  // give it a positioned box to fill.
  return (
    <div className="relative w-full h-full min-h-[calc(100vh-8rem)]">
      <HardwareApp />
    </div>
  );
}
