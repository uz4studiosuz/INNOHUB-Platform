"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Group, Line } from "react-konva";
import { PlacedComponent, Wire, ComponentDef } from "./types";

interface SchemaCanvasProps {
  components: PlacedComponent[];
  wires: Wire[];
  onDropComponent: (componentId: string, x: number, y: number) => void;
  onMoveComponent: (instanceId: string, x: number, y: number) => void;
  onConnect: (fromId: string, toId: string) => void;
}

const GRID_SIZE = 20;
const COMP_WIDTH = 100;
const COMP_HEIGHT = 60;

function ComponentShape({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
}: {
  comp: PlacedComponent;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const fill = comp.componentId === "battery" ? "#fef3c7" : "#e0f2fe";

  return (
    <Group
      x={comp.x}
      y={comp.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <Rect
        width={COMP_WIDTH}
        height={COMP_HEIGHT}
        fill={fill}
        stroke={isSelected ? "#2563eb" : "#64748b"}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={6}
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={4}
        shadowOffsetY={2}
      />
      <Text
        x={8}
        y={12}
        text={comp.name}
        fontSize={13}
        fontStyle="bold"
        fill="#1e293b"
        width={COMP_WIDTH - 16}
      />
      <Text
        x={8}
        y={34}
        text={comp.instanceId.slice(0, 6)}
        fontSize={9}
        fill="#94a3b8"
        width={COMP_WIDTH - 16}
      />
    </Group>
  );
}

export default function SchemaCanvas({
  components,
  wires,
  onDropComponent,
  onMoveComponent,
  onConnect,
}: SchemaCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function resize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;
      const comp: ComponentDef = JSON.parse(data);
      const rect = (e.target as HTMLElement)
        .closest(".konva-container")
        ?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.round((e.clientX - rect.left) / GRID_SIZE) * GRID_SIZE;
      const y = Math.round((e.clientY - rect.top) / GRID_SIZE) * GRID_SIZE;
      onDropComponent(comp.id, x, y);
    },
    [onDropComponent]
  );

  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="konva-container flex-1 relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={dimensions.width}
            height={dimensions.height}
            fill="#f8fafc"
          />
        </Layer>
        <Layer>
          {wires.map((wire) => {
            const from = components.find(
              (c) => c.instanceId === wire.fromInstanceId
            );
            const to = components.find(
              (c) => c.instanceId === wire.toInstanceId
            );
            if (!from || !to) return null;
            return (
              <Line
                key={wire.id}
                points={[
                  from.x + COMP_WIDTH / 2,
                  from.y + COMP_HEIGHT / 2,
                  to.x + COMP_WIDTH / 2,
                  to.y + COMP_HEIGHT / 2,
                ]}
                stroke="#475569"
                strokeWidth={2}
                lineCap="round"
              />
            );
          })}
        </Layer>
        <Layer>
          {components.map((comp) => (
            <ComponentShape
              key={comp.instanceId}
              comp={comp}
              isSelected={selectedId === comp.instanceId}
              onSelect={() => setSelectedId(comp.instanceId)}
              onDragEnd={(x, y) => onMoveComponent(comp.instanceId, x, y)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
