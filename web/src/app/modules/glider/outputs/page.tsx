"use client";

import Link from "next/link";
import { IconAlertTriangle, IconArrowRight, IconCircleCheck, IconFileAnalytics, IconRulerMeasure, IconScale, IconShieldCheck } from "@tabler/icons-react";
import { useGliderStore } from "../../../../store/gliderStore";
import { SPEC_LIMITS } from "../../../../lib/physics/gliderPhysics";

type SpecKey = keyof typeof SPEC_LIMITS;

const SPEC_LABELS: Record<SpecKey, string> = {
  wingSpan: "Qanot kengligi",
  wingChord: "Qanot xordasi",
  wingTrueLength: "Qanot haqiqiy uzunligi",
  fuselageLength: "Fyuzelyaj uzunligi",
  hStabSpan: "Gorizontal dum kengligi",
  hStabChord: "Gorizontal dum xordasi",
  vStabHeight: "Vertikal dum balandligi",
  vStabChord: "Vertikal dum xordasi",
  mass: "Planyor massasi",
  liftEfficiency: "Ko'tarish samaradorligi",
  effectiveDihedral: "Samarali dihedral",
  hsToWarRatio: "H-dum / qanot yuzasi",
  vhStabRatio: "V/H dum yuzasi",
  cgChordFraction: "Og'irlik markazi / xorda",
  staticMargin: "Statik zaxira",
};

export default function OutputsPage() {
  const store = useGliderStore();
  const metrics = store.getComputedMetrics();
  const groups: { title: string; icon: typeof IconScale; items: { key: SpecKey; value: number }[] }[] = [
    {
      title: "Korpus geometriyasi", icon: IconRulerMeasure, items: [
        { key: "wingSpan", value: store.wing.span }, { key: "wingChord", value: store.wing.chord },
        { key: "wingTrueLength", value: metrics.wingTrueLength }, { key: "fuselageLength", value: store.fuselage.length },
        { key: "hStabSpan", value: store.horizontalStabilizer.span }, { key: "vStabHeight", value: store.verticalStabilizer.height },
      ],
    },
    {
      title: "Samaradorlik", icon: IconScale, items: [
        { key: "mass", value: metrics.mass }, { key: "liftEfficiency", value: metrics.liftEfficiencyRatio },
        { key: "effectiveDihedral", value: metrics.effectiveDihedral }, { key: "hsToWarRatio", value: metrics.hsToWingAreaRatio },
      ],
    },
    {
      title: "Barqarorlik", icon: IconShieldCheck, items: [
        { key: "vhStabRatio", value: metrics.vhStabAreaRatio }, { key: "cgChordFraction", value: metrics.cgChordFraction },
        { key: "staticMargin", value: metrics.staticMarginMm },
      ],
    },
  ];
  const issues = groups.flatMap((group) => group.items).filter(({ key, value }) => value < SPEC_LIMITS[key].min || value > SPEC_LIMITS[key].max);

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--canvas)] px-4 py-7 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><IconFileAnalytics size={22} stroke={1.7} /></div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[var(--ink)] md:text-4xl">Dizayn natijalari</h1>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">Joriy planyor geometriyasi, ishlash ko‘rsatkichlari va limitlar.</p>
          </div>
          <div className={`flex items-center gap-2 self-start rounded-xl border px-4 py-3 text-sm font-semibold ${issues.length ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {issues.length ? <IconAlertTriangle size={19} stroke={1.8} /> : <IconCircleCheck size={19} stroke={1.8} />}
            {issues.length ? `${issues.length} ta qiymat limitdan tashqarida` : "Barcha limitlar bajarilgan"}
          </div>
        </header>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {groups.map((group, index) => {
            const GroupIcon = group.icon;
            return (
              <section key={group.title} className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 ${index === 0 ? "lg:row-span-2" : ""}`}>
                <div className="flex items-center gap-2"><GroupIcon size={19} stroke={1.8} className="text-[var(--accent)]" /><h2 className="font-semibold text-[var(--ink)]">{group.title}</h2></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {group.items.map(({ key, value }) => <SpecValue key={key} name={key} value={value} />)}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold text-[var(--ink)]">Keyingi qadam</h2><p className="mt-1 text-xs text-[var(--ink-muted)]">Limitlarni to‘g‘rilang yoki dizaynni parvoz maydonida sinang.</p></div>
          <div className="flex gap-2">
            <Link href="/modules/glider" className="inline-flex h-10 items-center rounded-xl border border-[var(--line-strong)] px-4 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)]">Dizaynni tahrirlash</Link>
            <Link href="/modules/glider/competition" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Parvoz sinovi <IconArrowRight size={16} stroke={1.8} /></Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function SpecValue({ name, value }: { name: SpecKey; value: number }) {
  const limit = SPEC_LIMITS[name];
  const valid = value >= limit.min && value <= limit.max;
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] px-3.5 py-3">
      <div className="flex items-start justify-between gap-2"><p className="text-[11px] leading-4 text-[var(--ink-muted)]">{SPEC_LABELS[name]}</p>{valid ? <IconCircleCheck size={15} stroke={1.8} className="shrink-0 text-emerald-600" /> : <IconAlertTriangle size={15} stroke={1.8} className="shrink-0 text-amber-600" />}</div>
      <p className="mt-2 font-mono text-base font-semibold text-[var(--ink)]">{value.toFixed(2)} <span className="text-[10px] font-normal text-[var(--ink-muted)]">{limit.unit}</span></p>
      <p className="mt-1 text-[9px] text-[var(--ink-muted)]">Oraliq {limit.min} - {limit.max}</p>
    </div>
  );
}
