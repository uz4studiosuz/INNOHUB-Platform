"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import ComponentPanel from "@/components/editor2d/ComponentPanel";
import { PlacedComponent, Wire, ComponentDef } from "@/components/editor2d/types";

const SchemaCanvas = dynamic(() => import("@/components/editor2d/SchemaCanvas"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">Sxema muharriri yuklanmoqda...</div>
});
import { AVAILABLE_COMPONENTS } from "@/components/editor2d/components";

let nextId = 1;
function genId(): string {
  return `comp_${nextId++}`;
}

let wireId = 1;
function genWireId(): string {
  return `wire_${wireId++}`;
}

export default function Editor2DPage() {
  const [components, setComponents] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);

  const handleDropComponent = useCallback(
    (componentId: string, x: number, y: number) => {
      const compDef = AVAILABLE_COMPONENTS.find((c) => c.id === componentId);
      if (!compDef) return;

      const params: Record<string, number | string> = {};
      for (const [key, def] of Object.entries(compDef.parameters)) {
        params[key] = def.default;
      }

      const newComp: PlacedComponent = {
        instanceId: genId(),
        componentId: compDef.id,
        name: compDef.name,
        x,
        y,
        rotation: 0,
        parameters: params,
      };
      setComponents((prev) => [...prev, newComp]);
    },
    []
  );

  const handleMoveComponent = useCallback(
    (instanceId: string, x: number, y: number) => {
      setComponents((prev) =>
        prev.map((c) => (c.instanceId === instanceId ? { ...c, x, y } : c))
      );
    },
    []
  );

  const handleConnect = useCallback((fromId: string, toId: string) => {
    setWires((prev) => [
      ...prev,
      {
        id: genWireId(),
        fromInstanceId: fromId,
        fromPin: 0,
        toInstanceId: toId,
        toPin: 0,
      },
    ]);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <ComponentPanel onDragStart={() => {}} />
      <SchemaCanvas
        components={components}
        wires={wires}
        onDropComponent={handleDropComponent}
        onMoveComponent={handleMoveComponent}
        onConnect={handleConnect}
      />
    </div>
  );
}
