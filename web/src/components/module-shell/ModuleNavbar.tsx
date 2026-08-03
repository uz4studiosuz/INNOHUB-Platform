"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBook2, IconFileText, IconHelpCircle, IconHome2, IconLogout } from "@tabler/icons-react";

export type ModuleTab = { label: string; segment: string };

export const DEFAULT_MODULE_TABS: ModuleTab[] = [
  { label: "HOME", segment: "home" },
  { label: "RESEARCH", segment: "research" },
  { label: "ENGINEERING", segment: "" },
  { label: "COMPETITION", segment: "competition" },
  { label: "OUTPUTS", segment: "outputs" },
  { label: "BUILD AND TEST", segment: "build-test" },
];

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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-3" style={{ "--module-accent": accent } as React.CSSProperties}>
      <Link href="/" aria-label="Bosh sahifa" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: accent }}>
        <IconHome2 size={19} stroke={1.8} />
      </Link>

      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
        {tabs.map((tab) => (
          <Link
            key={tab.segment}
            href={hrefFor(tab.segment)}
            className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold tracking-[0.025em] transition-colors ${
              isActive(tab.segment)
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
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
