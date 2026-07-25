/**
 * A compact interpreter for a subset of the Arduino (C-like) language.
 *
 * It parses setup()/loop() plus user functions and executes them through a
 * generator so that `delay()` can suspend execution. The host scheduler drives
 * time forward by pulling `ms` values out of the generator.
 *
 * Supported: int/long/float/double/bool/byte/unsigned/char/String decls,
 * const, #define, if/else, for, while, do/while, break/continue/return,
 * arithmetic/logic/comparison, ++/--, compound assignment, ternary,
 * user functions, the Servo library object, and the common built-ins below.
 */

export interface Board {
  pinMode(pin: string, mode: number): void;
  digitalWrite(pin: string, value: number): void;
  digitalRead(pin: string): number;
  analogWrite(pin: string, value: number): void;
  analogRead(pin: string): number;
  tone(pin: string, freq: number): void;
  noTone(pin: string): void;
  servoAttach(id: string, pin: string): void;
  servoWrite(id: string, angle: number): void;
  servoRead(id: string): number;
  millis(): number;
  serial(text: string): void;
}

type Val = number | string | boolean;

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
type Tok = { t: string; v: string; pos: number };

const KEYWORDS = new Set([
  "int", "long", "float", "double", "bool", "boolean", "byte", "char",
  "unsigned", "void", "const", "String", "if", "else", "for", "while",
  "do", "return", "break", "continue", "static", "true", "false", "Servo",
]);

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    // whitespace
    if (/\s/.test(c)) { i++; continue; }
    // line comment
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    // block comment
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    // preprocessor line (handled separately, but skip here)
    if (c === "#") {
      let line = "";
      while (i < n && src[i] !== "\n") { line += src[i]; i++; }
      toks.push({ t: "pp", v: line, pos: i });
      continue;
    }
    // string
    if (c === '"') {
      let s = "";
      i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === "\\") { s += src[i + 1]; i += 2; }
        else { s += src[i]; i++; }
      }
      i++;
      toks.push({ t: "str", v: s, pos: i });
      continue;
    }
    // char literal
    if (c === "'") {
      let s = "";
      i++;
      while (i < n && src[i] !== "'") {
        if (src[i] === "\\") {
          const e = src[i + 1];
          s += e === "n" ? "\n" : e === "t" ? "\t" : e === "0" ? "\0" : e;
          i += 2;
        } else { s += src[i]; i++; }
      }
      i++;
      toks.push({ t: "char", v: s, pos: i });
      continue;
    }
    // number
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1]))) {
      let s = "";
      if (c === "0" && (src[i + 1] === "x" || src[i + 1] === "X")) {
        s = "0x"; i += 2;
        while (i < n && /[0-9a-fA-F]/.test(src[i])) { s += src[i]; i++; }
      } else {
        while (i < n && /[0-9.]/.test(src[i])) { s += src[i]; i++; }
        // suffixes like L, UL, f
        while (i < n && /[uUlLfF]/.test(src[i])) i++;
      }
      toks.push({ t: "num", v: s, pos: i });
      continue;
    }
    // identifier
    if (/[A-Za-z_]/.test(c)) {
      let s = "";
      while (i < n && /[A-Za-z0-9_]/.test(src[i])) { s += src[i]; i++; }
      toks.push({ t: KEYWORDS.has(s) ? "kw" : "id", v: s, pos: i });
      continue;
    }
    // multi-char operators
    const three = src.substr(i, 3);
    if (["<<=", ">>=", "&&=", "||="].includes(three)) { toks.push({ t: "op", v: three, pos: i }); i += 3; continue; }
    const two = src.substr(i, 2);
    if (["==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "<<", ">>", "->"].includes(two)) {
      toks.push({ t: "op", v: two, pos: i }); i += 2; continue;
    }
    toks.push({ t: "op", v: c, pos: i });
    i++;
  }
  toks.push({ t: "eof", v: "", pos: i });
  return toks;
}

// ---------------------------------------------------------------------------
// Parser (recursive descent) -> AST (plain objects with `k` kind tag)
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
type Node = any;

class Parser {
  toks: Tok[];
  p = 0;
  defines: Record<string, string> = {};

  constructor(toks: Tok[]) {
    this.toks = toks.filter((t) => {
      if (t.t === "pp") { this.handlePP(t.v); return false; }
      return true;
    });
  }

  handlePP(line: string) {
    const m = line.match(/#\s*define\s+(\w+)\s+(.+)/);
    if (m) this.defines[m[1]] = m[2].trim();
  }

  peek(o = 0): Tok { return this.toks[this.p + o]; }
  next(): Tok { return this.toks[this.p++]; }
  is(v: string): boolean { return this.peek().v === v; }
  eat(v: string): Tok {
    if (this.peek().v !== v) throw new Error(`Kutilgan '${v}', lekin '${this.peek().v}' topildi`);
    return this.next();
  }
  isType(): boolean {
    const t = this.peek();
    return t.t === "kw" && ["int", "long", "float", "double", "bool", "boolean", "byte", "char", "unsigned", "void", "String", "Servo"].includes(t.v);
  }

  parseProgram(): Node {
    const globals: Node[] = [];
    const functions: Record<string, Node> = {};
    while (this.peek().t !== "eof") {
      // Could be a function def or a global var / servo decl.
      const save = this.p;
      if (this.is("const") || this.is("static")) this.next();
      if (this.isType()) {
        this.next(); // return/decl type keyword
        while (this.isType()) this.next(); // unsigned int, etc.
        const name = this.next().v;
        if (this.is("(")) {
          // function definition
          this.eat("(");
          const params: { type: string; name: string }[] = [];
          while (!this.is(")")) {
            while (this.isType() || this.is("const")) { this.next(); }
            const pname = this.peek().t === "id" ? this.next().v : "";
            if (pname) params.push({ type: "", name: pname });
            if (this.is(",")) this.next();
            else break;
          }
          this.eat(")");
          const body = this.parseBlock();
          functions[name] = { k: "func", name, params, body };
        } else {
          // global var(s)
          this.p = save;
          globals.push(this.parseVarDecl());
        }
      } else {
        // unknown top-level token; skip to be tolerant
        this.next();
      }
    }
    return { k: "program", globals, functions };
  }

  parseBlock(): Node {
    this.eat("{");
    const stmts: Node[] = [];
    while (!this.is("}") && this.peek().t !== "eof") stmts.push(this.parseStmt());
    this.eat("}");
    return { k: "block", stmts };
  }

  parseStmt(): Node {
    const t = this.peek();
    if (t.v === "{") return this.parseBlock();
    if (t.v === "if") return this.parseIf();
    if (t.v === "for") return this.parseFor();
    if (t.v === "while") return this.parseWhile();
    if (t.v === "do") return this.parseDoWhile();
    if (t.v === "return") {
      this.next();
      let arg = null;
      if (!this.is(";")) arg = this.parseExpr();
      this.eat(";");
      return { k: "return", arg };
    }
    if (t.v === "break") { this.next(); this.eat(";"); return { k: "break" }; }
    if (t.v === "continue") { this.next(); this.eat(";"); return { k: "continue" }; }
    if (this.is("const") || this.is("static") || this.isType()) return this.parseVarDecl();
    // expression statement
    const e = this.parseExpr();
    this.eat(";");
    return { k: "exprStmt", expr: e };
  }

  parseVarDecl(): Node {
    if (this.is("const") || this.is("static")) this.next();
    let typeName = this.next().v;
    while (this.isType()) typeName += " " + this.next().v;
    const decls: { name: string; init: Node | null }[] = [];
    do {
      const name = this.next().v;
      // ignore array sizing like buf[10]
      if (this.is("[")) { this.next(); while (!this.is("]")) this.next(); this.eat("]"); }
      let init: Node | null = null;
      if (this.is("=")) { this.next(); init = this.parseAssign(); }
      decls.push({ name, init });
    } while (this.is(",") && (this.next(), true));
    this.eat(";");
    return { k: "varDecl", type: typeName, decls };
  }

  parseIf(): Node {
    this.eat("if"); this.eat("(");
    const cond = this.parseExpr();
    this.eat(")");
    const then = this.parseStmt();
    let els: Node | null = null;
    if (this.is("else")) { this.next(); els = this.parseStmt(); }
    return { k: "if", cond, then, els };
  }

  parseFor(): Node {
    this.eat("for"); this.eat("(");
    let init: Node | null = null;
    if (!this.is(";")) {
      if (this.is("const") || this.isType()) init = this.parseVarDecl();
      else { init = { k: "exprStmt", expr: this.parseExpr() }; this.eat(";"); }
    } else this.eat(";");
    let cond: Node | null = null;
    if (!this.is(";")) cond = this.parseExpr();
    this.eat(";");
    let step: Node | null = null;
    if (!this.is(")")) step = this.parseExpr();
    this.eat(")");
    const body = this.parseStmt();
    return { k: "for", init, cond, step, body };
  }

  parseWhile(): Node {
    this.eat("while"); this.eat("(");
    const cond = this.parseExpr();
    this.eat(")");
    const body = this.parseStmt();
    return { k: "while", cond, body };
  }

  parseDoWhile(): Node {
    this.eat("do");
    const body = this.parseStmt();
    this.eat("while"); this.eat("(");
    const cond = this.parseExpr();
    this.eat(")"); this.eat(";");
    return { k: "dowhile", cond, body };
  }

  parseExpr(): Node { return this.parseAssign(); }

  parseAssign(): Node {
    const left = this.parseTernary();
    const op = this.peek().v;
    if (["=", "+=", "-=", "*=", "/=", "%="].includes(op)) {
      this.next();
      const right = this.parseAssign();
      return { k: "assign", op, left, right };
    }
    return left;
  }

  parseTernary(): Node {
    const cond = this.parseBinary(0);
    if (this.is("?")) {
      this.next();
      const a = this.parseAssign();
      this.eat(":");
      const b = this.parseAssign();
      return { k: "ternary", cond, a, b };
    }
    return cond;
  }

  static PREC: Record<string, number> = {
    "||": 1, "&&": 2, "|": 3, "^": 4, "&": 5,
    "==": 6, "!=": 6, "<": 7, ">": 7, "<=": 7, ">=": 7,
    "<<": 8, ">>": 8, "+": 9, "-": 9, "*": 10, "/": 10, "%": 10,
  };

  parseBinary(minPrec: number): Node {
    let left = this.parseUnary();
    while (true) {
      const op = this.peek().v;
      const prec = Parser.PREC[op];
      if (prec === undefined || prec < minPrec) break;
      this.next();
      const right = this.parseBinary(prec + 1);
      left = { k: "bin", op, left, right };
    }
    return left;
  }

  parseUnary(): Node {
    const t = this.peek();
    if (["!", "-", "+", "~"].includes(t.v)) {
      this.next();
      return { k: "unary", op: t.v, arg: this.parseUnary() };
    }
    if (t.v === "++" || t.v === "--") {
      this.next();
      return { k: "preInc", op: t.v, arg: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  parsePostfix(): Node {
    let e = this.parsePrimary();
    while (true) {
      if (this.is(".")) {
        this.next();
        const prop = this.next().v;
        if (this.is("(")) {
          const args = this.parseArgs();
          e = { k: "method", obj: e, method: prop, args };
        } else {
          e = { k: "member", obj: e, prop };
        }
      } else if (this.is("(")) {
        const args = this.parseArgs();
        e = { k: "call", callee: e, args };
      } else if (this.is("[")) {
        this.next();
        const idx = this.parseExpr();
        this.eat("]");
        e = { k: "index", obj: e, index: idx };
      } else if (this.is("++") || this.is("--")) {
        const op = this.next().v;
        e = { k: "postInc", op, arg: e };
      } else break;
    }
    return e;
  }

  parseArgs(): Node[] {
    this.eat("(");
    const args: Node[] = [];
    while (!this.is(")")) {
      args.push(this.parseAssign());
      if (this.is(",")) this.next();
      else break;
    }
    this.eat(")");
    return args;
  }

  parsePrimary(): Node {
    const t = this.peek();
    if (t.v === "(") { this.next(); const e = this.parseExpr(); this.eat(")"); return e; }
    if (t.t === "num") { this.next(); return { k: "num", value: t.v.startsWith("0x") ? parseInt(t.v, 16) : parseFloat(t.v) }; }
    if (t.t === "str") { this.next(); return { k: "str", value: t.v }; }
    if (t.t === "char") { this.next(); return { k: "num", value: t.v.charCodeAt(0) }; }
    if (t.v === "true") { this.next(); return { k: "num", value: 1 }; }
    if (t.v === "false") { this.next(); return { k: "num", value: 0 }; }
    if (t.t === "id") {
      this.next();
      if (this.defines[t.v] !== undefined) {
        const sub = new Parser(tokenize(this.defines[t.v]));
        return sub.parseExpr();
      }
      return { k: "id", name: t.v };
    }
    if (t.t === "kw") { this.next(); return { k: "id", name: t.v }; }
    throw new Error(`Kutilmagan token: '${t.v}'`);
  }
}

// ---------------------------------------------------------------------------
// Interpreter
// ---------------------------------------------------------------------------
const CONSTANTS: Record<string, number> = {
  HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2,
  true: 1, false: 0, LED_BUILTIN: 13,
  A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19,
  PI: Math.PI, DEC: 10, HEX: 16, BIN: 2, OCT: 8,
};

class Env {
  vars = new Map<string, Val>();
  parent: Env | null;
  constructor(parent: Env | null = null) { this.parent = parent; }
  get(name: string): Val | undefined {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    return undefined;
  }
  setExisting(name: string, v: Val): boolean {
    if (this.vars.has(name)) { this.vars.set(name, v); return true; }
    if (this.parent) return this.parent.setExisting(name, v);
    return false;
  }
  declare(name: string, v: Val) { this.vars.set(name, v); }
}

class Signal { constructor(public type: "break" | "continue" | "return", public value?: Val) {} }

/** Normalize pin identifiers: numbers 14-19 -> A0..A5. */
export function normPin(p: Val): string {
  if (typeof p === "string") {
    if (/^A[0-5]$/i.test(p)) return p.toUpperCase();
    const n = Number(p);
    if (!isNaN(n)) return normPin(n);
    return p;
  }
  const n = Math.round(Number(p));
  if (n >= 14 && n <= 19) return "A" + (n - 14);
  return String(n);
}

export class ArduinoRuntime {
  program: Node;
  board: Board;
  globalEnv = new Env();
  private servoNames: string[] = [];
  onError?: (msg: string) => void;
  private opBudget = 0;

  constructor(source: string, board: Board) {
    this.board = board;
    const toks = tokenize(source);
    const parser = new Parser(toks);
    this.program = parser.parseProgram();
  }

  /** Names of Servo variables declared in the sketch (for wiring/binding). */
  getServoNames(): string[] {
    if (this.servoNames.length) return this.servoNames;
    for (const g of this.program.globals) {
      if (g.k === "varDecl" && g.type === "Servo") {
        for (const d of g.decls) this.servoNames.push(d.name);
      }
    }
    return this.servoNames;
  }

  hasSetup(): boolean { return !!this.program.functions["setup"]; }
  hasLoop(): boolean { return !!this.program.functions["loop"]; }

  /** Run the whole program: setup once, then loop forever, yielding delay ms. */
  *run(): Generator<number, void, void> {
    // init globals
    for (const g of this.program.globals) {
      yield* this.execStmt(g, this.globalEnv);
    }
    if (this.program.functions["setup"]) {
      yield* this.callUserFunc(this.program.functions["setup"], []);
    }
    const loop = this.program.functions["loop"];
    while (true) {
      if (loop) yield* this.callUserFunc(loop, []);
      yield 0; // loop boundary tick so the scheduler can breathe
    }
  }

  private checkBudget() {
    if (++this.opBudget > 2_000_000) {
      this.opBudget = 0;
      throw new Error("Bajarilish limiti oshib ketdi (cheksiz sikl?)");
    }
  }

  private *callUserFunc(fn: Node, args: Val[]): Generator<number, Val, void> {
    const env = new Env(this.globalEnv);
    fn.params.forEach((p: any, i: number) => env.declare(p.name, args[i] ?? 0));
    const sig = yield* this.execBlock(fn.body, env);
    if (sig instanceof Signal && sig.type === "return") return sig.value ?? 0;
    return 0;
  }

  private *execBlock(block: Node, env: Env): Generator<number, Signal | void, void> {
    const local = new Env(env);
    for (const s of block.stmts) {
      const sig = yield* this.execStmt(s, local);
      if (sig instanceof Signal) return sig;
    }
  }

  private *execStmt(node: Node, env: Env): Generator<number, Signal | void, void> {
    this.checkBudget();
    switch (node.k) {
      case "block": return yield* this.execBlock(node, env);
      case "varDecl": {
        for (const d of node.decls) {
          let v: Val = 0;
          if (node.type === "String") v = "";
          if (d.init) v = yield* this.evalExpr(d.init, env);
          env.declare(d.name, v);
        }
        return;
      }
      case "exprStmt": yield* this.evalExpr(node.expr, env); return;
      case "if": {
        const c = yield* this.evalExpr(node.cond, env);
        if (truthy(c)) return yield* this.execStmt(node.then, env);
        else if (node.els) return yield* this.execStmt(node.els, env);
        return;
      }
      case "while": {
        while (truthy(yield* this.evalExpr(node.cond, env))) {
          yield 0;
          const sig = yield* this.execStmt(node.body, env);
          if (sig instanceof Signal) {
            if (sig.type === "break") break;
            if (sig.type === "return") return sig;
          }
        }
        return;
      }
      case "dowhile": {
        do {
          yield 0;
          const sig = yield* this.execStmt(node.body, env);
          if (sig instanceof Signal) {
            if (sig.type === "break") break;
            if (sig.type === "return") return sig;
          }
        } while (truthy(yield* this.evalExpr(node.cond, env)));
        return;
      }
      case "for": {
        const local = new Env(env);
        if (node.init) yield* this.execStmt(node.init, local);
        while (node.cond ? truthy(yield* this.evalExpr(node.cond, local)) : true) {
          yield 0;
          const sig = yield* this.execStmt(node.body, local);
          if (sig instanceof Signal) {
            if (sig.type === "break") break;
            if (sig.type === "return") return sig;
          }
          if (node.step) yield* this.evalExpr(node.step, local);
        }
        return;
      }
      case "return": {
        const v = node.arg ? yield* this.evalExpr(node.arg, env) : undefined;
        return new Signal("return", v);
      }
      case "break": return new Signal("break");
      case "continue": return new Signal("continue");
      default: return;
    }
  }

  private *evalExpr(node: Node, env: Env): Generator<number, Val, void> {
    this.checkBudget();
    switch (node.k) {
      case "num": return node.value;
      case "str": return node.value;
      case "id": {
        if (env.get(node.name) !== undefined) return env.get(node.name)!;
        if (node.name in CONSTANTS) return CONSTANTS[node.name];
        return 0;
      }
      case "assign": {
        const rhs = yield* this.evalExpr(node.right, env);
        const name = node.left.name;
        let value: Val = rhs;
        if (node.op !== "=") {
          const cur = Number(env.get(name) ?? 0);
          const r = Number(rhs);
          value = node.op === "+=" ? cur + r : node.op === "-=" ? cur - r
            : node.op === "*=" ? cur * r : node.op === "/=" ? cur / r : cur % r;
        }
        if (!env.setExisting(name, value)) env.declare(name, value);
        return value;
      }
      case "bin": return yield* this.evalBin(node, env);
      case "unary": {
        const a = yield* this.evalExpr(node.arg, env);
        if (node.op === "!") return truthy(a) ? 0 : 1;
        if (node.op === "-") return -Number(a);
        if (node.op === "~") return ~Number(a);
        return Number(a);
      }
      case "preInc": {
        const name = node.arg.name;
        const cur = Number(env.get(name) ?? 0);
        const nv = node.op === "++" ? cur + 1 : cur - 1;
        env.setExisting(name, nv);
        return nv;
      }
      case "postInc": {
        const name = node.arg.name;
        const cur = Number(env.get(name) ?? 0);
        const nv = node.op === "++" ? cur + 1 : cur - 1;
        env.setExisting(name, nv);
        return cur;
      }
      case "ternary": {
        const c = yield* this.evalExpr(node.cond, env);
        return truthy(c) ? yield* this.evalExpr(node.a, env) : yield* this.evalExpr(node.b, env);
      }
      case "index": return 0;
      case "member": {
        if (node.prop in CONSTANTS) return CONSTANTS[node.prop];
        return 0;
      }
      case "call": return yield* this.evalCall(node, env);
      case "method": return yield* this.evalMethod(node, env);
      default: return 0;
    }
  }

  private *evalBin(node: Node, env: Env): Generator<number, Val, void> {
    // short-circuit
    if (node.op === "&&") {
      const l = yield* this.evalExpr(node.left, env);
      if (!truthy(l)) return 0;
      return truthy(yield* this.evalExpr(node.right, env)) ? 1 : 0;
    }
    if (node.op === "||") {
      const l = yield* this.evalExpr(node.left, env);
      if (truthy(l)) return 1;
      return truthy(yield* this.evalExpr(node.right, env)) ? 1 : 0;
    }
    const l = yield* this.evalExpr(node.left, env);
    const r = yield* this.evalExpr(node.right, env);
    // String concatenation
    if (node.op === "+" && (typeof l === "string" || typeof r === "string")) {
      return toStr(l) + toStr(r);
    }
    const a = Number(l), b = Number(r);
    switch (node.op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? 0 : a / b;
      case "%": return b === 0 ? 0 : a % b;
      case "==": return l == r ? 1 : 0;
      case "!=": return l != r ? 1 : 0;
      case "<": return a < b ? 1 : 0;
      case ">": return a > b ? 1 : 0;
      case "<=": return a <= b ? 1 : 0;
      case ">=": return a >= b ? 1 : 0;
      case "&": return a & b;
      case "|": return a | b;
      case "^": return a ^ b;
      case "<<": return a << b;
      case ">>": return a >> b;
      default: return 0;
    }
  }

  private *evalArgs(args: Node[], env: Env): Generator<number, Val[], void> {
    const out: Val[] = [];
    for (const a of args) out.push(yield* this.evalExpr(a, env));
    return out;
  }

  private *evalCall(node: Node, env: Env): Generator<number, Val, void> {
    const name = node.callee.k === "id" ? node.callee.name : "";
    const a = yield* this.evalArgs(node.args, env);
    // user function?
    const uf = this.program.functions[name];
    if (uf) return yield* this.callUserFunc(uf, a);
    switch (name) {
      case "pinMode": this.board.pinMode(normPin(a[0]), Number(a[1])); return 0;
      case "digitalWrite": this.board.digitalWrite(normPin(a[0]), truthy(a[1]) ? 1 : 0); return 0;
      case "digitalRead": return this.board.digitalRead(normPin(a[0]));
      case "analogWrite": this.board.analogWrite(normPin(a[0]), clamp(Number(a[1]), 0, 255)); return 0;
      case "analogRead": return this.board.analogRead(normPin(a[0]));
      case "delay": { const ms = Math.max(0, Number(a[0])); yield ms; return 0; }
      case "delayMicroseconds": { yield Number(a[0]) / 1000; return 0; }
      case "tone": this.board.tone(normPin(a[0]), Number(a[1])); return 0;
      case "noTone": this.board.noTone(normPin(a[0])); return 0;
      case "millis": return this.board.millis();
      case "micros": return this.board.millis() * 1000;
      case "map": return mapFn(Number(a[0]), Number(a[1]), Number(a[2]), Number(a[3]), Number(a[4]));
      case "constrain": return clamp(Number(a[0]), Number(a[1]), Number(a[2]));
      case "min": return Math.min(Number(a[0]), Number(a[1]));
      case "max": return Math.max(Number(a[0]), Number(a[1]));
      case "abs": return Math.abs(Number(a[0]));
      case "pow": return Math.pow(Number(a[0]), Number(a[1]));
      case "sqrt": return Math.sqrt(Number(a[0]));
      case "sin": return Math.sin(Number(a[0]));
      case "cos": return Math.cos(Number(a[0]));
      case "round": return Math.round(Number(a[0]));
      case "floor": return Math.floor(Number(a[0]));
      case "ceil": return Math.ceil(Number(a[0]));
      case "random":
        if (a.length >= 2) return Math.floor(Math.random() * (Number(a[1]) - Number(a[0]))) + Number(a[0]);
        return Math.floor(Math.random() * Number(a[0] ?? 0));
      case "randomSeed": return 0;
      default: return 0;
    }
  }

  private *evalMethod(node: Node, env: Env): Generator<number, Val, void> {
    const a = yield* this.evalArgs(node.args, env);
    const objName = node.obj.k === "id" ? node.obj.name : "";
    const m = node.method;
    if (objName === "Serial") {
      if (m === "begin") return 0;
      if (m === "print") { this.board.serial(toStr(a[0] ?? "")); return 0; }
      if (m === "println") { this.board.serial(toStr(a[0] ?? "") + "\n"); return 0; }
      if (m === "write") { this.board.serial(String.fromCharCode(Number(a[0]))); return 0; }
      if (m === "available") return 0;
      if (m === "read") return -1;
      return 0;
    }
    // Servo object methods
    if (this.getServoNames().includes(objName)) {
      if (m === "attach") { this.board.servoAttach(objName, normPin(a[0])); return 0; }
      if (m === "write") { this.board.servoWrite(objName, clamp(Number(a[0]), 0, 180)); return 0; }
      if (m === "writeMicroseconds") { this.board.servoWrite(objName, mapFn(Number(a[0]), 1000, 2000, 0, 180)); return 0; }
      if (m === "read") return this.board.servoRead(objName);
      if (m === "detach") return 0;
      return 0;
    }
    // String methods (minimal)
    return 0;
  }
}

// ---- helpers ---------------------------------------------------------------
function truthy(v: Val): boolean {
  if (typeof v === "string") return v.length > 0;
  return Number(v) !== 0;
}
function toStr(v: Val): string {
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  return String(v);
}
function clamp(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }
function mapFn(x: number, inLo: number, inHi: number, outLo: number, outHi: number): number {
  if (inHi === inLo) return outLo;
  return ((x - inLo) * (outHi - outLo)) / (inHi - inLo) + outLo;
}
