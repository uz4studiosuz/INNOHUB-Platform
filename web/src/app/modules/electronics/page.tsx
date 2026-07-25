"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useElectronicsStore } from "../../../store/electronicsStore";
import { Simulator } from "../../../components/electronics/engine";
import CircuitCanvas from "../../../components/electronics/CircuitCanvas";
import { CompVisual } from "../../../components/electronics/ComponentView";
import { COMPONENT_LIBRARY, PALETTE_ORDER, LED_COLORS } from "../../../components/electronics/componentLibrary";
import { SimState } from "../../../components/electronics/types";
import { EXAMPLES, DEFAULT_CODE } from "../../../components/electronics/examples";
import { logIteration } from "../../../store/iterationStore";

const WIRE_COLORS = ["#111827", "#dc2626", "#16a34a", "#2563eb", "#ca8a04", "#9333ea", "#0891b2", "#f97316"];
// Ordered to match Tinkercad's own category rhythm (General/Input/Output/
// Breadboards/Microcontrollers) - the palette below renders one labeled
// section per category, in this order, when "Hammasi" (All) is selected.
const CATEGORIES: { key: string; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "general", label: "Umumiy" },
  { key: "input", label: "Kirish" },
  { key: "output", label: "Chiqish" },
  { key: "breadboards", label: "Maketlar" },
  { key: "boards", label: "Mikrokontrollerlar" },
];

export default function ElectronicsPage() {
  const {
    components, selectedId, wireColor, setWireColor, setProp, removeComponent,
    rotateComponent, duplicateComponent, clear, loadExample, undo, redo,
  } = useElectronicsStore();

  const [title, setTitle] = useState("Mening zanjirim");
  const [code, setCode] = useState(DEFAULT_CODE);
  const [codeOpen, setCodeOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [visuals, setVisuals] = useState<Record<string, CompVisual>>({});
  const [serial, setSerial] = useState<string[]>([]);
  const [timeMs, setTimeMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");

  const simRef = useRef<Simulator | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const audioRef = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);
  // Holds the latest `loop` identity so the recursive requestAnimationFrame
  // call below can reach it without referencing `loop` from inside its own
  // useCallback (the compiler's immutability check rejects that as a
  // "before it's declared" self-reference) - refs are the sanctioned mutable
  // escape hatch, kept in sync via the effect further down.
  const loopRef = useRef<(now: number) => void>(() => {});

  useEffect(() => {
    if (useElectronicsStore.getState().components.length === 0) {
      loadExample(structuredClone(EXAMPLES[0].components), structuredClone(EXAMPLES[0].wires));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildVisuals = useCallback((st: SimState): Record<string, CompVisual> => {
    const out: Record<string, CompVisual> = {};
    for (const c of useElectronicsStore.getState().components) {
      out[c.id] = { led: st.ledBrightness[c.id], rgb: st.rgb[c.id], servo: st.servo[c.id], buzzer: st.buzzer[c.id], warning: st.warnings[c.id] };
    }
    return out;
  }, []);

  const updateBuzzer = useCallback((st: SimState) => {
    const freq = Math.max(0, ...Object.values(st.buzzer));
    if (freq > 0) {
      if (!audioRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctor();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.05; osc.type = "square";
        osc.connect(gain); gain.connect(ctx.destination); osc.start();
        audioRef.current = { ctx, osc, gain };
      }
      audioRef.current.osc.frequency.value = freq;
      audioRef.current.gain.gain.value = 0.05;
    } else if (audioRef.current) {
      audioRef.current.gain.gain.value = 0;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.osc.stop(); audioRef.current.ctx.close(); } catch { /* already closed */ }
      audioRef.current = null;
    }
  }, []);

  const loop = useCallback((now: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const dt = lastRef.current ? now - lastRef.current : 16;
    lastRef.current = now;
    sim.step(dt);
    const st = sim.getState();
    setVisuals(buildVisuals(st)); setSerial(st.serial); setTimeMs(st.timeMs); updateBuzzer(st);
    if (!sim.running) { setRunning(false); setError(sim.error); stopAudio(); return; }
    rafRef.current = requestAnimationFrame(loopRef.current);
  }, [buildVisuals, updateBuzzer, stopAudio]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const handleStart = useCallback(() => {
    const sim = new Simulator(() => useElectronicsStore.getState().components, structuredClone(useElectronicsStore.getState().wires));
    sim.speed = speed;
    const err = sim.start(code);
    simRef.current = sim;
    if (err) { setError(err); setRunning(false); setCodeOpen(true); return; }
    setError(null); setRunning(true); lastRef.current = 0;
    logIteration("electronics",
      { komponentlar: useElectronicsStore.getState().components.length, simlar: useElectronicsStore.getState().wires.length },
      { label: "Simulyatsiya", value: 1, unit: "" });
    rafRef.current = requestAnimationFrame(loop);
  }, [code, speed, loop]);

  const handleStop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    simRef.current?.stop(); setRunning(false); setVisuals({}); stopAudio();
  }, [stopAudio]);

  useEffect(() => { if (simRef.current) simRef.current.speed = speed; }, [speed]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); stopAudio(); }, [stopAudio]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) { removeComponent(selectedId); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { undo(); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { redo(); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selectedId) { duplicateComponent(selectedId); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeComponent, undo, redo, duplicateComponent]);

  const selected = components.find((c) => c.id === selectedId) ?? null;

  // One labeled section per category (Tinkercad shows the whole palette this
  // way under "All" - a blue heading followed by that category's tiles).
  // Picking a specific category from the dropdown just collapses this to
  // its single matching section.
  const groupedTiles = useMemo(() => {
    const groups: { key: string; label: string; items: typeof PALETTE_ORDER }[] = [];
    for (const c of CATEGORIES) {
      if (c.key === "all" || (cat !== "all" && cat !== c.key)) continue;
      const items = PALETTE_ORDER.filter((t) => {
        const def = COMPONENT_LIBRARY[t];
        if (def.category !== c.key) return false;
        if (search && !def.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
      if (items.length) groups.push({ key: c.key, label: c.label, items });
    }
    return groups;
  }, [cat, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 42px)", background: "#e8ebef", minHeight: 0 }}>
      {/* ================= TOP TOOLBAR ================= */}
      <div style={{ height: 50, background: "#fff", borderBottom: "1px solid #d1d5db", display: "flex", alignItems: "center", gap: 6, padding: "0 12px", flexShrink: 0 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          style={{ fontWeight: 700, fontSize: 14, border: "1px solid transparent", borderRadius: 6, padding: "5px 8px", width: 180, color: "#111827" }} />
        <Sep />
        <TBtn onClick={() => selected && duplicateComponent(selected.id)} disabled={!selected} title="Nusxa (Ctrl+D)">⧉</TBtn>
        <TBtn onClick={() => selected && removeComponent(selected.id)} disabled={!selected} title="O'chirish (Del)">🗑</TBtn>
        <Sep />
        <TBtn onClick={undo} title="Orqaga (Ctrl+Z)">↶</TBtn>
        <TBtn onClick={redo} title="Oldinga (Ctrl+Y)">↷</TBtn>
        <Sep />
        <TBtn onClick={() => selected && rotateComponent(selected.id)} disabled={!selected} title="Burish">⟳</TBtn>
        <div title="Sim rangi" style={{ display: "flex", gap: 3, padding: "0 4px" }}>
          {WIRE_COLORS.map((c) => (
            <button key={c} onClick={() => setWireColor(c)} title={c}
              style={{ width: 18, height: 18, borderRadius: 4, background: c, border: wireColor === c ? "2px solid #111827" : "1px solid #d1d5db", cursor: "pointer" }} />
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={selectStyle}>
          <option value={0.25}>0.25x</option><option value={0.5}>0.5x</option>
          <option value={1}>1x</option><option value={2}>2x</option><option value={5}>5x</option>
        </select>
        <select onChange={(e) => { const ex = EXAMPLES.find((x) => x.key === e.target.value); if (ex) { handleStop(); loadExample(structuredClone(ex.components), structuredClone(ex.wires)); setCode(ex.code); } e.target.value = ""; }}
          defaultValue="" style={selectStyle}>
          <option value="" disabled>Misollar</option>
          {EXAMPLES.map((ex) => <option key={ex.key} value={ex.key}>{ex.name}</option>)}
        </select>
        <button onClick={() => setCodeOpen((v) => !v)} style={{ ...btnLight, background: codeOpen ? "#e0e7ff" : "#f3f4f6" }}>{"</>"} Kod</button>
        {!running
          ? <button onClick={handleStart} style={btnStart}>▶ Simulyatsiya</button>
          : <button onClick={handleStop} style={{ ...btnStart, background: "#dc2626" }}>■ To&apos;xtatish</button>}
      </div>

      {/* ================= BODY ================= */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* canvas */}
        <div style={{ flex: 1, position: "relative", overflow: "auto", minWidth: 0 }}>
          <CircuitCanvas visuals={visuals} />

          {/* status pill */}
          <div style={{ position: "absolute", top: 10, left: 10, background: "#ffffffcc", backdropFilter: "blur(4px)", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, color: running ? "#16a34a" : "#6b7280", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
            {running ? `● Ishlayapti — ${(timeMs / 1000).toFixed(1)}s` : "○ To'xtatilgan"}
          </div>

          {/* floating inspector */}
          {selected && (
            <div style={{ position: "absolute", top: 10, right: 10, width: 210, background: "#fff", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", padding: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#111827" }}>{COMPONENT_LIBRARY[selected.type].name}</div>
              {selected.type === "led" && (
                <label style={labelCol}><span style={muted}>Rang</span>
                  <select value={String(selected.props.color ?? "red")} onChange={(e) => setProp(selected.id, "color", e.target.value)} style={selectStyle}>
                    {Object.keys(LED_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></label>)}
              {selected.type === "resistor" && (
                <label style={labelCol}><span style={muted}>Qarshilik (Ω)</span>
                  <input type="number" min={1} value={Number(selected.props.ohms ?? 220)} onChange={(e) => setProp(selected.id, "ohms", Number(e.target.value))} style={inputStyle} /></label>)}
              {selected.type === "potentiometer" && (
                <label style={labelCol}><span style={muted}>Qiymat: {Number(selected.props.value ?? 512)}</span>
                  <input type="range" min={0} max={1023} value={Number(selected.props.value ?? 512)} onChange={(e) => setProp(selected.id, "value", Number(e.target.value))} /></label>)}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => rotateComponent(selected.id)} style={btnLight}>⟳</button>
                <button onClick={() => duplicateComponent(selected.id)} style={btnLight}>⧉</button>
                <button onClick={() => removeComponent(selected.id)} style={{ ...btnLight, color: "#dc2626" }}>🗑</button>
              </div>
            </div>
          )}
        </div>

        {/* right column: components OR code */}
        {!codeOpen ? (
          <aside style={{ width: 264, background: "#fff", borderLeft: "1px solid #d1d5db", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #eef0f3" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Komponentlar</div>
                  <select value={cat} onChange={(e) => setCat(e.target.value)}
                    style={{ border: "none", background: "transparent", padding: "2px 0", fontWeight: 700, fontSize: 15, color: "#111827", cursor: "pointer" }}>
                    {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <span title="Ro'yxat ko'rinishi (tez orada)" style={{ color: "#c1c7d0", fontSize: 16, cursor: "not-allowed" }}>☰</span>
              </div>
              <input placeholder="Qidirish…" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 10px", fontSize: 12, marginTop: 8 }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
              {groupedTiles.map((g) => (
                <div key={g.key} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 8 }}>{g.label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {g.items.map((type) => {
                      const def = COMPONENT_LIBRARY[type];
                      return (
                        <div key={type} draggable onDragStart={(e) => e.dataTransfer.setData("component", type)}
                          title={`${def.name} — kanvasga sudrab tashlang`}
                          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 4px 6px", textAlign: "center", cursor: "grab", transition: "box-shadow .15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: 24, lineHeight: 1 }}>{def.icon}</div>
                          <div style={{ fontSize: 10, color: "#374151", lineHeight: 1.15 }}>{def.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {groupedTiles.length === 0 && <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 20 }}>Topilmadi</div>}
            </div>
            <div style={{ padding: 10, borderTop: "1px solid #eef0f3", display: "flex", gap: 8 }}>
              <button onClick={() => { handleStop(); clear(); }} style={{ ...btnLight, flex: 1 }}>Kanvasni tozalash</button>
            </div>
          </aside>
        ) : (
          <aside style={{ width: 440, background: "#0d1117", display: "flex", flexDirection: "column", flexShrink: 0, borderLeft: "1px solid #1e293b" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>Kod — Arduino C</span>
              <button onClick={() => setCodeOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <textarea value={code} onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); const ta = e.currentTarget; const s = ta.selectionStart, en = ta.selectionEnd; setCode(code.slice(0, s) + "  " + code.slice(en)); requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; }); } }}
              spellCheck={false}
              style={{ flex: 1, minHeight: 0, resize: "none", background: "#0d1117", color: "#c9d1d9", border: "none", outline: "none", padding: 14, fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.55 }} />
            {error && <div style={{ background: "#7f1d1d", color: "#fecaca", padding: "8px 14px", fontSize: 12, fontFamily: "monospace" }}>⚠️ {error}</div>}
            <div style={{ height: 190, borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "6px 14px", color: "#22d3ee", fontSize: 11, fontWeight: 700, textTransform: "uppercase", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between" }}>
                <span>Serial Monitor</span>
                <button onClick={() => setSerial([])} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11 }}>tozalash</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px", fontFamily: "monospace", fontSize: 12, color: "#7ee787", whiteSpace: "pre-wrap" }}>
                {serial.length ? serial.join("\n") : <span style={{ color: "#475569" }}>Serial.println() natijalari shu yerda…</span>}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function TBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, fontSize: 15, color: "#374151" }}>
      {children}
    </button>
  );
}
function Sep() { return <div style={{ width: 1, height: 24, background: "#e5e7eb", margin: "0 4px" }} />; }

const selectStyle: React.CSSProperties = { background: "#fff", color: "#111827", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, cursor: "pointer" };
const inputStyle: React.CSSProperties = { background: "#fff", color: "#111827", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12 };
const btnLight: React.CSSProperties = { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnStart: React.CSSProperties = { background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const labelCol: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const muted: React.CSSProperties = { color: "#6b7280" };
