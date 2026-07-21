"use client";

function FormulaBlock({ title, formula, note }: { title?: string; formula: string; note?: string }) {
  return (
    <div className="bg-cyan-400 text-black rounded-lg p-4 font-mono text-sm my-3">
      {title && <div className="font-bold mb-1">{title}</div>}
      <div className="whitespace-pre-wrap">{formula}</div>
      {note && <div className="text-xs mt-2 text-black/70">{note}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-3 text-cyan-400">{title}</h2>
      <div className="text-slate-300 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default function MicroelectronicsResearchPage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-3xl mx-auto pb-16">
        <h1 className="text-3xl font-bold mb-2">Research — Mikrokontroller Arxitekturasi</h1>
        <p className="text-slate-400 mb-8">
          Mikrokontroller/IC tanlashda e&apos;tibor beriladigan asosiy parametrlar: klock tezligi,
          xotira hajmi, GPIO pinlar soni va ta&apos;minot kuchlanishi.
        </p>

        <Section title="1. Klock tezligi va ishlash unumdorligi">
          <p>
            Klock tezligi (masalan 16 MHz yoki 240 MHz) protsessor sekundiga qancha bajarilish
            siklini amalga oshirishini bildiradi. Yuqori klock — tezroq hisoblash, lekin ko&apos;proq
            quvvat sarfi:
          </p>
          <FormulaBlock
            formula="cycle_time = 1 / clock_freq"
            note="Masalan 16 MHz da bitta sikl ≈ 62.5 ns davom etadi"
          />
        </Section>

        <Section title="2. Xotira: Flash va SRAM">
          <p>
            Flash — dasturni doimiy saqlaydi (o&apos;chirilganda ham qoladi), SRAM — ishlash vaqtidagi
            o&apos;zgaruvchilar uchun tezkor, lekin uchuvchan xotira. Katta dasturlar ko&apos;proq Flash,
            ko&apos;p ma&apos;lumot ishlash esa ko&apos;proq SRAM talab qiladi.
          </p>
        </Section>

        <Section title="3. GPIO va quvvat budjeti">
          <p>
            Har bir GPIO pin cheklangan tok bera oladi (odatda 20-40 mA). Ko&apos;p periferiya
            (sensorlar, motorlar, displey) ulanganda umumiy tok budjetini hisoblash zarur:
          </p>
          <FormulaBlock
            formula="P = V · I"
            note="Quvvat (W) = kuchlanish (V) × tok (A) — har bir komponent uchun alohida hisoblanadi"
          />
        </Section>

        <Section title="4. Mikrokontroller vs IC vs Development Board">
          <p>
            Mikrokontroller (ATmega328P, ESP32, RP2040) — dasturlanadigan protsessor yadrosi.
            Digital/Analog IC (74HC595, LM358) — maxsus vazifa uchun tayyor mantiqiy sxema.
            Development Board (Arduino Uno R3) — mikrokontroller + qo&apos;shimcha elektronika
            (USB, quvvat regulyatori) tayyor platada.
          </p>
        </Section>

        <Section title="5. Muhandislik (Engineering) tab bilan bog'liqlik">
          <p>
            ENGINEERING tab&apos;ida 6 ta real komponent (ATmega328P, ESP32, RP2040, 74HC595, LM358,
            Arduino Uno R3) orasidan birini tanlab, uning klock tezligi, xotira, pinlar va
            kuchlanish parametrlarini solishtirib ko&apos;rishingiz mumkin. Shu bilan birga, quvvat va
            GPIO kalkulyatori orqali ulangan periferiyalar sonini, sikl vaqtini, GPIO pin budjetini
            va batareya muddatini real vaqtda hisoblashingiz mumkin.
          </p>
        </Section>
      </div>
    </div>
  );
}
