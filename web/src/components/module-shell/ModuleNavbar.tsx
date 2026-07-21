"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ModuleTab = { label: string; segment: string }; // segment "" = ENGINEERING (index)

export const DEFAULT_MODULE_TABS: ModuleTab[] = [
  { label: "HOME", segment: "home" },
  { label: "RESEARCH", segment: "research" },
  { label: "ENGINEERING", segment: "" },
  { label: "COMPETITION", segment: "competition" },
  { label: "OUTPUTS", segment: "outputs" },
  { label: "BUILD AND TEST", segment: "build-test" },
];

export function ModuleNavbar({
  basePath,
  tabs = DEFAULT_MODULE_TABS,
  accent = "linear-gradient(135deg, #7c3aed, #4338ca)",
}: {
  basePath: string;
  tabs?: ModuleTab[];
  accent?: string;
}) {
  const pathname = usePathname();

  const hrefFor = (segment: string) => (segment ? `${basePath}/${segment}` : basePath);

  const isActive = (segment: string) => {
    if (segment === "") return pathname === basePath;
    return pathname.startsWith(hrefFor(segment));
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
          background: accent,
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
        {tabs.map((tab) => (
          <Link
            key={tab.segment}
            href={hrefFor(tab.segment)}
            className={`glider-nav-tab ${isActive(tab.segment) ? "active" : ""}`}
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
