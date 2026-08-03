"use client";

import Link from "next/link";
import { IconArrowUpRight, IconFlask, IconRulerMeasure, IconTools, IconTrophy } from "@tabler/icons-react";

const STEPS = [
  { segment: "research", title: "Research", icon: IconFlask },
  { segment: "", title: "Engineering", icon: IconRulerMeasure },
  { segment: "competition", title: "Competition", icon: IconTrophy },
  { segment: "build-test", title: "Build & Test", icon: IconTools },
] as const;

export function ModuleHome({ title, intro, basePath, descriptions }: {
  title: string;
  intro: string;
  basePath: string;
  descriptions: readonly [string, string, string, string];
}) {
  return (
    <main className="flex-1 overflow-y-auto bg-[var(--canvas)] px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-5xl">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-[var(--ink)] md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-[68ch] text-base leading-7 text-[var(--ink-muted)]">{intro}</p>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const href = step.segment ? `${basePath}/${step.segment}` : basePath;
            return (
              <Link key={step.segment} href={href} className="group flex min-h-[180px] flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[0_10px_28px_rgba(24,33,43,0.06)] active:translate-y-0">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <StepIcon size={21} stroke={1.8} />
                  </div>
                  <IconArrowUpRight size={18} stroke={1.8} className="text-[var(--ink-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-auto pt-6">
                  <h2 className="text-lg font-semibold text-[var(--ink)]">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{descriptions[index]}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
