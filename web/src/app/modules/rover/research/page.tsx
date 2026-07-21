"use client";

function FormulaBlock({ title, formula, note }: { title?: string; formula: string; note?: string }) {
  return (
    <div className="bg-orange-400 text-black rounded-lg p-4 font-mono text-sm my-3">
      {title && <div className="font-bold mb-1">{title}</div>}
      <div className="whitespace-pre-wrap">{formula}</div>
      {note && <div className="text-xs mt-2 text-black/70">{note}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-3 text-orange-400">{title}</h2>
      <div className="text-slate-300 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default function RoverResearchPage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-3xl mx-auto pb-16">
        <h1 className="text-3xl font-bold mb-2">Research — Rover Harakat Dinamikasi</h1>
        <p className="text-slate-400 mb-8">
          G&apos;ildirakli robotning tortish kuchi, reduktor orqali moment ko&apos;paytirilishi va
          qarshilik kuchlariga qarshi harakat qilish nazariyasi.
        </p>

        <Section title="1. Motor momenti va reduktor (gear) nisbati">
          <p>
            Motor o&apos;zi kam moment ishlab chiqaradi, shu sababli reduktor (gearbox) uni ko&apos;paytiradi,
            lekin tezlikni shunga mos kamaytiradi:
          </p>
          <FormulaBlock
            formula="τ_wheel = τ_motor · gear_ratio · efficiency"
            note="τ — moment (N·m), efficiency — reduktor samaradorligi (masalan 0.85)"
          />
          <FormulaBlock
            formula="F_tractive = τ_wheel / r_wheel"
            note="G'ildirak radiusiga bo'linganda tortish kuchi (N) hosil bo'ladi"
          />
        </Section>

        <Section title="2. Qarshilik kuchlari">
          <p>
            Rover harakatlanishi uchun tortish kuchi quyidagi qarshiliklarni yengishi kerak:
          </p>
          <FormulaBlock
            formula="F_rolling = Crr · m · g · cos(θ)"
            note="Crr — g'ildirak qarshilik koeffitsienti, θ — nishab burchagi"
          />
          <FormulaBlock
            formula="F_gravity = m · g · sin(θ)"
            note="Nishabga qarshi tortishish tarkibiy qismi"
          />
          <FormulaBlock
            formula="F_drag = ½ · ρ · Cd · A · v²"
            note="Havo qarshiligi — yuqori tezliklarda sezilarli bo'ladi"
          />
        </Section>

        <Section title="3. Harakat tenglamasi (Nyuton II qonuni)">
          <p>Rover tezlanishi barcha kuchlarning teng ta&apos;siridan kelib chiqadi:</p>
          <FormulaBlock
            formula="a = (F_tractive − F_rolling − F_gravity − F_drag) / m"
          />
          <p>
            Agar qarshiliklar yig&apos;indisi tortish kuchidan katta bo&apos;lsa (masalan juda tik nishabda),
            rover to&apos;xtaydi yoki orqaga sirg&apos;anadi — bu maksimal yengib o&apos;tiladigan nishablikni belgilaydi.
          </p>
        </Section>

        <Section title="4. Maksimal nishablik va tezlik chegarasi">
          <p>
            Rover yengib o&apos;ta oladigan maksimal nishab — tortish kuchi qarshiliklarga teng bo&apos;lgan nuqta:
          </p>
          <FormulaBlock
            formula="F_tractive = m·g·sin(θ_max) + Crr·m·g·cos(θ_max)"
            note="Bu tenglama son bo'yicha yechilib θ_max topiladi"
          />
        </Section>

        <Section title="5. Muhandislik (Engineering) tab bilan bog'liqlik">
          <p>
            ENGINEERING tab&apos;idagi simulyator massa, motor momenti, reduksiya, nishablik va g&apos;ildirak
            qarshiligini real vaqtda hisoblab, vaqt bo&apos;yicha masofa/tezlik/tezlanish grafigini
            (jadval ko&apos;rinishida) chiqaradi.
          </p>
        </Section>
      </div>
    </div>
  );
}
