"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useElectronicsStore } from "../../../store/electronicsStore";
import { Simulator } from "../../../components/electronics/engine";
import CircuitCanvas from "../../../components/electronics/CircuitCanvas";
import { CompVisual, ComponentDragPreview } from "../../../components/electronics/ComponentView";
import { COMPONENT_LIBRARY, PALETTE_ORDER, LED_COLORS, SIMULATED, PROP_UNITS, unitFor } from "../../../components/electronics/componentLibrary";
import { ComponentType, SimState } from "../../../components/electronics/types";
import { compile, CompileResult, Diagnostic } from "../../../components/electronics/arduino";
import { LIBRARIES } from "../../../components/electronics/libraries";
import { EXAMPLES, DEFAULT_CODE } from "../../../components/electronics/examples";
import { logIteration } from "../../../store/iterationStore";
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBooks,
  IconCheck,
  IconCircuitGround,
  IconCode,
  IconCopy,
  IconList,
  IconPlayerPlay,
  IconPlayerStop,
  IconRotateClockwise2,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

const WIRE_COLORS = ["#111827", "#dc2626", "#16a34a", "#2563eb", "#ca8a04", "#9333ea", "#0891b2", "#f97316"];
// Ordered to match Tinkercad's own category rhythm (General/Input/Output/
// Breadboards/Microcontrollers) - the palette below renders one labeled
// section per category, in this order, when "Hammasi" (All) is selected.
const CATEGORIES: { key: string; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "general", label: "Umumiy" },
  { key: "input", label: "Kirish" },
  { key: "output", label: "Chiqish" },
  { key: "power", label: "Quvvat manbalari" },
  { key: "ics", label: "Mikrosxemalar" },
  { key: "breadboards", label: "Maketlar" },
  { key: "boards", label: "Mikrokontrollerlar" },
];

/** Uzbek names for the editable props parts declare in their `defaults`. */
const PROP_LABELS: Record<string, string> = {
  color: "Rang",
  // No unit in these two labels: the multiplier is picked in the field itself.
  ohms: "Qarshilik",
  value: "Qiymat",
  uF: "Sig'im",
  on: "Yoqilgan",
  closed: "Yopiq",
  pressed: "Bosilgan",
};

/** Props rendered as an on/off checkbox rather than a number field. */
const SWITCH_PROPS = new Set(["on", "closed", "pressed"]);

export default function ElectronicsPage() {
  const {
    components, wires, selectedId, selectedWireId, wireColor, setWireColor, setProp, removeComponent,
    rotateComponent, duplicateComponent, clear, loadExample, undo, redo,
    recolorWire, removeWire, selectWire,
  } = useElectronicsStore();

  const [title, setTitle] = useState("Mening zanjirim");
  const [code, setCode] = useState(DEFAULT_CODE);
  const [codeOpen, setCodeOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [visuals, setVisuals] = useState<Record<string, CompVisual>>({});
  const [serial, setSerial] = useState<string[]>([]);
  const [timeMs, setTimeMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  /** Last verify result: the diagnostics list and the "compiled" summary. */
  const [build, setBuild] = useState<CompileResult | null>(null);
  const [libsOpen, setLibsOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [dragPreview, setDragPreview] = useState<{ type: ComponentType; x: number; y: number } | null>(null);
  /**
   * Which multiplier each part's value is being typed in, per component and
   * prop. This is a view preference, not part of the circuit - the stored value
   * stays in the base unit - so it lives here rather than in the component.
   */
  const [unitPick, setUnitPick] = useState<Record<string, string>>({});

  const codeRef = useRef<HTMLTextAreaElement | null>(null);
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
      out[c.id] = {
        led: st.ledBrightness[c.id], rgb: st.rgb[c.id], servo: st.servo[c.id],
        buzzer: st.buzzer[c.id], motor: st.motor[c.id], lcd: st.lcd[c.id],
        warning: st.warnings[c.id],
      };
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

  /** Put the caret on a diagnostic's line, so clicking the error finds it. */
  const gotoLine = useCallback((line: number, col: number) => {
    const ta = codeRef.current;
    if (!ta) return;
    const lines = ta.value.split("\n");
    const offset = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0) + (col - 1);
    ta.focus();
    ta.setSelectionRange(offset, offset);
    // Roughly centre the line; textareas have no scrollIntoView for a caret.
    const lineH = ta.scrollHeight / Math.max(1, lines.length);
    ta.scrollTop = Math.max(0, (line - 1) * lineH - ta.clientHeight / 2);
  }, []);

  /** Verify without running, the way the IDE's tick button does. */
  const handleCompile = useCallback(() => {
    const result = compile(code);
    setBuild(result);
    setCodeOpen(true);
    setError(result.ok ? null : `${result.diagnostics.filter((d) => d.severity === "error").length} ta xato`);
    return result;
  }, [code]);

  const handleStart = useCallback(() => {
    const sim = new Simulator(() => useElectronicsStore.getState().components, structuredClone(useElectronicsStore.getState().wires));
    sim.speed = speed;
    const result = sim.start(code);
    setBuild(result);
    simRef.current = sim;
    // A sketch that does not compile does not run - the errors come up instead.
    if (!result.ok || sim.error) {
      setError(sim.error ?? "Kompilyatsiya xatosi");
      setRunning(false);
      setCodeOpen(true);
      return;
    }
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
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedWireId) { removeWire(selectedWireId); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { undo(); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { redo(); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selectedId) { duplicateComponent(selectedId); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selectedWireId, removeComponent, removeWire, undo, redo, duplicateComponent]);

  const selected = components.find((c) => c.id === selectedId) ?? null;
  const selectedWire = wires.find((w) => w.id === selectedWireId) ?? null;

  /** A colour swatch picks the selected wire's colour, or the next wire's. */
  const pickWireColor = useCallback((c: string) => {
    setWireColor(c);
    if (selectedWireId) recolorWire(selectedWireId, c);
  }, [setWireColor, recolorWire, selectedWireId]);

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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", background: "var(--canvas)", minHeight: 0 }}>
      {/* ================= TOP TOOLBAR ================= */}
      <div style={{ minHeight: 52, background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", flexShrink: 0, overflowX: "auto" }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          style={{ fontWeight: 700, fontSize: 14, border: "1px solid transparent", borderRadius: 6, padding: "5px 8px", width: 180, color: "#111827" }} />
        <Sep />
        <TBtn onClick={() => selected && duplicateComponent(selected.id)} disabled={!selected} title="Nusxa (Ctrl+D)"><IconCopy size={17} stroke={1.8} /></TBtn>
        <TBtn onClick={() => selected && removeComponent(selected.id)} disabled={!selected} title="O'chirish (Del)"><IconTrash size={17} stroke={1.8} /></TBtn>
        <Sep />
        <TBtn onClick={undo} title="Orqaga (Ctrl+Z)"><IconArrowBackUp size={17} stroke={1.8} /></TBtn>
        <TBtn onClick={redo} title="Oldinga (Ctrl+Y)"><IconArrowForwardUp size={17} stroke={1.8} /></TBtn>
        <Sep />
        <TBtn onClick={() => selected && rotateComponent(selected.id)} disabled={!selected} title="Burish"><IconRotateClockwise2 size={17} stroke={1.8} /></TBtn>
        <div title={selectedWire ? "Tanlangan simning rangi" : "Yangi sim rangi"}
          style={{ display: "flex", gap: 3, padding: "0 4px" }}>
          {WIRE_COLORS.map((c) => (
            <button key={c} onClick={() => pickWireColor(c)} title={c}
              style={{ width: 18, height: 18, borderRadius: 4, background: c, border: (selectedWire ? selectedWire.color : wireColor) === c ? "2px solid #111827" : "1px solid #d1d5db", cursor: "pointer" }} />
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
        <button onClick={() => setCodeOpen((v) => !v)} style={{ ...btnLight, background: codeOpen ? "var(--accent-soft)" : "var(--surface-muted)" }}><IconCode size={16} stroke={1.8} /> Kod</button>
        <button onClick={handleCompile} title="Kodni tekshirish (kompilyatsiya)" style={btnLight}><IconCheck size={16} stroke={1.8} /> Tekshirish</button>
        {!running
          ? <button onClick={handleStart} style={btnStart}><IconPlayerPlay size={16} stroke={1.8} /> Simulyatsiya</button>
          : <button onClick={handleStop} style={{ ...btnStart, background: "var(--danger)" }}><IconPlayerStop size={16} stroke={1.8} /> To&apos;xtatish</button>}
      </div>

      {/* ================= BODY ================= */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* canvas */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", minWidth: 0 }}>
          <CircuitCanvas visuals={visuals} />

          {/* status pill */}
          <div style={{ position: "absolute", top: 10, left: 10, background: "#ffffffcc", backdropFilter: "blur(4px)", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, color: running ? "#16a34a" : "#6b7280", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
            {running ? `Ishlayapti - ${(timeMs / 1000).toFixed(1)}s` : "To'xtatilgan"}
          </div>

          {/* floating inspector */}
          {selected && (
            <div style={{ position: "absolute", top: 10, right: 10, width: 210, background: "#fff", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", padding: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#111827" }}>{COMPONENT_LIBRARY[selected.type].name}</div>
              {/* One control per editable value the part declares, so a newly
                  added component gets its inspector for free. */}
              {Object.entries(COMPONENT_LIBRARY[selected.type].defaults ?? {}).map(([key, fallback]) => {
                const cur = selected.props[key] ?? fallback;
                const label = PROP_LABELS[key] ?? key;
                if (key === "color") {
                  // Swatches rather than a dropdown, to match the wire colours
                  // in the toolbar - you pick a red LED by clicking red.
                  return (
                    <div key={key} style={labelCol}><span style={muted}>{label}</span>
                      <div style={{ display: "flex", gap: 5 }}>
                        {Object.entries(LED_COLORS).map(([name, hexColor]) => (
                          <button key={name} title={name} onClick={() => setProp(selected.id, key, name)}
                            style={{
                              width: 22, height: 22, borderRadius: 5, background: hexColor, cursor: "pointer",
                              border: String(cur) === name ? "2px solid #111827" : "1px solid #d1d5db",
                            }} />
                        ))}
                      </div></div>);
                }
                if (SWITCH_PROPS.has(key)) {
                  return (
                    <label key={key} style={{ ...labelCol, flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <input type="checkbox" checked={!!Number(cur)}
                        onChange={(e) => setProp(selected.id, key, e.target.checked ? 1 : 0)} />
                      <span style={muted}>{label}</span></label>);
                }
                if (key === "value") {
                  return (
                    <label key={key} style={labelCol}><span style={muted}>{label}: {Number(cur)}</span>
                      <input type="range" min={0} max={1023} value={Number(cur)}
                        onChange={(e) => setProp(selected.id, key, Number(e.target.value))} /></label>);
                }
                if (PROP_UNITS[key]) {
                  // A figure plus its multiplier, so 220 Ω / 4.7 kΩ / 1 MΩ are
                  // all typed as the number actually printed on the part.
                  const units = PROP_UNITS[key];
                  const pickKey = `${selected.id}:${key}`;
                  const unit = units.find((u) => u.label === unitPick[pickKey])
                    ?? unitFor(key, Number(cur)) ?? units[0];
                  const mantissa = Number((Number(cur) / unit.mult).toFixed(4));
                  return (
                    <label key={key} style={labelCol}><span style={muted}>{label}</span>
                      <div style={{ display: "flex", gap: 5 }}>
                        <input type="number" min={0} step="any" value={mantissa}
                          onChange={(e) => setProp(selected.id, key, Number(e.target.value) * unit.mult)}
                          style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                        <select value={unit.label} style={{ ...selectStyle, width: 66 }}
                          onChange={(e) => {
                            const next = units.find((u) => u.label === e.target.value);
                            if (!next) return;
                            // Keep the number, change what it means.
                            setUnitPick((m) => ({ ...m, [pickKey]: next.label }));
                            setProp(selected.id, key, mantissa * next.mult);
                          }}>
                          {units.map((u) => <option key={u.label} value={u.label}>{u.label}</option>)}
                        </select>
                      </div></label>);
                }
                return (
                  <label key={key} style={labelCol}><span style={muted}>{label}</span>
                    <input type="number" min={0} step="any" value={Number(cur)}
                      onChange={(e) => setProp(selected.id, key, Number(e.target.value))} style={inputStyle} /></label>);
              })}
              {!SIMULATED.has(selected.type) && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#b45309", lineHeight: 1.35 }}>
                  Bu komponent hozircha simulyatsiya qilinmaydi. Chizmaga qo&apos;yish va ulash mumkin.
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => rotateComponent(selected.id)} style={btnLight} title="Burish"><IconRotateClockwise2 size={16} stroke={1.8} /></button>
                <button onClick={() => duplicateComponent(selected.id)} style={btnLight} title="Nusxa"><IconCopy size={16} stroke={1.8} /></button>
                <button onClick={() => removeComponent(selected.id)} style={{ ...btnLight, color: "var(--danger)" }} title="O'chirish"><IconTrash size={16} stroke={1.8} /></button>
              </div>
            </div>
          )}

          {/* The same panel for a selected wire: its colour, and how to route it. */}
          {selectedWire && (
            <div style={{ position: "absolute", top: 10, right: 10, width: 210, background: "#fff", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", padding: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#111827" }}>Sim</div>
              <span style={muted}>Rang</span>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "5px 0 10px" }}>
                {WIRE_COLORS.map((c) => (
                  <button key={c} title={c} onClick={() => recolorWire(selectedWire.id, c)}
                    style={{
                      width: 22, height: 22, borderRadius: 5, background: c, cursor: "pointer",
                      border: selectedWire.color === c ? "2px solid #111827" : "1px solid #d1d5db",
                    }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>
                Simni ikki marta bosib <b>belidan sindirish</b>{" "}mumkin. Burilish nuqtasini sudrab yo&apos;nalishni
                tuzatasiz; nuqtani ikki marta bosish uni yo&apos;q qiladi.
                {selectedWire.points?.length ? ` Burilishlar: ${selectedWire.points.length}` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button onClick={() => selectWire(null)} style={{ ...btnLight, flex: 1 }}>Bekor</button>
                <button onClick={() => removeWire(selectedWire.id)} style={{ ...btnLight, color: "var(--danger)" }} title="O'chirish"><IconTrash size={16} stroke={1.8} /></button>
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
                <span title="Ro'yxat ko'rinishi (tez orada)" style={{ color: "#9aa6b2", cursor: "not-allowed" }}><IconList size={18} stroke={1.8} /></span>
              </div>
              <label style={{ position: "relative", display: "block", marginTop: 8 }}>
                <IconSearch size={15} stroke={1.8} style={{ position: "absolute", left: 9, top: 8, color: "var(--ink-muted)" }} />
                <input aria-label="Komponentlarni qidirish" placeholder="Qidirish..." value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--line-strong)", borderRadius: 8, padding: "7px 10px 7px 30px", fontSize: 12 }} />
              </label>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
              {groupedTiles.map((g) => (
                <div key={g.key} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 8 }}>{g.label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {g.items.map((type) => {
                      const def = COMPONENT_LIBRARY[type];
                      return (
                        <div key={type} draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "copy";
                            e.dataTransfer.setData("component", type);
                            const ghost = document.createElement("canvas");
                            ghost.width = 1; ghost.height = 1;
                            e.dataTransfer.setDragImage(ghost, 0, 0);
                            setDragPreview({ type, x: e.clientX, y: e.clientY });
                          }}
                          onDrag={(e) => { if (e.clientX || e.clientY) setDragPreview({ type, x: e.clientX, y: e.clientY }); }}
                          onDragEnd={() => setDragPreview(null)}
                          title={`${def.name} - kanvasga sudrab tashlang${SIMULATED.has(type) ? "" : " (simulyatsiya qilinmaydi)"}`}
                          style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 4px 6px", textAlign: "center", cursor: "grab", transition: "box-shadow .15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          {/* The part's own artwork, letter-boxed - a tile that
                              looks like the thing you are about to drop. */}
                          <div style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {def.art
                              // eslint-disable-next-line @next/next/no-img-element -- a 34px local SVG thumbnail; next/image skips SVG optimisation anyway
                              ? <img src={`/electronics/${def.art}`} alt="" draggable={false}
                                  style={{ maxHeight: 34, maxWidth: 56, objectFit: "contain", opacity: SIMULATED.has(type) ? 1 : 0.55 }} />
                              : <IconCircuitGround size={26} stroke={1.7} color="var(--accent)" />}
                          </div>
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
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13 }}>Kod | Arduino C</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setLibsOpen((v) => !v)} title="Kutubxonalar"
                style={{ background: libsOpen ? "#1e3a5f" : "transparent", border: "1px solid #1e293b", borderRadius: 6, color: "#93c5fd", cursor: "pointer", fontSize: 11, padding: "4px 8px" }}>
                <IconBooks size={15} stroke={1.8} /> Kutubxonalar
              </button>
              <button onClick={handleCompile} title="Kompilyatsiya qilish"
                style={{ background: "#166534", border: "none", borderRadius: 6, color: "#dcfce7", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "5px 9px" }}>
                <IconCheck size={15} stroke={1.8} /> Tekshirish
              </button>
              <button onClick={() => setCodeOpen(false)} aria-label="Kodni yopish" style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex" }}><IconX size={17} stroke={1.8} /></button>
            </div>

            {libsOpen && (
              <div style={{ maxHeight: 210, overflowY: "auto", borderBottom: "1px solid #1e293b", background: "#0b1220", padding: "8px 12px" }}>
                <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                  Mavjud kutubxonalar. Bosing, kod qo&apos;shiladi
                </div>
                {LIBRARIES.map((lib) => {
                  const used = code.includes(`<${lib.header}>`);
                  return (
                    <div key={lib.header} style={{ marginBottom: 8, padding: "7px 9px", background: "#111a2e", borderRadius: 7, border: `1px solid ${used ? "#1d4ed8" : "#1e293b"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <code style={{ color: "#93c5fd", fontSize: 12 }}>#include &lt;{lib.header}&gt;</code>
                        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: lib.simulated ? "#14532d" : "#422006", color: lib.simulated ? "#86efac" : "#fdba74" }}>
                          {lib.simulated ? "ishlaydi" : "faqat kompilyatsiya"}
                        </span>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => { setCode(lib.snippet); setBuild(null); }}
                          style={{ background: "#1e293b", border: "none", borderRadius: 5, color: "#cbd5e1", cursor: "pointer", fontSize: 10, padding: "3px 7px" }}>
                          Misol
                        </button>
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.35, marginTop: 4 }}>{lib.note}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <textarea ref={codeRef} value={code} onChange={(e) => { setCode(e.target.value); setBuild(null); }}
              onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); const ta = e.currentTarget; const s = ta.selectionStart, en = ta.selectionEnd; setCode(code.slice(0, s) + "  " + code.slice(en)); requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; }); } }}
              spellCheck={false}
              style={{ flex: 1, minHeight: 0, resize: "none", background: "#0d1117", color: "#c9d1d9", border: "none", outline: "none", padding: 14, fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.55 }} />

            {/* Verify output: the diagnostics list, or the summary when clean. */}
            {build && (
              <div style={{ maxHeight: 150, overflowY: "auto", borderTop: "1px solid #1e293b", background: "#0b1220" }}>
                {build.diagnostics.length === 0 ? (
                  <div style={{ padding: "8px 14px", color: "#86efac", fontSize: 12, fontFamily: "monospace" }}>
                    {[
                      "Kompilyatsiya muvaffaqiyatli:",
                      `${build.stats.lines} satr,`,
                      `${build.stats.functions} ta funksiya,`,
                      `${build.stats.globals} ta global o'zgaruvchi,`,
                      build.stats.libraries.length ? `kutubxonalar: ${build.stats.libraries.join(", ")}` : "kutubxonasiz",
                    ].join(" ")}
                  </div>
                ) : (
                  build.diagnostics.map((d, i) => <DiagRow key={i} d={d} onGo={() => gotoLine(d.line, d.col)} />)
                )}
              </div>
            )}
            {error && !build && <div style={{ background: "#7f1d1d", color: "#fecaca", padding: "8px 14px", fontSize: 12, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 7 }}><IconAlertTriangle size={15} stroke={1.8} /> {error}</div>}
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
      {dragPreview && <ComponentDragPreview type={dragPreview.type} clientX={dragPreview.x} clientY={dragPreview.y} />}
    </div>
  );
}

/** One line of verify output; clicking it puts the caret on the offending line. */
function DiagRow({ d, onGo }: { d: Diagnostic; onGo: () => void }) {
  const err = d.severity === "error";
  return (
    <button
      onClick={onGo}
      style={{
        display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
        borderBottom: "1px solid #131c2e", padding: "6px 14px", cursor: "pointer",
        fontFamily: "ui-monospace, Consolas, monospace", fontSize: 11.5, lineHeight: 1.4,
        color: err ? "#fca5a5" : "#fcd34d",
      }}
    >
      <span style={{ opacity: 0.75 }}>{err ? "✖" : "▲"} {d.line}:{d.col}</span> {d.message}
    </button>
  );
}

function TBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, color: "var(--ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {children}
    </button>
  );
}
function Sep() { return <div style={{ width: 1, height: 24, background: "#e5e7eb", margin: "0 4px" }} />; }

const selectStyle: React.CSSProperties = { background: "#fff", color: "#111827", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, cursor: "pointer" };
const inputStyle: React.CSSProperties = { background: "#fff", color: "#111827", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12 };
const btnLight: React.CSSProperties = { background: "var(--surface-muted)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap" };
const btnStart: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" };
const labelCol: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const muted: React.CSSProperties = { color: "#6b7280" };
