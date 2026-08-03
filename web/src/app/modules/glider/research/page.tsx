"use client";

import Link from "next/link";
import { IconArrowRight, IconArrowsDown, IconArrowsUp, IconPlaneTilt, IconRocket, IconWind } from "@tabler/icons-react";

const FORCES = [
  { title: "Lift", text: "Qanot usti va ostidagi bosim farqi planyorni yuqoriga ko‘taradi.", icon: IconArrowsUp },
  { title: "Weight", text: "Og‘irlik markazi orqali pastga yo‘nalgan gravitatsiya kuchi.", icon: IconArrowsDown },
  { title: "Launch", text: "Boshlang‘ich tezlik planyorni havo oqimiga olib kiradi.", icon: IconRocket },
  { title: "Drag", text: "Shakl va sirt qarshiligi tezlikni kamaytiradi.", icon: IconWind },
] as const;

export default function ResearchPage() {
  return (
    <main className="flex-1 overflow-y-auto bg-[var(--canvas)] px-4 py-7 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><IconPlaneTilt size={22} stroke={1.7} /></div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[var(--ink)] md:text-4xl">Parvoz fizikasi</h1>
          <p className="mt-3 max-w-[66ch] text-sm leading-6 text-[var(--ink-muted)]">Dizayndagi har bir o‘lcham nimaga ta’sir qilishini tushuning. Keyin Engineering sahifasida natijani darhol tekshiring.</p>
        </header>

        <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-7">
          <h2 className="text-xl font-semibold text-[var(--ink)]">To‘rtta asosiy kuch</h2>
          <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
            {FORCES.map((force) => {
              const ForceIcon = force.icon;
              return (
                <div key={force.title} className="flex gap-3 border-t border-[var(--line)] pt-4">
                  <ForceIcon size={20} stroke={1.7} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <div><h3 className="text-sm font-semibold text-[var(--ink)]">{force.title}</h3><p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{force.text}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-7">
            <h2 className="text-xl font-semibold text-[var(--ink)]">Barqarorlik o‘qlari</h2>
            <div className="mt-5 space-y-5">
              <Axis title="Pitch" body="Horizontal stabilizator va og‘irlik markazi burunni yuqori yoki pastga og‘ishini boshqaradi." />
              <Axis title="Roll" body="Qanot dihedral burchagi planyorni yon tomonga og‘ishdan keyin muvozanatga qaytaradi." />
              <Axis title="Yaw" body="Vertical stabilizator yo‘nalishni saqlaydi va dumning yon tomonga sirpanishini kamaytiradi." />
            </div>
          </div>

          <aside className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 md:p-7">
            <h2 className="text-lg font-semibold text-emerald-950">Amaliy qoida</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-900/80">Avval massani limitga kiriting. Keyin qanot dihedralini va dum yuzalarini sozlang. Har bir o‘zgarishdan so‘ng lift ratio va static margin qiymatlarini tekshiring.</p>
            <Link href="/modules/glider" className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98]">3D modelga o‘tish <IconArrowRight size={17} stroke={1.8} /></Link>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Axis({ title, body }: { title: string; body: string }) {
  return <div className="grid gap-1 md:grid-cols-[90px_1fr]"><h3 className="text-sm font-semibold text-[var(--accent)]">{title}</h3><p className="text-sm leading-6 text-[var(--ink-muted)]">{body}</p></div>;
}
