"use client";

import { useRef, useState, useEffect } from "react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import { useProjectStore, ProjectElement } from "@/store/projectStore";

export default function SchemaCanvasClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { elements, selectedId, updateElement, selectElement } = useProjectStore();
  const [dimensions, setDimensions] = useState({ width: 600, height: 450 });

  // Handle container resizing to keep stage fitting the workspace
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight || 450,
        });
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleStageClick = (e: any) => {
    // If clicked on stage background, deselect
    if (e.target === e.target.getStage()) {
      selectElement(null);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#090d16] flex items-center justify-center">
      {/* Grid Pattern Background in CSS */}
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        className="cursor-default"
      >
        <Layer>
          {elements.map((el) => {
            const isSelected = el.id === selectedId;
            
            // Layout dimensions
            const w = el.width;
            const h = el.height;
            
            // Stylings
            let fill = "#1e293b";
            let stroke = isSelected ? "#3b82f6" : "#475569";
            
            if (el.type === "chassis") {
              fill = "rgba(59, 130, 246, 0.15)";
              stroke = isSelected ? "#3b82f6" : "#2563eb";
            } else if (el.type === "wheel") {
              fill = "rgba(16, 185, 129, 0.15)";
              stroke = isSelected ? "#10b981" : "#059669";
            } else if (el.type === "axle") {
              fill = "rgba(139, 92, 246, 0.15)";
              stroke = isSelected ? "#8b5cf6" : "#7c3aed";
            }

            return (
              <Group
                key={el.id}
                x={el.x}
                y={el.y}
                draggable
                onClick={() => selectElement(el.id)}
                onTap={() => selectElement(el.id)}
                onDragStart={() => selectElement(el.id)}
                onDragEnd={(e) => {
                  updateElement(el.id, {
                    x: Math.round(e.target.x() / 5) * 5,
                    y: Math.round(e.target.y() / 5) * 5,
                  });
                }}
              >
                {/* Element Geometry rendering */}
                {el.type === "wheel" ? (
                  // Circle for Wheel
                  <>
                    <Circle
                      radius={w / 2}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      shadowColor="rgba(0,0,0,0.3)"
                      shadowBlur={6}
                      shadowOffsetY={2}
                    />
                    <Circle
                      radius={w / 6}
                      fill="#121829"
                      stroke={stroke}
                      strokeWidth={1}
                    />
                  </>
                ) : (
                  // Rectangles for Chassis and Axle
                  <Rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    cornerRadius={el.type === "chassis" ? 8 : 2}
                    shadowColor="rgba(0,0,0,0.3)"
                    shadowBlur={6}
                    shadowOffsetY={2}
                  />
                )}

                {/* Text Label */}
                <Text
                  x={-w / 2}
                  y={el.type === "wheel" ? w / 2 + 6 : h / 2 + 6}
                  text={el.name}
                  fontSize={10}
                  fontStyle="bold"
                  fill={isSelected ? "#ffffff" : "#94a3b8"}
                  align="center"
                  width={w}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
