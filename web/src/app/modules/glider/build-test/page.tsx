"use client";

import { IconCircleCheck, IconPrinter, IconRuler2, IconTools } from "@tabler/icons-react";
import { useGliderStore } from "../../../../store/gliderStore";

const MATERIALS = ["Balsa listi 1/16 × 3 × 36 in", "Balsa tayoqchasi 1/4 × 1/4 × 36 in", "CA yelimi", "220 va 400 grit jilvir qog'ozi", "Model pichog'i", "Burun balasti uchun plastilin"];

export default function BuildTestPage() {
  const store = useGliderStore();
  const dimensions = [
    ["Qanot kengligi", store.wing.span], ["Qanot xordasi", store.wing.chord], ["Fyuzelyaj", store.fuselage.length],
    ["Gorizontal dum", store.horizontalStabilizer.span], ["Vertikal dum", store.verticalStabilizer.height],
  ] as const;

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--canvas)] px-4 py-7 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><IconTools size={22} stroke={1.7} /></div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[var(--ink)] md:text-4xl">Yig'ish va sinov</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">Raqamli dizaynni 1:1 o‘lchamdagi shablon yordamida balsa modelga aylantiring.</p>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-7">
            <div className="flex items-center gap-3"><IconPrinter size={22} stroke={1.8} className="text-[var(--accent)]" /><div><h2 className="font-semibold text-[var(--ink)]">1:1 chop etish shabloni</h2><p className="mt-1 text-xs text-[var(--ink-muted)]">Chop etish masshtabini 100% qilib belgilang.</p></div></div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {dimensions.map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--surface-muted)] p-3"><p className="text-[10px] text-[var(--ink-muted)]">{label}</p><p className="mt-1 font-mono text-sm font-semibold text-[var(--ink)]">{value.toFixed(1)} mm</p></div>)}
            </div>
            <button type="button" onClick={() => window.print()} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98]"><IconPrinter size={17} stroke={1.8} /> Shablonlarni chop etish</button>
          </div>

          <aside className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-7">
            <div className="flex items-center gap-2"><IconRuler2 size={20} stroke={1.8} className="text-[var(--accent)]" /><h2 className="font-semibold text-[var(--ink)]">Materiallar ro'yxati</h2></div>
            <div className="mt-5 space-y-3">{MATERIALS.map((item) => <label key={item} className="flex cursor-pointer items-center gap-3 text-sm text-[var(--ink-muted)]"><input type="checkbox" className="h-4 w-4 rounded accent-[var(--accent)]" /><span>{item}</span></label>)}</div>
          </aside>
        </section>

        <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex gap-3"><IconCircleCheck size={20} stroke={1.8} className="mt-0.5 shrink-0 text-emerald-700" /><div><h2 className="text-sm font-semibold text-emerald-950">Uchirishdan oldin</h2><p className="mt-1 text-sm leading-6 text-emerald-900/80">Qanot simmetriyasini tekshiring, old qirralarni silliqlang, og'irlik markazini tasdiqlang va musobaqadan oldin past energiyali qo'l parvozini bajaring.</p></div></div>
        </section>
      </div>
    </main>
  );
}
