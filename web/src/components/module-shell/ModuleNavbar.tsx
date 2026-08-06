"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChartDots3,
  IconFileAnalytics,
  IconFlask,
  IconRulerMeasure,
  IconTools,
} from "@tabler/icons-react";
import { useI18n } from "@/i18n";

export type ModuleTab = { label?: string; labelKey?: string; segment: string };

export const DEFAULT_MODULE_TABS: ModuleTab[] = [
  { labelKey: "moduleTab.research", segment: "research" },
  { labelKey: "moduleTab.engineering", segment: "" },
  { labelKey: "moduleTab.outputs", segment: "outputs" },
  { labelKey: "moduleTab.buildTest", segment: "build-test" },
];

const TAB_ICONS: Record<string, typeof IconFlask> = {
  research: IconFlask,
  "": IconRulerMeasure,
  outputs: IconFileAnalytics,
  "build-test": IconTools,
};

export function ModuleNavbar({
  basePath,
  tabs = DEFAULT_MODULE_TABS,
}: {
  basePath: string;
  tabs?: ModuleTab[];
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const hrefFor = (segment: string) => (segment ? `${basePath}/${segment}` : basePath);
  const isActive = (segment: string) =>
    segment === "" ? pathname === basePath : pathname.startsWith(hrefFor(segment));

  return (
    <nav
      aria-label="Modul bosqichlari"
      className="flex h-12 shrink-0 items-stretch gap-1 overflow-x-auto border-b border-outline-variant bg-surface px-2"
    >
      {tabs.map((tab) => {
        const TabIcon = TAB_ICONS[tab.segment] ?? IconChartDots3;
        const active = isActive(tab.segment);
        return (
          <Link
            key={tab.segment}
            href={hrefFor(tab.segment)}
            aria-current={active ? "page" : undefined}
            className={`state-layer type-label-l inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-[3px] px-4 no-underline transition-colors ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant"
            }`}
          >
            <TabIcon size={18} stroke={1.8} />
            {tab.labelKey ? t(tab.labelKey) : tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
