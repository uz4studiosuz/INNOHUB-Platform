"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBook2,
  IconChartDots3,
  IconFileAnalytics,
  IconFileText,
  IconFlask,
  IconHelpCircle,
  IconHome2,
  IconLogout,
  IconRulerMeasure,
  IconTools,
  IconTrophy,
} from "@tabler/icons-react";

export type ModuleTab = { label: string; segment: string };

export const DEFAULT_MODULE_TABS: ModuleTab[] = [
  { label: "Home", segment: "home" },
  { label: "Research", segment: "research" },
  { label: "Engineering", segment: "" },
  { label: "Competition", segment: "competition" },
  { label: "Outputs", segment: "outputs" },
  { label: "Build & Test", segment: "build-test" },
];

const TAB_ICONS: Record<string, typeof IconHome2> = {
  home: IconHome2,
  research: IconFlask,
  "": IconRulerMeasure,
  competition: IconTrophy,
  outputs: IconFileAnalytics,
  "build-test": IconTools,
};

export function ModuleNavbar({
  basePath,
  tabs = DEFAULT_MODULE_TABS,
  accent = "#126b55",
}: {
  basePath: string;
  tabs?: ModuleTab[];
  accent?: string;
}) {
  const pathname = usePathname();
  const hrefFor = (segment: string) => segment ? `${basePath}/${segment}` : basePath;
  const isActive = (segment: string) => segment === "" ? pathname === basePath : pathname.startsWith(hrefFor(segment));

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-3 md:px-4" style={{ "--module-accent": accent } as React.CSSProperties}>
      <Link href="/" aria-label="Bosh sahifa" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: accent }}>
        <IconHome2 size={19} stroke={1.8} />
      </Link>

      <nav aria-label="Modul bosqichlari" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const TabIcon = TAB_ICONS[tab.segment] ?? IconChartDots3;
          const active = isActive(tab.segment);
          return (
            <Link
              key={tab.segment}
              href={hrefFor(tab.segment)}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-[background,color,transform] active:scale-[0.98] ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
              }`}
            >
              <TabIcon size={17} stroke={1.8} />
              <span>{tab.label}</span>
              {active && <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-[var(--accent)]" />}
            </Link>
          );
        })}
      </nav>

      <nav className="hidden shrink-0 items-center gap-1 lg:flex">
        <UtilityButton label="Journal"><IconBook2 size={17} stroke={1.8} /></UtilityButton>
        <UtilityButton label="File"><IconFileText size={17} stroke={1.8} /></UtilityButton>
        <UtilityButton label="Help"><IconHelpCircle size={17} stroke={1.8} /></UtilityButton>
        <UtilityButton label="Logout" danger><IconLogout size={17} stroke={1.8} /></UtilityButton>
      </nav>
    </header>
  );
}

function UtilityButton({ children, label, danger = false }: { children: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${danger ? "text-[var(--danger)] hover:bg-red-50" : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"}`}>
      {children}
    </button>
  );
}
