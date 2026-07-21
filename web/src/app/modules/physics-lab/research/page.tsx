"use client";

function FormulaBlock({ title, formula, note }: { title?: string; formula: string; note?: string }) {
  return (
    <div className="bg-lime-400 text-black rounded-lg p-4 font-mono text-sm my-3">
      {title && <div className="font-bold mb-1">{title}</div>}
      <div className="whitespace-pre-wrap">{formula}</div>
      {note && <div className="text-xs mt-2 text-black/70">{note}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-3 text-lime-400">{title}</h2>
      <div className="text-slate-300 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default function PhysicsLabResearchPage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-3xl mx-auto pb-16">
        <h1 className="text-3xl font-bold mb-2">Research — Fizika Laboratoriyasi</h1>
        <p className="text-slate-400 mb-8">
          Bu modulda 4 ta soha bo&apos;yicha 17 ta tajriba mavjud: mexanika, elektr, to&apos;lqinlar va
          termodinamika. Har biri o&apos;z asosiy qonuni bilan ishlaydi.
        </p>

        <Section title="1. Mexanika">
          <p>Nyuton mexanikasi: harakat, kuchlar, energiya va tebranishlar.</p>
          <FormulaBlock formula="x(t) = v0·cos(θ)·t,   y(t) = v0·sin(θ)·t − ½·g·t²" note="Snaryad harakati" />
          <FormulaBlock formula="F_c = m·v² / r" note="Markazga intilma kuch" />
          <FormulaBlock formula="T = 2π·√(m/k)  (prujina),   T = 2π·√(L/g)  (mayatnik)" note="Tebranish davri" />
        </Section>

        <Section title="2. Elektr">
          <p>Zanjirlar, induksiya va o&apos;tkinchi jarayonlar.</p>
          <FormulaBlock formula="I = V / R" note="Om qonuni" />
          <FormulaBlock formula="EMF = −N · (ΔΦ / Δt)" note="Faradey induksiya qonuni" />
          <FormulaBlock formula="V_C(t) = V · (1 − e^(−t/RC))" note="RC zanjiri zaryadlanishi, τ = R·C" />
        </Section>

        <Section title="3. To'lqinlar">
          <p>To&apos;lqin tarqalishi, tebranishlar va Dopler effekti.</p>
          <FormulaBlock formula="v = f · λ" note="To'lqin tezligi = chastota × to'lqin uzunligi" />
          <FormulaBlock
            formula="f_observed = f_source · (v_sound / (v_sound ± v_source))"
            note="Dopler effekti — manba harakatiga qarab chastota o'zgaradi"
          />
        </Section>

        <Section title="4. Termodinamika">
          <p>Issiqlik, ideal gaz va issiqlik dvigatellari.</p>
          <FormulaBlock formula="Q = m · c · ΔT" note="Issiqlik energiyasi" />
          <FormulaBlock formula="P·V = n·R·T" note="Ideal gaz qonuni" />
          <FormulaBlock
            formula="η_Carnot = 1 − (T_cold / T_hot)"
            note="Karno sikli — maksimal nazariy samaradorlik"
          />
        </Section>

        <Section title="5. Muhandislik (Engineering) tab bilan bog'liqlik">
          <p>
            ENGINEERING tab&apos;ida sohani (mexanika/elektr/to&apos;lqinlar/termo) va 17 ta tajribadan birini
            tanlab, parametrlarni kiritib, natijalarni real vaqtda hisoblashingiz mumkin.
          </p>
        </Section>
      </div>
    </div>
  );
}
