"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function RocketNavbar() {
  const pathname = usePathname();

  const links = [
    { name: "HOME", href: "/" },
    { name: "RESEARCH", href: "/modules/rockets/research" },
    { name: "ENGINEERING", href: "/modules/rockets" },
    { name: "COMPETITION", href: "/modules/rockets/competition" },
    { name: "OUTPUTS", href: "/modules/rockets/outputs" },
    { name: "BUILD AND TEST", href: "/modules/rockets/build-test" },
  ];

  return (
    <div className="h-10 bg-white border-b border-gray-300 flex items-center justify-between px-4 text-sm font-semibold tracking-wide shadow-sm z-50">
      <div className="flex items-center text-orange-500 gap-2">
        {/* Placeholder for Rocket Icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
        </svg>
      </div>

      <div className="flex items-center gap-6 text-gray-400">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`hover:text-gray-700 transition-colors py-2 border-b-2 ${
                isActive ? "border-orange-500 text-gray-700" : "border-transparent"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-orange-500">
        <button className="hover:text-orange-600">FILE</button>
        <button className="hover:text-orange-600">HELP</button>
        <button className="hover:text-orange-600">LOGOUT</button>
      </div>
    </div>
  );
}
