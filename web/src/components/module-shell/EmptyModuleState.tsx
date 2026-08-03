import type { Icon as TablerIcon } from "@tabler/icons-react";

export function EmptyModuleState({ icon: Icon, title, description }: { icon: TablerIcon; title: string; description: string }) {
  return (
    <main className="flex flex-1 items-center justify-center overflow-y-auto bg-[var(--canvas)] p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center md:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon size={24} stroke={1.8} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--ink)]">{title}</h1>
        <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
      </div>
    </main>
  );
}
