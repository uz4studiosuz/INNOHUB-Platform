"use client";

import { useMemo, useState } from "react";
import ThreeScene, { SceneObject } from "@/components/viewer3d/ThreeScene";
import { calculateCurrent, calculatePower, voltageDivider } from "@/lib/physics";

export default function IntegrationPage() {
  const [supplyVoltage, setSupplyVoltage] = useState(9);
  const [resistance, setResistance] = useState(1000);
  const [ledVoltage, setLedVoltage] = useState(2.2);

  const results = useMemo(() => {
    const r1 = 220;
    const r2 = resistance;
    const current = calculateCurrent(supplyVoltage, r1 + r2);
    const vR2 = voltageDivider(supplyVoltage, r1, r2);
    const ledCurrent = (supplyVoltage - ledVoltage) / 470;
    const power = calculatePower(supplyVoltage, current);
    return { current, vR2, ledCurrent, power };
  }, [supplyVoltage, resistance, ledVoltage]);

  const sceneObjects: SceneObject[] = useMemo(
    () => [
      {
        id: "battery",
        type: "box",
        position: [-2, 0.3, 0],
        scale: [0.6, 0.6, 0.4],
        color: "#fbbf24",
      },
      {
        id: "resistor1",
        type: "cylinder",
        position: [-0.7, 0.25, 0],
        rotation: [0, 0, Math.PI / 2],
        scale: [0.15, 0.4, 0.15],
        color: "#a78bfa",
      },
      {
        id: "resistor2",
        type: "cylinder",
        position: [0.7, 0.25, 0],
        rotation: [0, 0, Math.PI / 2],
        scale: [0.15, 0.4 * (resistance / 1000), 0.15],
        color: "#818cf8",
      },
      {
        id: "led",
        type: "sphere",
        position: [2, 0.3, 0],
        scale: [0.2, 0.2, 0.2],
        color: "#ef4444",
      },
      {
        id: "wire1",
        type: "box",
        position: [-1.35, 0.05, 0],
        scale: [0.6, 0.05, 0.05],
        color: "#94a3b8",
      },
      {
        id: "wire2",
        type: "box",
        position: [0, 0.05, 0],
        scale: [0.6, 0.05, 0.05],
        color: "#94a3b8",
      },
      {
        id: "wire3",
        type: "box",
        position: [1.35, 0.05, 0],
        scale: [0.6, 0.05, 0.05],
        color: "#94a3b8",
      },
    ],
    [resistance]
  );

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-gray-300 bg-gray-50 px-6 py-3">
        <h1 className="text-lg font-bold">
          Integration Demo — Real-time Circuit Simulation
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <ThreeScene objects={sceneObjects} backgroundColor="#0f172a" />
        </div>

        <aside className="w-80 border-l border-gray-300 bg-gray-50 p-6 overflow-y-auto flex flex-col gap-6">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Supply Voltage: {supplyVoltage}V
            </label>
            <input
              type="range"
              min={1}
              max={24}
              step={0.1}
              value={supplyVoltage}
              onChange={(e) => setSupplyVoltage(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Resistance: {resistance}\u03a9
            </label>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={resistance}
              onChange={(e) => setResistance(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              LED Forward Voltage: {ledVoltage}V
            </label>
            <input
              type="range"
              min={1.2}
              max={4.5}
              step={0.1}
              value={ledVoltage}
              onChange={(e) => setLedVoltage(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="rounded-lg border border-gray-300 bg-white p-4 flex flex-col gap-2">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
              Results
            </h3>
            <div className="flex justify-between">
              <span className="text-sm">Circuit Current:</span>
              <span className="font-mono font-bold">
                {(results.current * 1000).toFixed(2)} mA
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Voltage Divider Out:</span>
              <span className="font-mono font-bold">
                {results.vR2.toFixed(2)} V
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">LED Current:</span>
              <span className="font-mono font-bold">
                {(results.ledCurrent * 1000).toFixed(2)} mA
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total Power:</span>
              <span className="font-mono font-bold">
                {results.power.toFixed(3)} W
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
