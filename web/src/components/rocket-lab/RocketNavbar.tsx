"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Every entry here has to point at a route that exists. Two of them used to be
 * dead ends (RESEARCH and BUILD AND TEST returned 404), which made the whole
 * section feel half-built.
 */
const LINKS = [
  { name: "TADQIQOT", href: "/modules/rockets/research" },
  { name: "LOYIHALASH", href: "/modules/rockets" },
  { name: "SINOV VA UCHIRISH", href: "/modules/rockets/build-test" },
  { name: "MUSOBAQA", href: "/modules/rockets/competition" },
  { name: "HISOBOT", href: "/modules/rockets/outputs" },
  { name: "FAYL", href: "/modules/rockets/file" },
];

export function RocketNavbar() {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = React.useState(false);

  return (
    <>
      <div className="h-10 bg-white border-b border-gray-300 flex items-center justify-between px-4 text-sm font-semibold tracking-wide shadow-sm z-50 flex-shrink-0">
        <Link href="/" className="flex items-center text-orange-500 gap-2 hover:text-orange-600" title="Bosh sahifa">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
          <span className="text-xs font-bold hidden lg:inline">RAKETA LABORATORIYASI</span>
        </Link>

        <div className="flex items-center gap-5 text-gray-400 text-xs">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`hover:text-gray-700 transition-colors py-2 border-b-2 ${
                  active ? "border-orange-500 text-gray-800" : "border-transparent"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-orange-500 text-xs">
          <button onClick={() => setHelpOpen(true)} className="hover:text-orange-600">YO&apos;RIQNOMA</button>
          <Link href="/" className="hover:text-orange-600">CHIQISH</Link>
        </div>
      </div>

      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
    </>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold tracking-wide">YO&apos;RIQNOMA</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-6 text-sm text-gray-700 leading-relaxed space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 mb-1">Bo&apos;limlar</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Tadqiqot</b> — suv raketasi qanday ishlaydi, formulalar va musobaqa qoidalari</li>
              <li><b>Loyihalash</b> — 3D modelni yig&apos;ish: butilka, nos, truba, qanotlar</li>
              <li><b>Sinov va uchirish</b> — bitta uchirish va balandlik/tezlik/tortish grafiklari</li>
              <li><b>Musobaqa</b> — dizaynni raqiblarga qarshi uchirish</li>
              <li><b>Hisobot</b> — talablarga muvofiqlik jadvali</li>
              <li><b>Fayl</b> — versiyalarni saqlash va taqqoslash</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">Loyihalash ishlash tartibi</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Chapdagi ro&apos;yxatdan komponentni tanlang</li>
              <li>O&apos;ngdagi <b>Sozlash paneli</b>da qiymatlarni o&apos;zgartiring — raqamlar darhol qayta hisoblanadi</li>
              <li>Ko&apos;z belgisi komponentni 3D&apos;da yashiradi/ko&apos;rsatadi</li>
              <li><b>Qaytarish</b> shu komponentni standartga, <b>Saqlash</b> esa versiya yaratadi</li>
            </ol>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">Nimaga e&apos;tibor berish kerak</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Statik zapas</b> 1.0 kalibrdan yuqori bo&apos;lsin — aks holda raketa aylanib ketadi</li>
              <li><b>Suv</b> butilkaning 25–35% ini to&apos;ldirsa balandlik eng katta bo&apos;ladi</li>
              <li><b>Loy</b> og&apos;irlik markazini oldinga suradi va barqarorlikni oshiradi</li>
              <li><b>Katta qanot</b> barqarorlikni oshiradi, lekin qarshilikni ham oshiradi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
