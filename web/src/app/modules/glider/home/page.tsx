"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconChartDots3,
  IconCircleCheck,
  IconFlask,
  IconPlaneTilt,
  IconPrinter,
  IconRulerMeasure,
  IconTrophy,
} from "@tabler/icons-react";
import { useGliderStore } from "@/store/gliderStore";

const WORKFLOW = [
  { href: "/modules/glider/research", title: "Parvoz asoslari", text: "Lift, drag va barqarorlik prinsiplarini qisqa darslarda o‘rganing.", icon: IconFlask },
  { href: "/modules/glider", title: "3D dizayn", text: "Qanot, fyuzelyaj va stabilizatorlarni real vaqtda sozlang.", icon: IconRulerMeasure },
  { href: "/modules/glider/competition", title: "Parvoz sinovi", text: "O‘z dizayningizni bot planyoriga qarshi uchiring.", icon: IconTrophy },
  { href: "/modules/glider/build-test", title: "Yig‘ish", text: "1:1 shablon va material ro‘yxati bilan fizik model yarating.", icon: IconPrinter },
] as const;

export default function GliderHomePage() {
  const store = useGliderStore();
  const metrics = store.getComputedMetrics();
  const ready = metrics.specViolations.length === 0;

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--canvas)] px-4 py-7 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-7 border-b border-[var(--line)] pb-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><IconPlaneTilt size={24} stroke={1.7} /></div>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-[var(--ink)] md:text-5xl">Planyorni g‘oyadan real parvozgacha olib boring.</h1>
            <p className="mt-4 max-w-[62ch] text-sm leading-6 text-[var(--ink-muted)] md:text-base">Aerodinamikani o‘rganing, parametrik 3D model yarating, musobaqada sinang va aniq shablon asosida yig‘ing.</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--ink-muted)]">Joriy dizayn</p>
                <p className="mt-1 text-lg font-semibold text-[var(--ink)]">Glider Alpha</p>
              </div>
              <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {ready ? <IconCircleCheck size={15} stroke={1.8} /> : <IconChartDots3 size={15} stroke={1.8} />}
                {ready ? "Sinovga tayyor" : `${metrics.specViolations.length} ta parametr`}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Mass" value={`${metrics.mass.toFixed(1)} g`} />
              <Metric label="Lift ratio" value={metrics.liftEfficiencyRatio.toFixed(1)} />
              <Metric label="Flight" value={`${metrics.flightTimeSec.toFixed(2)} s`} />
            </div>
            <Link href="/modules/glider" className="mt-5 flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.98]">
              Dizaynni davom ettirish <IconArrowRight size={17} stroke={1.8} />
            </Link>
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Ish jarayoni</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Istalgan bosqichdan boshlashingiz mumkin. Dizayn barcha sahifalarda avtomatik saqlanadi.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {WORKFLOW.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--line-strong)] active:translate-y-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--accent)]"><ItemIcon size={20} stroke={1.8} /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[var(--ink)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{item.text}</p>
                  </div>
                  <IconArrowRight size={17} stroke={1.8} className="mt-1 text-[var(--ink-muted)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] text-[var(--ink-muted)]">{label}</p><p className="mt-1 font-mono text-sm font-semibold text-[var(--ink)]">{value}</p></div>;
}
