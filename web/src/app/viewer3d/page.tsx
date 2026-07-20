"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { SceneObject } from "@/components/viewer3d/ThreeScene";

const ThreeScene = dynamic(() => import("@/components/viewer3d/ThreeScene"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">3D Muhit yuklanmoqda...</div>
});

const DEMO_OBJECTS: SceneObject[] = [
  { id: "wheel1", type: "cylinder", position: [-1.2, 0.25, 0], rotation: [0, 0, Math.PI / 2], scale: [0.3, 0.3, 0.1], color: "#334155" },
  { id: "wheel2", type: "cylinder", position: [1.2, 0.25, 0], rotation: [0, 0, Math.PI / 2], scale: [0.3, 0.3, 0.1], color: "#334155" },
  { id: "body", type: "box", position: [0, 0.3, 0], scale: [2.5, 0.3, 0.6], color: "#3b82f6" },
  { id: "wing", type: "wing", position: [0, 0.55, 0], scale: [1.2, 0.8, 0.8], color: "#6366f1" },
];

export default function Viewer3DPage() {
  const [rotation, setRotation] = useState(0);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-4 border-b border-gray-300 bg-gray-50 px-6 py-3">
        <h1 className="text-lg font-bold">3D Visualization</h1>
        <input
          type="range"
          min={0}
          max={360}
          value={rotation}
          onChange={(e) => setRotation(Number(e.target.value))}
          className="w-48"
        />
        <span className="text-sm text-gray-500">Rotate: {rotation}°</span>
      </div>
      <div className="flex-1">
        <ThreeScene
          objects={DEMO_OBJECTS.map((obj) =>
            obj.id === "wing"
              ? { ...obj, rotation: [0, (rotation * Math.PI) / 180, 0] as [number, number, number] }
              : obj
          )}
        />
      </div>
    </div>
  );
}
