"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "HOME",           href: "/modules/structures/home" },
  { label: "RESEARCH",       href: "/modules/structures/research" },
  { label: "ENGINEERING",    href: "/modules/structures" },
  { label: "TRUCK RALLY",    href: "/modules/structures/competition" },
  { label: "OUTPUTS",        href: "/modules/structures/outputs" },
  { label: "BUILD AND TEST", href: "/modules/structures/build-test" },
] as const;

export function StructuresNavbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Engineering tab is active for exact /modules/structures path
    if (href === "/modules/structures") {
      return pathname === "/modules/structures";
    }
    return pathname.startsWith(href);
  };

  return (
    <header style={{
      height: 42,
      display: "flex",
      alignItems: "center",
      gap: 0,
      paddingLeft: 8,
      paddingRight: 12,
      borderBottom: "1px solid #c0c0c0",
      background: "linear-gradient(180deg, #e8e8e8 0%, #d4d4d4 100%)",
      flexShrink: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <Link href="/" style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginRight: 12,
        flexShrink: 0,
        textDecoration: "none",
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 4,
          background: "linear-gradient(135deg, #7c3aed, #4338ca)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}>
          ◆
        </div>
      </Link>

      {/* Navigation Tabs */}
      <nav style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`glider-nav-tab ${isActive(tab.href) ? "active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Right side spacer + service buttons */}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <nav style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#475569",
        }}>
          <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
            JOURNAL
          </button>
          <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
            FILE
          </button>
          <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
            HELP
          </button>
          <button style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
            LOGOUT
          </button>
        </nav>
      </div>
    </header>
  );
}
