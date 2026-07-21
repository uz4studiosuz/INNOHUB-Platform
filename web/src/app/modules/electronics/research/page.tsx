"use client";

function FormulaBlock({ title, formula, note }: { title?: string; formula: string; note?: string }) {
  return (
    <div className="bg-emerald-400 text-black rounded-lg p-4 font-mono text-sm my-3">
      {title && <div className="font-bold mb-1">{title}</div>}
      <div className="whitespace-pre-wrap">{formula}</div>
      {note && <div className="text-xs mt-2 text-black/70">{note}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-3 text-emerald-400">{title}</h2>
      <div className="text-slate-300 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default function ElectronicsResearchPage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-3xl mx-auto pb-16">
        <h1 className="text-3xl font-bold mb-2">Research — Breadboard Zanjirlari</h1>
        <p className="text-slate-400 mb-8">
          Ketma-ket rezistorlar, kuchlanish bo&apos;luvchi va LED&apos;ni himoya qiluvchi rezistor hisobi.
        </p>

        <Section title="1. Om qonuni">
          <p>Har qanday zanjir tahlilining asosi — kuchlanish, tok va qarshilik bog&apos;liqligi:</p>
          <FormulaBlock formula="V = I · R" note="V — kuchlanish (V), I — tok (A), R — qarshilik (Ω)" />
        </Section>

        <Section title="2. Ketma-ket zanjir va kuchlanish bo'luvchi">
          <p>
            Ikkita rezistor ketma-ket ulanganda, umumiy qarshilik yig&apos;indi bo&apos;ladi va tok
            zanjir bo&apos;ylab bir xil qoladi (KCL — Kirxgof tok qonuni):
          </p>
          <FormulaBlock formula="R_total = R1 + R2" />
          <FormulaBlock
            formula="I = V_supply / R_total"
            note="Tok butun ketma-ket zanjir bo'ylab bir xil"
          />
          <FormulaBlock
            formula="V_R1 = I · R1,   V_R2 = I · R2"
            note="Har bir rezistordagi kuchlanish tushishi (KVL — Kirxgof kuchlanish qonuni)"
          />
        </Section>

        <Section title="3. LED ketma-ket rezistori">
          <p>
            LED&apos;ni kuyib ketishdan himoya qilish uchun ketma-ket rezistor kerak. LED&apos;ning
            o&apos;z to&apos;g&apos;ri kuchlanishi (V_f) bor, qolgan kuchlanish rezistorda so&apos;nadi:
          </p>
          <FormulaBlock
            formula="R_series = (V_supply − V_f) / I_max"
            note="I_max — LED uchun xavfsiz maksimal tok (odatda 10-20 mA)"
          />
          <p>
            Agar haqiqiy zanjir toki I_max&apos;dan sezilarli yuqori bo&apos;lsa, LED kuyib ketadi —
            shu sababli rezistor tanlovi muhim.
          </p>
        </Section>

        <Section title="4. Muhandislik (Engineering) tab bilan bog'liqlik">
          <p>
            ENGINEERING tab&apos;ida ta&apos;minot kuchlanishi, R1/R2 va LED parametrlarini sozlab,
            har bir elementdagi kuchlanish tushishi, tok va tavsiya etilgan LED rezistori real
            vaqtda hisoblanadi. Agar tok xavfli darajada yuqori bo&apos;lsa, ogohlantirish chiqadi.
          </p>
        </Section>
      </div>
    </div>
  );
}
