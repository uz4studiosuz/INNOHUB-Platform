"use client";

function FormulaBlock({ title, formula, note }: { title?: string; formula: string; note?: string }) {
  return (
    <div className="bg-teal-400 text-black rounded-lg p-4 font-mono text-sm my-3">
      {title && <div className="font-bold mb-1">{title}</div>}
      <div className="whitespace-pre-wrap">{formula}</div>
      {note && <div className="text-xs mt-2 text-black/70">{note}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-3 text-teal-400">{title}</h2>
      <div className="text-slate-300 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default function ProstheticsResearchPage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-3xl mx-auto pb-16">
        <h1 className="text-3xl font-bold mb-2">Research — Protez Biomexanikasi</h1>
        <p className="text-slate-400 mb-8">
          Bo&apos;g&apos;im momenti, richag (linkage) mexanikasi, material zo&apos;riqishi va aktuator
          quvvat talabi — bionik protez dizaynining asosi.
        </p>

        <Section title="1. Bo'g'im momenti (Joint Torque)">
          <p>
            Yukni ushlab turish uchun bo&apos;g&apos;imda hosil bo&apos;lishi kerak bo&apos;lgan moment —
            yuk kuchi va moment yelkasining (yukdan bo&apos;g&apos;imgacha bo&apos;lgan masofa) ko&apos;paytmasi,
            gravitatsiya tarkibiy qismi bilan birga:
          </p>
          <FormulaBlock
            formula="τ_joint = F_load · d · cos(θ) + m_limb · g · (L/2) · cos(θ)"
            note="θ — bo'g'im burchagi, L — a'zo uzunligi, d — yuk qo'llanish nuqtasigacha masofa"
          />
        </Section>

        <Section title="2. Richag (linkage) va mexanik yutuq">
          <p>
            Aktuator to&apos;g&apos;ridan-to&apos;g&apos;ri bo&apos;g&apos;imga emas, balki richag mexanizmi orqali
            kuch uzatadi. Mexanik yutuq (mechanical advantage) qancha katta bo&apos;lsa, aktuator
            shuncha kam moment sarflaydi:
          </p>
          <FormulaBlock
            formula="MA = linkage_ratio  →  τ_actuator = τ_joint / MA"
            note="Kichik linkage_ratio — kam aktuator momenti, lekin ko'proq harakat (stroke) talab qiladi"
          />
        </Section>

        <Section title="3. Material zo'riqishi va xavfsizlik koeffitsienti">
          <p>
            Protez tuzilmasidagi zo&apos;riqish kesim yuzasiga bog&apos;liq. Xavfsizlik koeffitsienti
            1dan katta bo&apos;lishi shart — aks holda material sinadi:
          </p>
          <FormulaBlock
            formula="σ = τ_joint / (A · d)"
            note="σ — zo'riqish (Pa), A — kesim yuzasi (m²)"
          />
          <FormulaBlock
            formula="Safety Factor = σ_yield / σ"
            note="SF < 1 — konstruksiya sinadi; material tanlovi (alyuminiy, karbon, po'lat...) shu yerda hal qiluvchi"
          />
        </Section>

        <Section title="4. Tutish kuchi va batareya muddati">
          <p>
            Qo&apos;l protezlari uchun tutish kuchi aktuator kuchi va richag geometriyasidan kelib chiqadi.
            Batareya muddati esa sig&apos;im va o&apos;rtacha tok iste&apos;moli orqali hisoblanadi:
          </p>
          <FormulaBlock
            formula="t_battery (soat) = Capacity_Ah / I_draw_A"
          />
        </Section>

        <Section title="5. Muhandislik (Engineering) tab bilan bog'liqlik">
          <p>
            ENGINEERING tab&apos;ida a&apos;zo massasi, burchagi, yuk kuchi, moment yelkasi, kesim yuzasi,
            material, aktuator kuchi, bog&apos;lanish nisbati va batareya parametrlarini sozlab, yuqoridagi
            barcha formulalar real vaqtda hisoblanadi.
          </p>
        </Section>
      </div>
    </div>
  );
}
