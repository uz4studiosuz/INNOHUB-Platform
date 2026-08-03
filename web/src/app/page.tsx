"use client";

import Link from "next/link";
import {
  IconArrowUpRight,
  IconBolt,
  IconCircuitResistor,
  IconBuildingBridge,
  IconCpu,
  IconPlaneTilt,
  IconRobot,
  IconRocket,
} from "@tabler/icons-react";
import { useI18n } from "@/i18n";

const ICON_PROPS = { size: 24, stroke: 1.8 } as const;

const MODULES = [
  { id: "glider", link: "/modules/glider", icon: IconPlaneTilt },
  { id: "rockets", link: "/modules/rockets", icon: IconRocket },
  { id: "electronics", link: "/modules/electronics", icon: IconCircuitResistor },
  { id: "structures", link: "/modules/structures", icon: IconBuildingBridge },
  { id: "hardware", link: "/modules/hardware", icon: IconCpu },
] as const;

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-1 py-4 md:py-8">
      <section className="grid overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-[300px] flex-col justify-center px-7 py-10 md:px-12">
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <IconBolt size={22} stroke={1.8} />
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-[var(--ink)] md:text-5xl">
            {t("dash.title")}
          </h1>
          <p className="mt-4 max-w-[62ch] text-sm leading-6 text-[var(--ink-muted)] md:text-base">
            {t("dash.intro")}
          </p>
        </div>

        <div className="flex flex-col justify-between border-t border-[var(--line)] bg-[var(--surface-muted)] p-7 lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-medium text-[var(--ink-muted)]">{t("dash.engineLabel")}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{t("dash.engineName")}</p>
            </div>
            <IconRobot size={28} stroke={1.6} className="text-[var(--accent)]" />
          </div>
          <div className="mt-12 border-t border-[var(--line-strong)] pt-5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[var(--ink-muted)]">{t("dash.platformStatus")}</span>
              <span className="font-medium text-[var(--accent)]">{t("dash.active")}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
              {t("dash.engineStatus", { n: MODULES.length })}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">{t("dash.modulesHeading")}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{t("dash.modulesHint")}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
          {MODULES.map((module, index) => {
            const ModuleIcon = module.icon;
            return (
              <Link
                key={module.id}
                href={module.link}
                className={`group flex min-h-[210px] flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[0_10px_30px_rgba(24,33,43,0.07)] active:translate-y-0 ${index < 2 ? "lg:col-span-3" : "lg:col-span-2"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--accent)]">
                    <ModuleIcon {...ICON_PROPS} />
                  </div>
                  <span className="rounded-lg border border-[var(--line)] px-2 py-1 text-[10px] font-medium text-[var(--ink-muted)]">
                    {t(`mod.${module.id}.tag`)}
                  </span>
                </div>
                <div className="mt-auto pt-8">
                  <h3 className="text-lg font-semibold text-[var(--ink)]">{t(`mod.${module.id}.title`)}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">
                    {t(`mod.${module.id}.desc`)}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4 text-xs font-semibold text-[var(--accent)]">
                    <span>{t("dash.start")}</span>
                    <IconArrowUpRight size={17} stroke={1.8} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
