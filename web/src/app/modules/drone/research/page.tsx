"use client";

function FormulaBlock({ title, formula, note }: { title?: string; formula: string; note?: string }) {
  return (
    <div className="bg-amber-400 text-black rounded-lg p-4 font-mono text-sm my-3">
      {title && <div className="font-bold mb-1">{title}</div>}
      <div className="whitespace-pre-wrap">{formula}</div>
      {note && <div className="text-xs mt-2 text-black/70">{note}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-3 text-amber-400">{title}</h2>
      <div className="text-slate-300 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default function DroneResearchPage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-3xl mx-auto pb-16">
        <h1 className="text-3xl font-bold mb-2">Research — Kvadrokopter Fizikasi</h1>
        <p className="text-slate-400 mb-8">
          Quadkopter uchishi uchun zarur bo&apos;lgan asosiy kuchlar, motor-parvrak nazariyasi va
          balandlikni ushlab turish (altitude hold) boshqaruvi.
        </p>

        <Section title="1. Asosiy kuchlar: Og'irlik va Tortish">
          <p>
            Kvadrokopter havoda muallaq turishi (hover) uchun 4 ta motor yaratadigan umumiy tortish kuchi
            (thrust) uning og&apos;irligiga teng bo&apos;lishi kerak:
          </p>
          <FormulaBlock formula="W = m · g" note="W — og'irlik (N), m — massa (kg), g = 9.81 m/s²" />
          <FormulaBlock
            formula="T_total = 4 · T_motor  (hover holatida T_total = W)"
            note="Har bir motor umumiy tortishning 1/4 qismini ta'minlaydi"
          />
        </Section>

        <Section title="2. Motor-Parvrak Tortish Modeli">
          <p>
            Har bir motor+parvrak juftligi yaratadigan tortish kuchi aylanish tezligi (RPM)ning
            kvadratiga proporsional (momentum theory soddalashtirilgan modeli):
          </p>
          <FormulaBlock
            formula="T = kt · ω²"
            note="kt — tortish koeffitsienti (motor/parvrak geometriyasiga bog'liq), ω — burchak tezligi (rad/s)"
          />
          <p>
            Shu sababli hover uchun zarur RPM quyidagicha topiladi (T = W/4 dan ω ni ifodalab):
          </p>
          <FormulaBlock formula="ω_hover = √(W / (4 · kt))" />
        </Section>

        <Section title="3. Tortish/Og'irlik (T/W) nisbati">
          <p>
            T/W nisbati dronning manevr qilish qobiliyatini ko&apos;rsatadi. T/W = 1 — faqat hover qila oladi,
            tepaga tezlana olmaydi. Yaxshi akrobatik dron uchun T/W &gt; 2 bo&apos;lishi tavsiya etiladi.
          </p>
          <FormulaBlock
            formula="T/W = T_max_total / W"
            note="T/W > 1 bo'lsa, ortiqcha tortish vertikal tezlanish beradi"
          />
          <FormulaBlock
            formula="a_max = (T_max_total − W) / m"
            note="Maksimal vertikal tezlanish, T/W nisbatidan kelib chiqadi"
          />
        </Section>

        <Section title="4. Balandlikni ushlab turish (PID Altitude Hold)">
          <p>
            Dron belgilangan balandlikda turishi uchun PID (Proportional-Integral-Derivative) nazoratchi
            balandlik xatosiga qarab motor tortishini doimiy sozlab turadi:
          </p>
          <FormulaBlock
            formula="u(t) = Kp·e(t) + Ki·∫e(t)dt + Kd·(de/dt)"
            note="e(t) = maqsad balandlik − joriy balandlik"
          />
          <p>
            Bu boshqaruv signali u(t) qo&apos;shimcha tortish buyrug&apos;iga aylantiriladi va motorlar
            shunga mos ravishda tezlashadi yoki sekinlashadi.
          </p>
        </Section>

        <Section title="5. Batareya muddati">
          <p>
            LiPo batareyaning hover paytida qancha davom etishi sig&apos;im (mAh) va motor tortadigan
            umumiy tok (A) orqali hisoblanadi:
          </p>
          <FormulaBlock
            formula="t_flight (min) = (Capacity_mAh / (I_hover_A · 1000)) · 60"
          />
        </Section>

        <Section title="6. Muhandislik (Engineering) tab bilan bog'liqlik">
          <p>
            ENGINEERING tab&apos;idagi kalkulyator yuqoridagi barcha formulalarni real vaqtda hisoblaydi:
            massa va tortish koeffitsientidan hover RPM, T/W nisbatidan maksimal tezlanish, sig&apos;im va
            tokdan batareya muddati. Parametrlarni o&apos;zgartirib, natijalar qanday farq qilishini kuzating.
          </p>
        </Section>
      </div>
    </div>
  );
}
