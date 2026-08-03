"use client";

import type { ComponentType } from "react";
import {
  IconAdjustmentsHorizontal,
  IconAirBalloon,
  IconArrowsUp,
  IconAxisX,
  IconAxisY,
  IconEye,
  IconEyeOff,
  IconFeather,
  IconPencil,
  IconPlaneTilt,
  IconScale,
  IconWind,
} from "@tabler/icons-react";
import { useGliderStore } from "../../store/gliderStore";

interface SidebarItem {
  id: string;
  label: string;
  hint: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  readOnly?: boolean;
}

const DESIGN_ITEMS: SidebarItem[] = [
  { id: "fuselage", label: "Fyuzelyaj", hint: "Uzunlik va korpus profili", icon: IconAirBalloon },
  { id: "wing", label: "Asosiy qanot", hint: "Kenglik, xorda va dihedral", icon: IconPlaneTilt },
  { id: "h-stab", label: "Gorizontal dum", hint: "Pitch barqarorlik yuzasi", icon: IconFeather },
  { id: "v-stab", label: "Vertikal dum", hint: "Yaw barqarorlik yuzasi", icon: IconAxisY },
];

const ANALYSIS_ITEMS: SidebarItem[] = [
  { id: "weight", label: "Og'irlik", hint: "Massa taqsimoti", icon: IconScale },
  { id: "lift", label: "Ko'tarish", hint: "Qanot samaradorligi", icon: IconArrowsUp },
  { id: "drag", label: "Qarshilik", hint: "Aerodinamik qarshilik", icon: IconWind },
  { id: "roll", label: "Roll", hint: "Yon barqarorlik", icon: IconAxisX },
  { id: "pitch", label: "Pitch", hint: "Og'irlik va neytral nuqta", icon: IconFeather },
  { id: "yaw", label: "Yaw", hint: "Yo'nalish barqarorligi", icon: IconAxisY },
  { id: "optimization", label: "Optimallashtirish", hint: "Umumiy dizayn holati", icon: IconAdjustmentsHorizontal, readOnly: true },
];

export function EngineeringSidebar() {
  const activePanel = useGliderStore((state) => state.activePanel);
  const setActivePanel = useGliderStore((state) => state.setActivePanel);
  const visibility = useGliderStore((state) => state.visibility);
  const toggleVisibility = useGliderStore((state) => state.toggleVisibility);

  const renderItem = (item: SidebarItem, allowVisibility: boolean) => {
    const active = activePanel === item.id;
    const visible = visibility[item.id] !== false;
    const ItemIcon = item.icon;
    return (
      <div key={item.id} className="group flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActivePanel(active ? null : item.id)}
          aria-pressed={active}
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink)] hover:bg-[var(--surface-muted)]"}`}
        >
          <ItemIcon size={18} stroke={1.7} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">{item.label}</span>
            <span className={`block truncate text-[10px] font-normal ${active ? "text-[var(--accent)] opacity-75" : "text-[var(--ink-muted)]"}`}>{item.hint}</span>
          </span>
          {!item.readOnly && <IconPencil size={14} stroke={1.8} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />}
        </button>
        {allowVisibility && (
          <button
            type="button"
            aria-label={visible ? `${item.label}ni yashirish` : `${item.label}ni ko'rsatish`}
            title={visible ? "Komponentni yashirish" : "Komponentni ko'rsatish"}
            onClick={() => toggleVisibility(item.id)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
          >
            {visible ? <IconEye size={16} stroke={1.7} /> : <IconEyeOff size={16} stroke={1.7} />}
          </button>
        )}
      </div>
    );
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-[var(--line)] bg-[var(--surface)] md:flex">
      <div className="border-b border-[var(--line)] px-4 py-4">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Planyor muhandisligi</h2>
        <p className="mt-1 text-[11px] leading-4 text-[var(--ink-muted)]">Tahrirlash uchun komponentni yoki aerodinamik tahlilni tanlang.</p>
      </div>

      <div className="px-2.5 py-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">Korpus</p>
        <div className="space-y-1">{DESIGN_ITEMS.map((item) => renderItem(item, true))}</div>
      </div>

      <div className="mx-4 border-t border-[var(--line)]" />

      <div className="px-2.5 py-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">Tahlil</p>
        <div className="space-y-1">{ANALYSIS_ITEMS.map((item) => renderItem(item, false))}</div>
      </div>
    </aside>
  );
}
