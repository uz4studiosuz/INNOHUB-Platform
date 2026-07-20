"use client";

import { useEffect, useState } from "react";
import { useGliderStore } from "../../store/gliderStore";

function NumericField({ label, value, onChange, unit = "mm" }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="dock-field-row">
      <span className="dock-field-label">{label}</span>
      <input
        type="number"
        className="dock-field-input"
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={unit === "°" ? 1 : (unit === "mm" ? 1 : 0.1)}
      />
      <span className="dock-field-unit">{unit}</span>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="dock-field-row">
      <span className="dock-field-label">{label}</span>
      <select
        className="dock-field-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

const PANEL_ORDER = ["fuselage", "wing", "h-stab", "v-stab"];

export function DockingStation() {
  const store = useGliderStore();
  const { activePanel, setActivePanel } = store;

  // Local state to store initial values for RESET
  const [initialWing, setInitialWing] = useState(store.wing);
  const [initialFuse, setInitialFuse] = useState(store.fuselage);
  const [initialHStab, setInitialHStab] = useState(store.horizontalStabilizer);
  const [initialVStab, setInitialVStab] = useState(store.verticalStabilizer);

  // Sync initial state when panel changes
  useEffect(() => {
    setInitialWing(store.wing);
    setInitialFuse(store.fuselage);
    setInitialHStab(store.horizontalStabilizer);
    setInitialVStab(store.verticalStabilizer);
  }, [activePanel]);

  if (!activePanel || activePanel === "design-model" || activePanel === "optimization") return null;
  // Analysis panels don't show docking station
  const analysisPanels = ["weight", "lift", "drag", "roll", "pitch", "yaw"];
  if (analysisPanels.includes(activePanel)) return null;

  const handleApply = () => {
    // With real-time updates, APPLY is just a visual confirmation.
    // We could briefly highlight the button or just do nothing, as it's already applied.
  };

  const handleReset = () => {
    if (activePanel === "wing") store.updateWing(initialWing);
    if (activePanel === "fuselage") store.updateFuselage(initialFuse);
    if (activePanel === "h-stab") store.updateHStab(initialHStab);
    if (activePanel === "v-stab") store.updateVStab(initialVStab);
  };

  const handleDone = () => {
    setActivePanel(null);
  };

  // Navigate between panels
  const currentIdx = PANEL_ORDER.indexOf(activePanel);
  const goNext = () => {
    if (currentIdx < PANEL_ORDER.length - 1) {
      setActivePanel(PANEL_ORDER[currentIdx + 1]);
    }
  };
  const goPrev = () => {
    if (currentIdx > 0) {
      setActivePanel(PANEL_ORDER[currentIdx - 1]);
    }
  };

  const titleMap: Record<string, string> = {
    "wing": "Wing",
    "fuselage": "Fuselage",
    "h-stab": "Horizontal Stabilizer",
    "v-stab": "Vertical Stabilizer",
  };

  const renderContent = () => {
    switch (activePanel) {
      case "wing":
        return (
          <>
            <div className="dock-component-name">Wing</div>
            <div style={{ padding: "4px 0" }}>
              <div className="dock-field-row" style={{ fontWeight: 700, fontSize: 12, color: "#1e293b", borderBottom: "1px solid #c0c0c0" }}>
                Leading Edge Position
              </div>
              <NumericField label="X Offset" value={store.wing.leadingEdgeXOffset} onChange={(v) => store.updateWing({ leadingEdgeXOffset: v || 0 })} />
              
              <div className="dock-field-row" style={{ fontWeight: 700, fontSize: 12, color: "#1e293b", borderBottom: "1px solid #c0c0c0", marginTop: 4 }}>
                Geometry
              </div>
              <NumericField label="Span" value={store.wing.span} onChange={(v) => store.updateWing({ span: v || 0 })} />
              <NumericField label="Chord" value={store.wing.chord} onChange={(v) => store.updateWing({ chord: v || 0 })} />
              
              <div className="dock-field-row" style={{ fontWeight: 700, fontSize: 12, color: "#1e293b", borderBottom: "1px solid #c0c0c0", marginTop: 4 }}>
                Features
              </div>
              <SelectField label="Shape" value={store.wing.shape} onChange={(v) => store.updateWing({ shape: v as any })} options={[
                { value: "rectangular", label: "Rectangular" },
                { value: "tapered", label: "Tapered" },
                { value: "elliptical", label: "Elliptical" },
              ]} />
              <SelectField label="Sanding Level" value={store.wing.sandingLevel} onChange={(v) => store.updateWing({ sandingLevel: v as any })} options={[
                { value: "none", label: "None" },
                { value: "light", label: "Light" },
                { value: "medium", label: "Medium" },
                { value: "heavy", label: "Heavy" },
              ]} />
              <SelectField label="Dihedral Type" value={store.wing.dihedralType} onChange={(v) => store.updateWing({ dihedralType: v as any })} options={[
                { value: "dihedral", label: "Dihedral" },
                { value: "tipDihedral", label: "Tip Dihedral" },
              ]} />
              <NumericField label="Dihedral" value={store.wing.dihedral} onChange={(v) => store.updateWing({ dihedral: v || 0 })} unit="°" />
              {store.wing.dihedralType === "tipDihedral" && (
                <NumericField label="Tip Dihedral" value={store.wing.tipDihedral} onChange={(v) => store.updateWing({ tipDihedral: v || 0 })} unit="°" />
              )}
              <SelectField label="Color" value={store.wing.color || "wood"} onChange={(v) => store.updateWing({ color: v })} options={[
                { value: "wood", label: "Wood" },
                { value: "painted_red", label: "Painted (Red)" },
                { value: "painted_blue", label: "Painted (Blue)" },
                { value: "painted_white", label: "Painted (White)" },
              ]} />
            </div>
          </>
        );
      case "fuselage":
        return (
          <>
            <div className="dock-component-name">Fuselage</div>
            <div style={{ padding: "4px 0" }}>
              <NumericField label="Length" value={store.fuselage.length} onChange={(v) => store.updateFuselage({ length: v || 0 })} />
              <NumericField label="Nose Height" value={store.fuselage.noseHeight} onChange={(v) => store.updateFuselage({ noseHeight: v || 0 })} />
              <NumericField label="Body Height" value={store.fuselage.bodyHeight} onChange={(v) => store.updateFuselage({ bodyHeight: v || 0 })} />
              <NumericField label="Rear Height" value={store.fuselage.rearHeight} onChange={(v) => store.updateFuselage({ rearHeight: v || 0 })} />
            </div>
          </>
        );
      case "h-stab":
        return (
          <>
            <div className="dock-component-name">Horizontal Stabilizer</div>
            <div style={{ padding: "4px 0" }}>
              <div className="dock-category">Geometry</div>
              <NumericField label="Span" value={store.horizontalStabilizer.span} onChange={(v) => store.updateHStab({ span: v || 0 })} />
              <NumericField label="Chord" value={store.horizontalStabilizer.chord} onChange={(v) => store.updateHStab({ chord: v || 0 })} />
              
              <div className="dock-category" style={{ marginTop: 8 }}>Features</div>
              <SelectField label="Shape" value={store.horizontalStabilizer.shape || "rectangular"} onChange={(v) => store.updateHStab({ shape: v as any })} options={[
                { value: "rectangular", label: "Rectangular" },
                { value: "tapered", label: "Tapered" },
                { value: "elliptical", label: "Elliptical" },
              ]} />
              <SelectField label="Sanding Level" value={store.horizontalStabilizer.sandingLevel || "none"} onChange={(v) => store.updateHStab({ sandingLevel: v as any })} options={[
                { value: "none", label: "None" },
                { value: "light", label: "Light" },
                { value: "medium", label: "Medium" },
                { value: "heavy", label: "Heavy" },
              ]} />
              <SelectField label="Color" value={store.horizontalStabilizer.color || "wood"} onChange={(v) => store.updateHStab({ color: v })} options={[
                { value: "wood", label: "Wood" },
                { value: "painted_red", label: "Painted (Red)" },
                { value: "painted_blue", label: "Painted (Blue)" },
                { value: "painted_white", label: "Painted (White)" },
              ]} />
            </div>
          </>
        );
      case "v-stab":
        return (
          <>
            <div className="dock-component-name">Vertical Stabilizer</div>
            <div style={{ padding: "4px 0" }}>
              <div className="dock-category">Geometry</div>
              <NumericField label="Height" value={store.verticalStabilizer.height} onChange={(v) => store.updateVStab({ height: v || 0 })} />
              <NumericField label="Chord" value={store.verticalStabilizer.chord} onChange={(v) => store.updateVStab({ chord: v || 0 })} />
              
              <div className="dock-category" style={{ marginTop: 8 }}>Features</div>
              <SelectField label="Shape" value={store.verticalStabilizer.shape || "rectangular"} onChange={(v) => store.updateVStab({ shape: v as any })} options={[
                { value: "rectangular", label: "Rectangular" },
                { value: "tapered", label: "Tapered" },
                { value: "elliptical", label: "Elliptical" },
              ]} />
              <SelectField label="Sanding Level" value={store.verticalStabilizer.sandingLevel || "none"} onChange={(v) => store.updateVStab({ sandingLevel: v as any })} options={[
                { value: "none", label: "None" },
                { value: "light", label: "Light" },
                { value: "medium", label: "Medium" },
                { value: "heavy", label: "Heavy" },
              ]} />
              <SelectField label="Color" value={store.verticalStabilizer.color || "wood"} onChange={(v) => store.updateVStab({ color: v })} options={[
                { value: "wood", label: "Wood" },
                { value: "painted_red", label: "Painted (Red)" },
                { value: "painted_blue", label: "Painted (Blue)" },
                { value: "painted_white", label: "Painted (White)" },
              ]} />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <aside style={{
      width: 240,
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid #c0c0c0",
      background: "#ececec",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* WhiteBox-style DOCKING STATION header */}
      <div className="dock-header">
        <div className="dock-header-nav">
          <button onClick={goPrev} disabled={currentIdx <= 0}>◀</button>
          <span>DOCKING STATION</span>
          <button onClick={goNext} disabled={currentIdx >= PANEL_ORDER.length - 1}>▶</button>
        </div>
      </div>

      {/* Tab showing current component */}
      <div style={{
        textAlign: "center",
        padding: "3px 0",
        fontSize: 12,
        fontWeight: 600,
        color: "#475569",
        background: "#ddd",
        borderBottom: "1px solid #c0c0c0",
      }}>
        {titleMap[activePanel] || "Parameters"}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f0f0f0" }}>
        {renderContent()}
      </div>

      {/* Action buttons */}
      <div className="dock-actions">
        <button className="dock-btn" onClick={handleApply}>APPLY</button>
        <button className="dock-btn" onClick={handleReset}>RESET</button>
        <button className="dock-btn" onClick={handleDone}>DONE</button>
      </div>
    </aside>
  );
}
