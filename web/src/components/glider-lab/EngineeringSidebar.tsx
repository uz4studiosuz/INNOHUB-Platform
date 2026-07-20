"use client";

import { useGliderStore } from "../../store/gliderStore";

/* ─── SVG Icons (WhiteBox Style) ─── */
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const VisibleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const HiddenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2">
    <circle cx="7" cy="7" r="5" fill="#ef4444" />
  </svg>
);

/* ─── Data ─── */

interface SidebarItem {
  id: string;
  label: string;
  noWrench?: boolean;
}

const DESIGN_ITEMS: SidebarItem[] = [
  { id: "fuselage",     label: "Fuselage" },
  { id: "wing",         label: "Wing" },
  { id: "h-stab",       label: "Horizontal Stabilizer" },
  { id: "v-stab",       label: "Vertical Stabilizer" },
  { id: "design-model", label: "Design Model", noWrench: true },
];

const ANALYSIS_ITEMS: SidebarItem[] = [
  { id: "weight",       label: "Weight" },
  { id: "lift",         label: "Lift" },
  { id: "drag",         label: "Drag" },
  { id: "roll",         label: "Roll" },
  { id: "pitch",        label: "Pitch" },
  { id: "yaw",          label: "Yaw" },
  { id: "optimization", label: "Optimization", noWrench: true },
];

/* ─── Component ─── */

export function EngineeringSidebar() {
  const activePanel = useGliderStore((state) => state.activePanel);
  const setActivePanel = useGliderStore((state) => state.setActivePanel);
  const visibility = useGliderStore((state) => state.visibility);
  const toggleVisibility = useGliderStore((state) => state.toggleVisibility);

  const handleItemClick = (item: SidebarItem) => {
    if (item.noWrench) {
      setActivePanel(null);
    } else {
      setActivePanel(item.id);
    }
  };

  const renderItem = (item: SidebarItem) => {
    const isActive = activePanel === item.id;
    const isVisible = visibility[item.id] !== false;

    return (
      <div key={item.id} className="flex items-center group">
        {/* Main clickable item */}
        <div
          className={`eng-sidebar-item flex-1 ${isActive ? "active" : ""}`}
          onClick={() => handleItemClick(item)}
        >
          <span className="flex-1 truncate">{item.label}</span>
        </div>

        {/* Action buttons — pencil & visibility toggle (WhiteBox style) */}
        <div className={`flex items-center gap-0.5 pr-1 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          {!item.noWrench && (
            <button
              className="eng-sidebar-icon-btn"
              title="Edit"
              onClick={(e) => { e.stopPropagation(); setActivePanel(item.id); }}
            >
              <PencilIcon />
            </button>
          )}
          <button
            className={`eng-sidebar-icon-btn`}
            title={isVisible ? "Hide overlay" : "Show overlay"}
            onClick={(e) => { e.stopPropagation(); toggleVisibility(item.id); }}
          >
            {isVisible ? <VisibleIcon /> : <HiddenIcon />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside style={{
      width: 180,
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid #c0c0c0",
      background: "#e0e0e0",
      flexShrink: 0,
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px 4px",
        fontSize: 13,
        fontWeight: 800,
        color: "#1e293b",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}>
        ENGINEERING
      </div>

      {/* Design Section */}
      <div style={{ padding: "4px 8px" }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#475569",
          padding: "4px 6px 2px",
          textAlign: "center",
          borderBottom: "1px solid #b0b0b0",
          marginBottom: 4,
        }}>
          Design
        </div>
        <div className="flex flex-col gap-0.5">
          {DESIGN_ITEMS.map(renderItem)}
        </div>
      </div>

      {/* Divider */}
      <div style={{ margin: "4px 12px", height: 1, background: "#c0c0c0" }} />

      {/* Analysis Section */}
      <div style={{ padding: "4px 8px" }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#475569",
          padding: "4px 6px 2px",
          textAlign: "center",
          borderBottom: "1px solid #b0b0b0",
          marginBottom: 4,
        }}>
          Analysis
        </div>
        <div className="flex flex-col gap-0.5">
          {ANALYSIS_ITEMS.map(renderItem)}
        </div>
      </div>

      <div className="flex-1" />
    </aside>
  );
}
