import { PlacedComponent, Wire, SimState, terminalKey } from "./types";
import { COMPONENT_LIBRARY } from "./componentLibrary";
import { ArduinoRuntime, Board, normPin } from "./arduino";

/** Simple union-find for building electrical nets. */
class DSU {
  parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let r = x;
    while (this.parent.get(r) !== r) r = this.parent.get(r)!;
    // path compression
    let c = x;
    while (this.parent.get(c) !== r) { const nx = this.parent.get(c)!; this.parent.set(c, r); c = nx; }
    return r;
  }
  union(a: string, b: string) { this.parent.set(this.find(a), this.find(b)); }
}

type Bridge = { a: string; b: string; kind: "resistor" | "switch" };

interface PinOut { digital: number; pwm: number | null; tone: number | null; }

const OUTPUT = 1;
const INPUT_PULLUP = 2;

export class Simulator {
  private getComponents: () => PlacedComponent[];
  private wires: Wire[];
  private runtime: ArduinoRuntime | null = null;
  private gen: Generator<number, void, void> | null = null;
  private pendingDelay = 0;

  private dsu = new DSU();
  private netOf = new Map<string, string>(); // terminalKey -> net root
  private bridges: Bridge[] = [];

  private pinModes = new Map<string, number>();
  private pinOut = new Map<string, PinOut>();
  private pinReadCache = new Map<string, number>();
  private servoPin = new Map<string, string>();
  private servoAngle = new Map<string, number>();

  private dirty = true;
  private simTimeMs = 0;
  private serialBuf: string[] = [];
  running = false;
  error: string | null = null;
  speed = 1;

  // cached electrical analysis (recomputed when dirty)
  private energized = new Set<string>();
  private energizedNoR = new Set<string>();
  private ground = new Set<string>();
  private groundNoR = new Set<string>();
  private energizedDuty = new Map<string, number>();
  private netTone = new Map<string, number>();

  constructor(getComponents: () => PlacedComponent[], wires: Wire[]) {
    this.getComponents = getComponents;
    this.wires = wires;
  }

  // ---- netlist -----------------------------------------------------------
  private buildNets() {
    this.dsu = new DSU();
    const comps = this.getComponents();
    // register all terminals
    for (const c of comps) {
      const def = COMPONENT_LIBRARY[c.type];
      for (const t of def.terminals) this.dsu.find(terminalKey(c.id, t.id));
      // internal merges (breadboard columns/rails, bb-node, pushbutton sides, ...)
      if (def.internalGroups) {
        for (const grp of def.internalGroups) {
          for (let i = 1; i < grp.length; i++) {
            this.dsu.union(terminalKey(c.id, grp[0]), terminalKey(c.id, grp[i]));
          }
        }
      }
    }
    for (const w of this.wires) {
      this.dsu.union(terminalKey(w.from.compId, w.from.terminalId), terminalKey(w.to.compId, w.to.terminalId));
    }
    this.netOf.clear();
    for (const c of comps) {
      const def = COMPONENT_LIBRARY[c.type];
      for (const t of def.terminals) {
        const k = terminalKey(c.id, t.id);
        this.netOf.set(k, this.dsu.find(k));
      }
    }
  }

  private net(compId: string, terminalId: string): string {
    return this.netOf.get(terminalKey(compId, terminalId)) ?? terminalKey(compId, terminalId);
  }

  // ---- electrical analysis ----------------------------------------------
  private computeElectrical() {
    const comps = this.getComponents();
    this.bridges = [];
    const sources: { net: string; duty: number; tone: number | null }[] = [];
    const grounds: string[] = [];

    for (const c of comps) {
      const def = COMPONENT_LIBRARY[c.type];
      if (c.type === "arduino-uno") {
        for (const t of def.terminals) {
          const net = this.net(c.id, t.id);
          if (t.role === "power5v" || t.role === "vin") sources.push({ net, duty: 1, tone: null });
          else if (t.role === "power3v3") sources.push({ net, duty: 0.66, tone: null });
          else if (t.role === "gnd") grounds.push(net);
          else if ((t.role === "digital" || t.role === "analog") && t.pin) {
            const pk = normPin(t.pin);
            const mode = this.pinModes.get(pk) ?? 0;
            if (mode === OUTPUT) {
              const o = this.pinOut.get(pk);
              if (o) {
                if (o.tone != null) sources.push({ net, duty: 1, tone: o.tone });
                else if (o.pwm != null) {
                  if (o.pwm > 0) sources.push({ net, duty: o.pwm / 255, tone: null });
                  else grounds.push(net);
                } else if (o.digital === 1) sources.push({ net, duty: 1, tone: null });
                else grounds.push(net);
              } else grounds.push(net);
            }
          }
        }
      } else if (c.type === "resistor") {
        this.bridges.push({ a: this.net(c.id, "a"), b: this.net(c.id, "b"), kind: "resistor" });
      } else if (c.type === "potentiometer") {
        this.bridges.push({ a: this.net(c.id, "t1"), b: this.net(c.id, "t2"), kind: "resistor" });
      } else if (c.type === "pushbutton") {
        if (c.props.pressed) this.bridges.push({ a: this.net(c.id, "1a"), b: this.net(c.id, "2a"), kind: "switch" });
      }
    }

    // BFS reachability
    const adj = new Map<string, { to: string; kind: Bridge["kind"] }[]>();
    const addAdj = (a: string, b: string, kind: Bridge["kind"]) => {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push({ to: b, kind });
      adj.get(b)!.push({ to: a, kind });
    };
    for (const br of this.bridges) addAdj(br.a, br.b, br.kind);

    const reach = (starts: string[], noResistor: boolean): Set<string> => {
      const seen = new Set<string>(starts);
      const q = [...starts];
      while (q.length) {
        const cur = q.shift()!;
        for (const e of adj.get(cur) ?? []) {
          if (noResistor && e.kind === "resistor") continue;
          if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
        }
      }
      return seen;
    };

    const srcNets = sources.map((s) => s.net);
    this.energized = reach(srcNets, false);
    this.energizedNoR = reach(srcNets, true);
    this.ground = reach(grounds, false);
    this.groundNoR = reach(grounds, true);

    // duty & tone per net (max over reaching sources)
    this.energizedDuty = new Map();
    this.netTone = new Map();
    for (const s of sources) {
      const grp = reach([s.net], false);
      for (const net of grp) {
        this.energizedDuty.set(net, Math.max(this.energizedDuty.get(net) ?? 0, s.duty));
        if (s.tone != null) this.netTone.set(net, s.tone);
      }
    }
    this.dirty = false;
  }

  private ensure() { if (this.dirty) this.computeElectrical(); }

  // ---- Board interface for the interpreter ------------------------------
  private board: Board = {
    pinMode: (pin, mode) => { this.pinModes.set(pin, mode); this.dirty = true; },
    digitalWrite: (pin, value) => {
      const o = this.pinOut.get(pin) ?? { digital: 0, pwm: null, tone: null };
      o.digital = value; o.pwm = null; this.pinOut.set(pin, o); this.dirty = true;
    },
    analogWrite: (pin, value) => {
      const o = this.pinOut.get(pin) ?? { digital: 0, pwm: null, tone: null };
      o.pwm = value; o.tone = null; this.pinOut.set(pin, o); this.dirty = true;
    },
    digitalRead: (pin) => {
      this.ensure();
      const net = this.pinNet(pin);
      if (net == null) return this.pinReadCache.get(pin) ?? 0;
      const mode = this.pinModes.get(pin) ?? 0;
      if (mode === INPUT_PULLUP) return this.ground.has(net) ? 0 : 1;
      if (this.energized.has(net)) return 1;
      return 0;
    },
    analogRead: (pin) => {
      this.ensure();
      const net = this.pinNet(pin);
      if (net == null) return 0;
      // potentiometer wiper?
      for (const c of this.getComponents()) {
        if (c.type === "potentiometer" && this.net(c.id, "wiper") === net) {
          const v = Number(c.props.value ?? 512);
          return Math.round(clamp(v, 0, 1023));
        }
      }
      if (this.energized.has(net)) return Math.round((this.energizedDuty.get(net) ?? 1) * 1023);
      return 0;
    },
    tone: (pin, freq) => {
      const o = this.pinOut.get(pin) ?? { digital: 0, pwm: null, tone: null };
      o.tone = freq; this.pinOut.set(pin, o); this.dirty = true;
    },
    noTone: (pin) => {
      const o = this.pinOut.get(pin) ?? { digital: 0, pwm: null, tone: null };
      o.tone = null; o.digital = 0; this.pinOut.set(pin, o); this.dirty = true;
    },
    servoAttach: (id, pin) => { this.servoPin.set(id, pin); },
    servoWrite: (id, angle) => { this.servoAngle.set(id, angle); },
    servoRead: (id) => this.servoAngle.get(id) ?? 0,
    millis: () => Math.floor(this.simTimeMs),
    serial: (text) => { this.pushSerial(text); },
  };

  private pinNet(pin: string): string | null {
    for (const c of this.getComponents()) {
      if (c.type !== "arduino-uno") continue;
      const def = COMPONENT_LIBRARY[c.type];
      for (const t of def.terminals) {
        if (t.pin && normPin(t.pin) === pin) return this.net(c.id, t.id);
      }
    }
    return null;
  }

  private pushSerial(text: string) {
    const parts = (this.serialBuf.length ? this.serialBuf.pop()! : "") + text;
    const lines = parts.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (i < lines.length - 1) this.serialBuf.push(lines[i]);
      else this.serialBuf.push(lines[i]);
    }
    if (this.serialBuf.length > 200) this.serialBuf = this.serialBuf.slice(-200);
  }

  // ---- lifecycle ---------------------------------------------------------
  start(source: string): string | null {
    this.stop();
    this.error = null;
    this.simTimeMs = 0;
    this.serialBuf = [];
    this.pinModes.clear();
    this.pinOut.clear();
    this.servoPin.clear();
    this.servoAngle.clear();
    this.pinReadCache.clear();
    try {
      this.buildNets();
      this.runtime = new ArduinoRuntime(source, this.board);
      this.gen = this.runtime.run();
      this.pendingDelay = 0;
      this.dirty = true;
      this.running = true;
      return null;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.running = false;
      return this.error;
    }
  }

  stop() {
    this.running = false;
    this.gen = null;
    this.runtime = null;
    // release outputs
    this.pinOut.clear();
    this.servoAngle.clear();
    this.dirty = true;
  }

  /** Advance the sketch by up to dtMs of real time. */
  step(dtMs: number) {
    if (!this.running || !this.gen) return;
    // Re-read external inputs (button presses, potentiometer knobs) each frame.
    this.dirty = true;
    let budget = Math.min(dtMs, 60) * this.speed;
    let guard = 0;
    try {
      while (budget > 0 && guard < 50000) {
        guard++;
        if (this.pendingDelay > 0) {
          if (this.pendingDelay <= budget) {
            this.simTimeMs += this.pendingDelay;
            budget -= this.pendingDelay;
            this.pendingDelay = 0;
          } else {
            this.simTimeMs += budget;
            this.pendingDelay -= budget;
            budget = 0;
          }
          continue;
        }
        const r = this.gen.next();
        if (r.done) { this.running = false; break; }
        const ms = typeof r.value === "number" ? r.value : 0;
        if (ms > 0) this.pendingDelay = ms;
        // ms === 0 is a loop/iteration tick: keep going within budget
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.running = false;
    }
  }

  // ---- render state ------------------------------------------------------
  getState(): SimState {
    this.ensure();
    const ledBrightness: Record<string, number> = {};
    const rgb: Record<string, { r: number; g: number; b: number }> = {};
    const buzzer: Record<string, number> = {};
    const servo: Record<string, number> = {};
    const warnings: Record<string, string> = {};

    for (const c of this.getComponents()) {
      if (c.type === "led") {
        const aNet = this.net(c.id, "anode");
        const kNet = this.net(c.id, "cathode");
        const on = this.energized.has(aNet) && this.ground.has(kNet);
        ledBrightness[c.id] = on ? (this.energizedDuty.get(aNet) ?? 1) : 0;
        if (on && this.energizedNoR.has(aNet) && this.groundNoR.has(kNet)) {
          warnings[c.id] = "Rezistorsiz LED — kuyish xavfi!";
        }
      } else if (c.type === "rgb-led") {
        const kNet = this.net(c.id, "cathode");
        const grounded = this.ground.has(kNet);
        const ch = (leg: string) => {
          const net = this.net(c.id, leg);
          return grounded && this.energized.has(net) ? (this.energizedDuty.get(net) ?? 1) : 0;
        };
        rgb[c.id] = { r: ch("r"), g: ch("g"), b: ch("b") };
      } else if (c.type === "buzzer") {
        const p = this.net(c.id, "pos");
        const n = this.net(c.id, "neg");
        const on = this.energized.has(p) && this.ground.has(n);
        buzzer[c.id] = on ? (this.netTone.get(p) ?? 0) : 0;
      } else if (c.type === "servo") {
        const sigNet = this.net(c.id, "sig");
        // find which pin drives sig, then which servo var is attached there
        let angle = 0;
        for (const [name, pin] of this.servoPin) {
          if (this.pinNet(pin) === sigNet) { angle = this.servoAngle.get(name) ?? 0; break; }
        }
        servo[c.id] = angle;
      }
    }

    return {
      running: this.running,
      ledBrightness,
      rgb,
      buzzer,
      servo,
      warnings,
      serial: [...this.serialBuf],
      timeMs: Math.floor(this.simTimeMs),
    };
  }

  markDirty() { this.dirty = true; }
}

function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }
