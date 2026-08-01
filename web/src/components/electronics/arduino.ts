/**
 * A compact compiler and interpreter for a subset of the Arduino (C-like)
 * language.
 *
 * `compile()` parses the sketch and reports diagnostics with line and column,
 * the way verifying does in the Arduino IDE: syntax errors, a missing setup()
 * or loop(), an unknown library in an #include, a call to a function that does
 * not exist, a method on an object that was never declared, a variable used
 * before it is declared. Everything it accepts, `ArduinoRuntime` can then run.
 *
 * Execution goes through a generator so that `delay()` can suspend it; the host
 * scheduler drives time forward by pulling `ms` values out of the generator.
 *
 * Supported: int/long/float/double/bool/byte/unsigned/char/String decls, const,
 * #define, #include, if/else, for, while, do/while, break/continue/return,
 * arithmetic/logic/comparison, ++/--, compound assignment, ternary, user
 * functions, String methods, the libraries in libraries.ts, and the built-ins
 * listed in BUILTIN_FUNCS.
 */

import { LIB_BY_HEADER, LIBRARIES, FREE_HEADERS, knownHeaders } from "./libraries";

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
// Source positions
// ---------------------------------------------------------------------------
export interface Loc { line: number; col: number }

/** Turns character offsets into 1-based line/column, for diagnostics. */
export class SourceMap {
  private starts: number[] = [0];
  constructor(src: string) {
    for (let i = 0; i < src.length; i++) if (src[i] === "\n") this.starts.push(i + 1);
  }
  loc(pos: number): Loc {
    let lo = 0, hi = this.starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.starts[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, col: pos - this.starts[lo] + 1 };
  }
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
/**
 * `pos` is the offset the token *starts* at, so diagnostics point at it. `f`
 * marks a numeric literal written as a float, which is what decides whether
 * `a / b` truncates - see isFloatExpr.
 */
type Tok = { t: string; v: string; pos: number; f?: boolean };

const TYPE_KEYWORDS = [
  "int", "long", "float", "double", "bool", "boolean", "byte", "char",
  "unsigned", "void", "String", "short", "size_t", "uint8_t", "uint16_t",
  "uint32_t", "int8_t", "int16_t", "int32_t",
];

const KEYWORDS = new Set([
  ...TYPE_KEYWORDS,
  "const", "if", "else", "for", "while", "do", "return", "break", "continue",
  "static", "true", "false", "switch", "case", "default", "sizeof",
]);

/** Class names any library can introduce; always parseable, checked later. */
const LIB_TYPES = new Set(LIBRARIES.flatMap((l) => l.types));

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const start = i;
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    // preprocessor line, kept whole and handled by the parser
    if (c === "#") {
      let line = "";
      while (i < n && src[i] !== "\n") { line += src[i]; i++; }
      toks.push({ t: "pp", v: line, pos: start });
      continue;
    }
    if (c === '"') {
      let s = "";
      i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === "\\") {
          const e = src[i + 1];
          s += e === "n" ? "\n" : e === "t" ? "\t" : e;
          i += 2;
        } else { s += src[i]; i++; }
      }
      i++;
      toks.push({ t: "str", v: s, pos: start });
      continue;
    }
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
      toks.push({ t: "char", v: s, pos: start });
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1]))) {
      let s = "";
      if (c === "0" && (src[i + 1] === "x" || src[i + 1] === "X")) {
        s = "0x"; i += 2;
        while (i < n && /[0-9a-fA-F]/.test(src[i])) { s += src[i]; i++; }
      } else if (c === "0" && (src[i + 1] === "b" || src[i + 1] === "B")) {
        s = "0b"; i += 2;
        while (i < n && /[01]/.test(src[i])) { s += src[i]; i++; }
      } else {
        while (i < n && /[0-9.]/.test(src[i])) { s += src[i]; i++; }
        let suffix = "";
        while (i < n && /[uUlLfF]/.test(src[i])) { suffix += src[i]; i++; }
        toks.push({ t: "num", v: s, pos: start, f: s.includes(".") || /[fF]/.test(suffix) });
        continue;
      }
      toks.push({ t: "num", v: s, pos: start });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let s = "";
      while (i < n && /[A-Za-z0-9_]/.test(src[i])) { s += src[i]; i++; }
      toks.push({ t: KEYWORDS.has(s) ? "kw" : LIB_TYPES.has(s) ? "libtype" : "id", v: s, pos: start });
      continue;
    }
    const three = src.substr(i, 3);
    if (["<<=", ">>=", "..."].includes(three)) { toks.push({ t: "op", v: three, pos: start }); i += 3; continue; }
    const two = src.substr(i, 2);
    if (["==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>", "->", "::"].includes(two)) {
      toks.push({ t: "op", v: two, pos: start }); i += 2; continue;
    }
    toks.push({ t: "op", v: c, pos: start });
    i++;
  }
  toks.push({ t: "eof", v: "", pos: n });
  return toks;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------
export interface Diagnostic {
  severity: "error" | "warning";
  line: number;
  col: number;
  message: string;
}

/** A diagnostic before its offset has been resolved to a line. */
interface RawDiag { severity: "error" | "warning"; pos: number; message: string }

class ParseError extends Error {
  constructor(message: string, public pos: number) { super(message); }
}

// ---------------------------------------------------------------------------
// Parser (recursive descent) -> AST (plain objects with `k` kind tag)
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
type Node = any;

export interface IncludeRef { header: string; pos: number }

class Parser {
  toks: Tok[];
  p = 0;
  defines: Record<string, string> = {};
  includes: IncludeRef[] = [];
  errors: RawDiag[] = [];

  constructor(toks: Tok[]) {
    this.toks = toks.filter((t) => {
      if (t.t === "pp") { this.handlePP(t); return false; }
      return true;
    });
  }

  handlePP(tok: Tok) {
    const def = tok.v.match(/#\s*define\s+(\w+)\s*(.*)/);
    if (def && def[2].trim()) { this.defines[def[1]] = def[2].trim(); return; }
    const inc = tok.v.match(/#\s*include\s*[<"]([^>"]+)[>"]/);
    if (inc) { this.includes.push({ header: inc[1].trim(), pos: tok.pos }); return; }
    if (/#\s*(ifdef|ifndef|endif|else|elif|if|pragma|undef|define)\b/.test(tok.v)) return;
    this.errors.push({ severity: "warning", pos: tok.pos, message: `Tushunarsiz preprotsessor satri: ${tok.v.trim()}` });
  }

  peek(o = 0): Tok { return this.toks[Math.min(this.p + o, this.toks.length - 1)]; }
  next(): Tok { return this.toks[this.p++]; }
  is(v: string): boolean { return this.peek().v === v; }
  eat(v: string): Tok {
    if (this.peek().v !== v) {
      throw new ParseError(`'${v}' kutilgan edi, lekin '${this.peek().v || "fayl oxiri"}' topildi`, this.peek().pos);
    }
    return this.next();
  }
  isType(): boolean { return Parser.isTypeTok(this.peek()); }

  static isTypeTok(t: Tok): boolean {
    return (t.t === "kw" && TYPE_KEYWORDS.includes(t.v)) || t.t === "libtype";
  }

  /** Skip forward to just past the next `;` or matching `}`, to keep parsing. */
  resync() {
    let depth = 0;
    while (this.peek().t !== "eof") {
      const v = this.next().v;
      if (v === "{") depth++;
      else if (v === "}") { if (depth <= 0) return; depth--; }
      else if (v === ";" && depth === 0) return;
    }
  }

  /**
   * True when the `(` at the cursor opens a parameter list followed by a body,
   * rather than constructor arguments. `LiquidCrystal lcd(12, 11);` and
   * `void blink(int n) { }` look identical up to the closing paren.
   */
  private isFunctionDef(): boolean {
    let q = this.p, depth = 0;
    while (q < this.toks.length) {
      const v = this.toks[q].v;
      if (v === "(") depth++;
      else if (v === ")") { depth--; if (depth === 0) return this.toks[q + 1]?.v === "{"; }
      else if (v === ";" || this.toks[q].t === "eof") return false;
      q++;
    }
    return false;
  }

  parseProgram(): Node {
    const globals: Node[] = [];
    const functions: Record<string, Node> = {};
    while (this.peek().t !== "eof") {
      const save = this.p;
      try {
        if (this.is("const") || this.is("static")) this.next();
        if (!this.isType()) {
          throw new ParseError(`Bu yerda tur (int, void, ...) kutilgan edi, '${this.peek().v}' topildi`, this.peek().pos);
        }
        this.next();
        while (this.isType()) this.next(); // unsigned int, etc.
        if (this.peek().t !== "id") {
          throw new ParseError(`Nom kutilgan edi, '${this.peek().v}' topildi`, this.peek().pos);
        }
        const nameTok = this.next();
        if (this.is("(") && this.isFunctionDef()) {
          this.eat("(");
          const params: { name: string; type: string }[] = [];
          while (!this.is(")")) {
            let ptype = "int";
            while (this.isType() || this.is("const") || this.is("&") || this.is("*")) {
              const tk = this.next();
              if (Parser.isTypeTok(tk)) ptype = tk.v;
            }
            const pname = this.peek().t === "id" ? this.next().v : "";
            if (pname) params.push({ name: pname, type: ptype });
            if (this.is("[")) { this.next(); while (!this.is("]") && this.peek().t !== "eof") this.next(); this.eat("]"); }
            if (this.is(",")) this.next();
            else break;
          }
          this.eat(")");
          const body = this.parseBlock();
          functions[nameTok.v] = { k: "func", name: nameTok.v, params, body, pos: nameTok.pos };
        } else {
          this.p = save;
          globals.push(this.parseVarDecl());
        }
      } catch (e) {
        if (e instanceof ParseError) { this.errors.push({ severity: "error", pos: e.pos, message: e.message }); }
        else throw e;
        if (this.p === save) this.next();
        this.resync();
      }
    }
    return { k: "program", globals, functions };
  }

  parseBlock(): Node {
    this.eat("{");
    const stmts: Node[] = [];
    while (!this.is("}") && this.peek().t !== "eof") {
      const save = this.p;
      try {
        stmts.push(this.parseStmt());
      } catch (e) {
        if (e instanceof ParseError) this.errors.push({ severity: "error", pos: e.pos, message: e.message });
        else throw e;
        if (this.p === save) this.next();
        this.resync();
      }
    }
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
    if (t.v === ";") { this.next(); return { k: "block", stmts: [] }; }
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
    const e = this.parseExpr();
    this.eat(";");
    return { k: "exprStmt", expr: e };
  }

  parseVarDecl(): Node {
    if (this.is("const") || this.is("static")) this.next();
    const typeTok = this.next();
    let typeName = typeTok.v;
    while (this.isType()) typeName += " " + this.next().v;
    const decls: { name: string; init: Node | null; ctorArgs: Node[] | null; pos: number }[] = [];
    do {
      const nameTok = this.next();
      if (nameTok.t !== "id") {
        throw new ParseError(`O'zgaruvchi nomi kutilgan edi, '${nameTok.v}' topildi`, nameTok.pos);
      }
      if (this.is("[")) { this.next(); while (!this.is("]") && this.peek().t !== "eof") this.next(); this.eat("]"); }
      let init: Node | null = null;
      let ctorArgs: Node[] | null = null;
      if (this.is("=")) {
        this.next();
        // brace initialiser for arrays: int v[] = {1, 2, 3};
        if (this.is("{")) {
          this.next();
          while (!this.is("}") && this.peek().t !== "eof") this.next();
          this.eat("}");
        } else init = this.parseAssign();
      } else if (this.is("(")) {
        ctorArgs = this.parseArgs();
      }
      decls.push({ name: nameTok.v, init, ctorArgs, pos: nameTok.pos });
    } while (this.is(",") && (this.next(), true));
    this.eat(";");
    return { k: "varDecl", type: typeName, decls, pos: typeTok.pos };
  }

  parseIf(): Node {
    this.eat("if"); this.eat("(");
    const condPos = this.peek().pos;
    const cond = this.parseExpr();
    this.eat(")");
    const then = this.parseStmt();
    let els: Node | null = null;
    if (this.is("else")) { this.next(); els = this.parseStmt(); }
    return { k: "if", cond, then, els, condPos };
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
    if (["=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^="].includes(op)) {
      const pos = this.next().pos;
      const right = this.parseAssign();
      return { k: "assign", op, left, right, pos };
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
    for (;;) {
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
    for (;;) {
      if (this.is(".") || this.is("->")) {
        this.next();
        const propTok = this.next();
        if (this.is("(")) {
          const args = this.parseArgs();
          e = { k: "method", obj: e, method: propTok.v, args, pos: propTok.pos };
        } else {
          e = { k: "member", obj: e, prop: propTok.v, pos: propTok.pos };
        }
      } else if (this.is("(")) {
        const pos = this.peek().pos;
        const args = this.parseArgs();
        e = { k: "call", callee: e, args, pos: e.pos ?? pos };
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
    if (t.v === "(") {
      // A C cast - `(int) x`, `(unsigned long) x` - looks exactly like a
      // parenthesised expression until the type name inside gives it away.
      let q = this.p + 1;
      if (Parser.isTypeTok(this.toks[q])) {
        while (Parser.isTypeTok(this.toks[q]) || this.toks[q]?.v === "*") q++;
        if (this.toks[q]?.v === ")") {
          const to = this.toks[this.p + 1].v;
          this.p = q + 1;
          return { k: "cast", to, arg: this.parseUnary() };
        }
      }
      this.next();
      const e = this.parseExpr();
      this.eat(")");
      return e;
    }
    if (t.t === "num") {
      this.next();
      const v = t.v.startsWith("0x") ? parseInt(t.v.slice(2), 16)
        : t.v.startsWith("0b") ? parseInt(t.v.slice(2), 2) : parseFloat(t.v);
      return { k: "num", value: v, isFloat: !!t.f };
    }
    if (t.t === "str") { this.next(); return { k: "str", value: t.v }; }
    if (t.t === "char") { this.next(); return { k: "num", value: t.v.charCodeAt(0) }; }
    if (t.v === "true") { this.next(); return { k: "num", value: 1 }; }
    if (t.v === "false") { this.next(); return { k: "num", value: 0 }; }
    if (t.t === "id" || t.t === "libtype") {
      this.next();
      if (this.defines[t.v] !== undefined) {
        const sub = new Parser(tokenize(this.defines[t.v]));
        return sub.parseExpr();
      }
      return { k: "id", name: t.v, pos: t.pos };
    }
    // A cast or a built-in used as a function: String(x), int(x), sizeof(x)
    if (t.t === "kw" && (TYPE_KEYWORDS.includes(t.v) || t.v === "sizeof")) {
      this.next();
      return { k: "id", name: t.v, pos: t.pos };
    }
    throw new ParseError(`Kutilmagan '${t.v || "fayl oxiri"}'`, t.pos);
  }
}

// ---------------------------------------------------------------------------
// Names the checker knows about
// ---------------------------------------------------------------------------
const CONSTANTS: Record<string, number> = {
  HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2,
  true: 1, false: 0, LED_BUILTIN: 13,
  A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19,
  PI: Math.PI, HALF_PI: Math.PI / 2, TWO_PI: Math.PI * 2, EULER: Math.E,
  DEC: 10, HEX: 16, BIN: 2, OCT: 8,
  LSBFIRST: 0, MSBFIRST: 1, CHANGE: 1, FALLING: 2, RISING: 3,
};

const BUILTIN_FUNCS = new Set([
  "pinMode", "digitalWrite", "digitalRead", "analogWrite", "analogRead",
  "delay", "delayMicroseconds", "tone", "noTone", "millis", "micros",
  "map", "constrain", "min", "max", "abs", "pow", "sqrt", "sq",
  "sin", "cos", "tan", "log", "exp", "round", "floor", "ceil",
  "random", "randomSeed", "bitRead", "bitWrite", "bitSet", "bitClear", "bit",
  "lowByte", "highByte", "shiftOut", "shiftIn", "attachInterrupt",
  "detachInterrupt", "interrupts", "noInterrupts", "isnan",
  // casts that read as calls
  "String", "int", "long", "float", "double", "byte", "char", "bool", "boolean",
  "word", "sizeof",
]);

/** Objects every sketch has without including anything. */
const BUILTIN_OBJECTS: Record<string, string[]> = {
  Serial: ["begin", "end", "print", "println", "write", "available", "read",
    "readString", "readStringUntil", "peek", "flush", "parseInt", "parseFloat"],
};

const STRING_METHODS = [
  "length", "charAt", "substring", "indexOf", "lastIndexOf", "toUpperCase",
  "toLowerCase", "equals", "equalsIgnoreCase", "toInt", "toFloat", "trim",
  "concat", "startsWith", "endsWith", "replace", "compareTo", "c_str",
];

// ---------------------------------------------------------------------------
// Semantic check
// ---------------------------------------------------------------------------
export interface CompileStats {
  lines: number;
  functions: number;
  globals: number;
  libraries: string[];
}

export interface CompileResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  stats: CompileStats;
  program: Node | null;
  includes: string[];
}

/**
 * Parse and check a sketch without running it. Errors block the simulation the
 * way a failed verify blocks an upload; warnings are printed and ignored.
 */
export function compile(source: string): CompileResult {
  const map = new SourceMap(source);
  const parser = new Parser(tokenize(source));
  let program: Node | null = null;
  const raw: RawDiag[] = [];
  try {
    program = parser.parseProgram();
  } catch (e) {
    raw.push({ severity: "error", pos: 0, message: e instanceof Error ? e.message : String(e) });
  }
  raw.push(...parser.errors);

  // ---- #include resolution ----
  const libs: string[] = [];
  const seen = new Set<string>();
  for (const inc of parser.includes) {
    if (seen.has(inc.header)) {
      raw.push({ severity: "warning", pos: inc.pos, message: `<${inc.header}> ikki marta qo'shilgan` });
      continue;
    }
    seen.add(inc.header);
    if (FREE_HEADERS.has(inc.header)) continue;
    if (LIB_BY_HEADER[inc.header]) { libs.push(inc.header); continue; }
    raw.push({
      severity: "error",
      pos: inc.pos,
      message: `'${inc.header}' kutubxonasi topilmadi. Mavjudlari: ${knownHeaders().join(", ")}`,
    });
  }

  if (program) {
    checkProgram(program, libs, raw);
    // Only when the sketch parsed cleanly: a syntax error swallows whole
    // functions, and "setup() is missing" on top of it points at the wrong bug.
    const syntaxBroken = parser.errors.some((d) => d.severity === "error");
    if (!syntaxBroken) {
      if (!program.functions["setup"]) {
        raw.push({ severity: "error", pos: 0, message: "void setup() funksiyasi yo'q — har bir eskizda bo'lishi shart" });
      }
      if (!program.functions["loop"]) {
        raw.push({ severity: "error", pos: 0, message: "void loop() funksiyasi yo'q — har bir eskizda bo'lishi shart" });
      }
    }
  }

  const diagnostics = raw
    .map((d) => ({ severity: d.severity, ...map.loc(d.pos), message: d.message }))
    .sort((a, b) => a.line - b.line || a.col - b.col);

  return {
    ok: !diagnostics.some((d) => d.severity === "error"),
    diagnostics,
    stats: {
      lines: source.split("\n").length,
      functions: program ? Object.keys(program.functions).length : 0,
      globals: program ? program.globals.reduce((n: number, g: Node) => n + (g.decls?.length ?? 0), 0) : 0,
      libraries: libs,
    },
    program,
    includes: [...seen],
  };
}

/** A name in scope, and what kind of thing it is (for method checking). */
type Sym = { type: string };

function checkProgram(program: Node, libs: string[], out: RawDiag[]) {
  const included = new Set(libs);
  /** Objects and types the included libraries make legal. */
  const libObjects: Record<string, { methods: string[]; header: string }> = {};
  const libTypes: Record<string, { methods: string[]; header: string }> = {};
  const libFuncs = new Set<string>();
  const libConsts = new Set<string>();
  for (const lib of LIBRARIES) {
    for (const o of lib.objects) libObjects[o] = { methods: lib.methods[o] ?? [], header: lib.header };
    for (const t of lib.types) libTypes[t] = { methods: lib.methods[t] ?? [], header: lib.header };
    if (included.has(lib.header)) {
      for (const f of lib.functions) libFuncs.add(f);
      for (const c of Object.keys(lib.constants)) libConsts.add(c);
    }
  }

  const globals = new Map<string, Sym>();
  for (const g of program.globals) {
    for (const d of g.decls ?? []) globals.set(d.name, { type: g.type });
  }
  const funcs = new Set(Object.keys(program.functions));

  const known = (name: string) =>
    name in CONSTANTS || BUILTIN_FUNCS.has(name) || funcs.has(name) ||
    libFuncs.has(name) || libConsts.has(name) ||
    name in BUILTIN_OBJECTS || name in libObjects || name in libTypes;

  /** Report a library type or object used without its #include. */
  const needInclude = (name: string, header: string, pos: number) => {
    if (!included.has(header)) {
      out.push({
        severity: "error", pos,
        message: `'${name}' uchun #include <${header}> yozilmagan`,
      });
      return false;
    }
    return true;
  };

  for (const g of program.globals) {
    if (libTypes[g.type]) needInclude(g.type, libTypes[g.type].header, g.pos);
  }

  const walk = (node: Node, scopes: Map<string, Sym>[]) => {
    if (!node || typeof node !== "object") return;
    const lookup = (name: string): Sym | undefined => {
      for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(name)) return scopes[i].get(name);
      return globals.get(name);
    };

    switch (node.k) {
      case "block": {
        const inner = [...scopes, new Map<string, Sym>()];
        for (const s of node.stmts) walk(s, inner);
        return;
      }
      case "varDecl": {
        if (libTypes[node.type]) needInclude(node.type, libTypes[node.type].header, node.pos);
        for (const d of node.decls) {
          if (d.init) walk(d.init, scopes);
          for (const a of d.ctorArgs ?? []) walk(a, scopes);
          (scopes[scopes.length - 1] ?? globals).set(d.name, { type: node.type });
        }
        return;
      }
      case "for": {
        const inner = [...scopes, new Map<string, Sym>()];
        walk(node.init, inner); walk(node.cond, inner); walk(node.step, inner); walk(node.body, inner);
        return;
      }
      case "if": {
        // `if (x = 1)` is legal C and almost always a typo for `==`.
        if (node.cond?.k === "assign" && node.cond.op === "=") {
          out.push({
            severity: "warning", pos: node.cond.pos ?? node.condPos,
            message: "if ichida '=' (o'zlashtirish) ishlatilgan — '==' (tenglik) demoqchimidingiz?",
          });
        }
        walk(node.cond, scopes); walk(node.then, scopes); walk(node.els, scopes);
        return;
      }
      case "id": {
        if (!lookup(node.name) && !known(node.name)) {
          out.push({ severity: "error", pos: node.pos ?? 0, message: `'${node.name}' aniqlanmagan` });
        }
        return;
      }
      case "call": {
        const name = node.callee?.k === "id" ? node.callee.name : null;
        if (name && !funcs.has(name) && !BUILTIN_FUNCS.has(name) && !libFuncs.has(name) && !lookup(name)) {
          out.push({ severity: "error", pos: node.pos ?? 0, message: `'${name}' nomli funksiya topilmadi` });
        } else if (name && funcs.has(name)) {
          const want = program.functions[name].params.length;
          if (node.args.length !== want) {
            out.push({
              severity: "error", pos: node.pos ?? 0,
              message: `'${name}' ${want} ta argument kutadi, ${node.args.length} ta berildi`,
            });
          }
        }
        for (const a of node.args) walk(a, scopes);
        return;
      }
      case "method": {
        const objName = node.obj?.k === "id" ? node.obj.name : null;
        if (objName) {
          const sym = lookup(objName);
          const builtin = BUILTIN_OBJECTS[objName];
          const libObj = libObjects[objName];
          let methods: string[] | null = null;
          if (sym && libTypes[sym.type]) {
            if (needInclude(sym.type, libTypes[sym.type].header, node.pos)) methods = libTypes[sym.type].methods;
          } else if (sym && sym.type === "String") {
            methods = STRING_METHODS;
          } else if (builtin) {
            methods = builtin;
          } else if (libObj) {
            if (needInclude(objName, libObj.header, node.pos)) methods = libObj.methods;
          } else if (!sym) {
            out.push({ severity: "error", pos: node.obj.pos ?? node.pos, message: `'${objName}' aniqlanmagan` });
          }
          if (methods && !methods.includes(node.method)) {
            out.push({
              severity: "error", pos: node.pos,
              message: `'${objName}' obyektida '${node.method}' metodi yo'q. Mavjudlari: ${methods.join(", ")}`,
            });
          }
        }
        for (const a of node.args) walk(a, scopes);
        return;
      }
      default: {
        for (const key of Object.keys(node)) {
          if (key === "k" || key === "pos" || key === "name" || key === "prop" || key === "method") continue;
          const v = node[key];
          if (Array.isArray(v)) for (const item of v) walk(item, scopes);
          else if (v && typeof v === "object") walk(v, scopes);
        }
      }
    }
  };

  for (const g of program.globals) {
    for (const d of g.decls ?? []) {
      if (d.init) walk(d.init, [globals]);
      for (const a of d.ctorArgs ?? []) walk(a, [globals]);
    }
  }
  for (const name of funcs) {
    const fn = program.functions[name];
    const params = new Map<string, Sym>(fn.params.map((p: any) => [p.name, { type: "int" }]));
    walk(fn.body, [params]);
  }
}

// ---------------------------------------------------------------------------
// Interpreter
// ---------------------------------------------------------------------------
class Env {
  vars = new Map<string, Val>();
  /** Declared type per variable, so integer division can be told from real. */
  types = new Map<string, string>();
  parent: Env | null;
  constructor(parent: Env | null = null) { this.parent = parent; }
  get(name: string): Val | undefined {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    return undefined;
  }
  typeOf(name: string): string | undefined {
    if (this.types.has(name)) return this.types.get(name);
    if (this.parent) return this.parent.typeOf(name);
    return undefined;
  }
  setExisting(name: string, v: Val): boolean {
    if (this.vars.has(name)) { this.vars.set(name, v); return true; }
    if (this.parent) return this.parent.setExisting(name, v);
    return false;
  }
  declare(name: string, v: Val, type?: string) {
    this.vars.set(name, v);
    if (type) this.types.set(name, type);
  }
}

/** Built-ins that hand back a real number rather than a whole one. */
const FLOAT_FUNCS = new Set(["sqrt", "pow", "sin", "cos", "tan", "log", "exp", "float", "double"]);

/** Declared types that hold whole numbers, and so truncate on assignment. */
const INT_TYPES = new Set([
  "int", "long", "short", "byte", "char", "bool", "boolean", "unsigned",
  "size_t", "uint8_t", "uint16_t", "uint32_t", "int8_t", "int16_t", "int32_t",
]);

/**
 * Whether an expression is a float in C's eyes. This is what makes
 * `millis() / 1000` come out as 0 rather than 0.8 - in C both sides are
 * integers, so the division truncates, and a simulator that quietly returns
 * 0.8 teaches the wrong thing about the single most common Arduino idiom.
 */
function isFloatExpr(node: Node, env: Env): boolean {
  if (!node || typeof node !== "object") return false;
  switch (node.k) {
    case "num": return !!node.isFloat;
    case "str": return false;
    case "id": {
      const t = env.typeOf(node.name);
      return t === "float" || t === "double";
    }
    case "cast": return node.to === "float" || node.to === "double";
    case "bin":
      if (["==", "!=", "<", ">", "<=", ">=", "&&", "||", "%", "&", "|", "^", "<<", ">>"].includes(node.op)) return false;
      return isFloatExpr(node.left, env) || isFloatExpr(node.right, env);
    case "unary": return isFloatExpr(node.arg, env);
    case "ternary": return isFloatExpr(node.a, env) || isFloatExpr(node.b, env);
    case "assign": return isFloatExpr(node.left, env) || isFloatExpr(node.right, env);
    case "call": return FLOAT_FUNCS.has(node.callee?.name);
    case "method": return node.method === "toFloat";
    default: return false;
  }
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

/** One 16x2 (or other size) character display, as the sketch has filled it. */
export interface LcdState {
  /** Constructor pins, in LiquidCrystal order: rs, en, d4..d7. */
  pins: number[];
  cols: number;
  rows: string[];
  on: boolean;
}

export class ArduinoRuntime {
  program: Node;
  board: Board;
  globalEnv = new Env();
  onError?: (msg: string) => void;
  private opBudget = 0;
  /** Library instances by variable name, created as their declarations run. */
  private objects = new Map<string, { type: string; args: number[] }>();
  private lcds = new Map<string, { pins: number[]; cols: number; rowCount: number; buf: string[][]; cx: number; cy: number; on: boolean }>();
  private eeprom = new Uint8Array(1024);

  constructor(source: string, board: Board, program?: Node) {
    this.board = board;
    if (program) this.program = program;
    else {
      const parser = new Parser(tokenize(source));
      this.program = parser.parseProgram();
    }
  }

  hasSetup(): boolean { return !!this.program.functions["setup"]; }
  hasLoop(): boolean { return !!this.program.functions["loop"]; }

  /** Character displays the sketch is driving, for the render layer. */
  getLcdStates(): Record<string, LcdState> {
    const out: Record<string, LcdState> = {};
    for (const [name, l] of this.lcds) {
      out[name] = {
        pins: l.pins,
        cols: l.cols,
        on: l.on,
        rows: l.buf.map((r) => r.join("").replace(/\s+$/, "")),
      };
    }
    return out;
  }

  /** Run the whole program: setup once, then loop forever, yielding delay ms. */
  *run(): Generator<number, void, void> {
    for (const g of this.program.globals) {
      yield* this.execStmt(g, this.globalEnv);
    }
    if (this.program.functions["setup"]) {
      yield* this.callUserFunc(this.program.functions["setup"], []);
    }
    const loop = this.program.functions["loop"];
    for (;;) {
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
    fn.params.forEach((p: any, i: number) => {
      let v = args[i] ?? 0;
      if (typeof v === "number" && INT_TYPES.has(p.type)) v = Math.trunc(v);
      env.declare(p.name, v, p.type);
    });
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
          // C narrows on the way in: `int x = 7 / 2;` stores 3, not 3.5.
          const base = node.type.split(" ").pop() ?? node.type;
          if (typeof v === "number" && INT_TYPES.has(base)) v = Math.trunc(v);
          env.declare(d.name, v, base);
          if (LIB_TYPES.has(node.type)) {
            const args: number[] = [];
            for (const a of d.ctorArgs ?? []) args.push(Number(yield* this.evalExpr(a, env)));
            this.createObject(node.type, d.name, args);
          }
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

  private createObject(type: string, name: string, args: number[]) {
    this.objects.set(name, { type, args });
    if (type === "LiquidCrystal") {
      this.lcds.set(name, {
        pins: args, cols: 16, rowCount: 2,
        buf: [Array(16).fill(" "), Array(16).fill(" ")],
        cx: 0, cy: 0, on: true,
      });
    }
  }

  private *evalExpr(node: Node, env: Env): Generator<number, Val, void> {
    this.checkBudget();
    switch (node.k) {
      case "num": return node.value;
      case "str": return node.value;
      case "id": {
        const v = env.get(node.name);
        if (v !== undefined) return v;
        if (node.name in CONSTANTS) return CONSTANTS[node.name];
        return 0;
      }
      case "assign": {
        const rhs = yield* this.evalExpr(node.right, env);
        const name = node.left.name;
        let value: Val = rhs;
        if (node.op !== "=") {
          const cur = env.get(name) ?? 0;
          if (node.op === "+=" && (typeof cur === "string" || typeof rhs === "string")) {
            value = toStr(cur) + toStr(rhs);
          } else {
            const a = Number(cur), b = Number(rhs);
            value = node.op === "+=" ? a + b : node.op === "-=" ? a - b
              : node.op === "*=" ? a * b : node.op === "/=" ? (b === 0 ? 0 : a / b)
              : node.op === "%=" ? (b === 0 ? 0 : a % b)
              : node.op === "&=" ? (a & b) : node.op === "|=" ? (a | b) : (a ^ b);
          }
        }
        const declared = env.typeOf(name);
        if (typeof value === "number" && declared && INT_TYPES.has(declared)) value = Math.trunc(value);
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
      case "cast": {
        const v = yield* this.evalExpr(node.arg, env);
        if (node.to === "String") return toStr(v);
        if (node.to === "float" || node.to === "double") return Number(v);
        if (node.to === "bool" || node.to === "boolean") return truthy(v) ? 1 : 0;
        return Math.trunc(Number(v));
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
    if (node.op === "+" && (typeof l === "string" || typeof r === "string")) {
      return toStr(l) + toStr(r);
    }
    const a = Number(l), b = Number(r);
    switch (node.op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": {
        if (b === 0) return 0;
        const q = a / b;
        // Integer / integer truncates, exactly as it does on the board.
        return isFloatExpr(node.left, env) || isFloatExpr(node.right, env) ? q : Math.trunc(q);
      }
      case "%": return b === 0 ? 0 : a % b;
      case "==": return l === r || Number(l) === Number(r) ? 1 : 0;
      case "!=": return l === r || Number(l) === Number(r) ? 0 : 1;
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
      // Arduino's map() is integer arithmetic all the way through, so it
      // truncates rather than rounds: map(512,0,1023,0,255) is 127, not 128.
      case "map": return Math.trunc(mapFn(Number(a[0]), Number(a[1]), Number(a[2]), Number(a[3]), Number(a[4])));
      case "constrain": return clamp(Number(a[0]), Number(a[1]), Number(a[2]));
      case "min": return Math.min(Number(a[0]), Number(a[1]));
      case "max": return Math.max(Number(a[0]), Number(a[1]));
      case "abs": return Math.abs(Number(a[0]));
      case "pow": return Math.pow(Number(a[0]), Number(a[1]));
      case "sqrt": return Math.sqrt(Number(a[0]));
      case "sq": return Number(a[0]) * Number(a[0]);
      case "sin": return Math.sin(Number(a[0]));
      case "cos": return Math.cos(Number(a[0]));
      case "tan": return Math.tan(Number(a[0]));
      case "log": return Math.log(Number(a[0]));
      case "exp": return Math.exp(Number(a[0]));
      case "round": return Math.round(Number(a[0]));
      case "floor": return Math.floor(Number(a[0]));
      case "ceil": return Math.ceil(Number(a[0]));
      case "isnan": return isNaN(Number(a[0])) ? 1 : 0;
      case "bit": return 1 << Number(a[0]);
      case "bitRead": return (Number(a[0]) >> Number(a[1])) & 1;
      case "bitSet": return Number(a[0]) | (1 << Number(a[1]));
      case "bitClear": return Number(a[0]) & ~(1 << Number(a[1]));
      case "bitWrite": return truthy(a[2]) ? Number(a[0]) | (1 << Number(a[1])) : Number(a[0]) & ~(1 << Number(a[1]));
      case "lowByte": return Number(a[0]) & 0xff;
      case "highByte": return (Number(a[0]) >> 8) & 0xff;
      case "random":
        if (a.length >= 2) return Math.floor(Math.random() * (Number(a[1]) - Number(a[0]))) + Number(a[0]);
        return Math.floor(Math.random() * Number(a[0] ?? 0));
      case "String": return toStr(a[0] ?? "");
      case "int": case "long": case "byte": case "word": return Math.trunc(Number(a[0] ?? 0));
      case "char": return Number(a[0] ?? 0);
      case "float": case "double": return Number(a[0] ?? 0);
      case "bool": case "boolean": return truthy(a[0] ?? 0) ? 1 : 0;
      // Recognised, but there is no hardware behind them here.
      case "randomSeed": case "shiftOut": case "shiftIn": case "attachInterrupt":
      case "detachInterrupt": case "interrupts": case "noInterrupts": case "sizeof":
        return 0;
      default: return 0;
    }
  }

  private *evalMethod(node: Node, env: Env): Generator<number, Val, void> {
    const a = yield* this.evalArgs(node.args, env);
    const objName = node.obj.k === "id" ? node.obj.name : "";
    const m = node.method;

    // Serial.print(2.0) shows "2.00" on a board: a float always prints with two
    // decimals, even when it happens to hold a whole number. Only the
    // expression's type can say that, so it is worked out here.
    const asFloat = node.args.length >= 1 && isFloatExpr(node.args[0], env);

    if (objName === "Serial") return this.serialMethod("", m, a, asFloat);

    const obj = this.objects.get(objName);
    if (obj?.type === "Servo") {
      if (m === "attach") { this.board.servoAttach(objName, normPin(a[0])); return 0; }
      if (m === "write") { this.board.servoWrite(objName, clamp(Number(a[0]), 0, 180)); return 0; }
      if (m === "writeMicroseconds") { this.board.servoWrite(objName, clamp(mapFn(Number(a[0]), 1000, 2000, 0, 180), 0, 180)); return 0; }
      if (m === "read") return this.board.servoRead(objName);
      if (m === "attached") return 1;
      return 0;
    }
    if (obj?.type === "LiquidCrystal") return this.lcdMethod(objName, m, a, asFloat);
    if (obj?.type === "SoftwareSerial") return this.serialMethod(`[${objName}] `, m, a, asFloat);

    if (objName === "EEPROM") {
      if (m === "read" || m === "get") return this.eeprom[Number(a[0]) & 1023];
      if (m === "write" || m === "update" || m === "put") { this.eeprom[Number(a[0]) & 1023] = Number(a[1]) & 0xff; return 0; }
      if (m === "length") return this.eeprom.length;
      return 0;
    }
    // Wire / SPI are recognised by the compiler but drive nothing.
    if (objName === "Wire" || objName === "SPI") return 0;

    // String methods operate on the variable's current value.
    const target = env.get(objName);
    if (typeof target === "string") return this.stringMethod(objName, target, m, a, env);
    return 0;
  }

  private serialMethod(prefix: string, m: string, a: Val[], asFloat = false): Val {
    switch (m) {
      case "print": this.board.serial(prefix + formatSerial(a, asFloat)); return 0;
      case "println": this.board.serial(prefix + formatSerial(a, asFloat) + "\n"); return 0;
      case "write": this.board.serial(prefix + String.fromCharCode(Number(a[0]))); return 0;
      case "available": return 0;
      case "read": case "peek": return -1;
      case "readString": case "readStringUntil": return "";
      case "parseInt": case "parseFloat": return 0;
      default: return 0; // begin / end / flush / listen
    }
  }

  private lcdMethod(name: string, m: string, a: Val[], asFloat = false): Val {
    const l = this.lcds.get(name);
    if (!l) return 0;
    const write = (text: string) => {
      for (const ch of text) {
        if (l.cy < 0 || l.cy >= l.buf.length) break;
        if (l.cx >= l.cols) break;
        l.buf[l.cy][l.cx] = ch;
        l.cx++;
      }
    };
    switch (m) {
      case "begin": {
        l.cols = Math.max(1, Math.round(Number(a[0] ?? 16)));
        l.rowCount = Math.max(1, Math.round(Number(a[1] ?? 2)));
        l.buf = Array.from({ length: l.rowCount }, () => Array(l.cols).fill(" "));
        l.cx = 0; l.cy = 0;
        return 0;
      }
      case "clear": l.buf = l.buf.map(() => Array(l.cols).fill(" ")); l.cx = 0; l.cy = 0; return 0;
      case "home": l.cx = 0; l.cy = 0; return 0;
      case "setCursor": l.cx = Math.max(0, Math.round(Number(a[0] ?? 0))); l.cy = Math.max(0, Math.round(Number(a[1] ?? 0))); return 0;
      case "print": write(formatSerial(a, asFloat)); return 0;
      case "write": write(String.fromCharCode(Number(a[0]))); return 0;
      case "noDisplay": l.on = false; return 0;
      case "display": l.on = true; return 0;
      default: return 0;
    }
  }

  private stringMethod(name: string, s: string, m: string, a: Val[], env: Env): Val {
    const store = (v: string) => { env.setExisting(name, v); return 0; };
    switch (m) {
      case "length": return s.length;
      case "charAt": return s.charCodeAt(Number(a[0])) || 0;
      case "substring": return a.length > 1 ? s.substring(Number(a[0]), Number(a[1])) : s.substring(Number(a[0]));
      case "indexOf": return s.indexOf(toStr(a[0]));
      case "lastIndexOf": return s.lastIndexOf(toStr(a[0]));
      case "equals": return s === toStr(a[0]) ? 1 : 0;
      case "equalsIgnoreCase": return s.toLowerCase() === toStr(a[0]).toLowerCase() ? 1 : 0;
      case "compareTo": return s < toStr(a[0]) ? -1 : s > toStr(a[0]) ? 1 : 0;
      case "startsWith": return s.startsWith(toStr(a[0])) ? 1 : 0;
      case "endsWith": return s.endsWith(toStr(a[0])) ? 1 : 0;
      case "toInt": return parseInt(s, 10) || 0;
      case "toFloat": return parseFloat(s) || 0;
      case "c_str": return s;
      case "toUpperCase": return store(s.toUpperCase());
      case "toLowerCase": return store(s.toLowerCase());
      case "trim": return store(s.trim());
      case "concat": return store(s + toStr(a[0]));
      case "replace": return store(s.split(toStr(a[0])).join(toStr(a[1])));
      default: return 0;
    }
  }
}

// ---- helpers ---------------------------------------------------------------
function truthy(v: Val): boolean {
  if (typeof v === "string") return v.length > 0;
  return Number(v) !== 0;
}
function toStr(v: Val): string {
  if (typeof v === "number" && !Number.isInteger(v)) return v.toFixed(2);
  return String(v);
}
/**
 * Serial.print(x) and its optional second argument. Arduino overloads that
 * argument by the type of the first: for a whole number it is a number base
 * (DEC/HEX/BIN/OCT), for a real one it is how many decimals to show. They
 * collide - BIN is 2, and so is "two decimal places" - so only the type of the
 * printed expression can tell them apart.
 */
function formatSerial(a: Val[], asFloat = false): string {
  const v = a[0] ?? "";
  if (typeof v === "string") return v;
  const n = Number(v);
  if (a.length < 2) return asFloat ? n.toFixed(2) : toStr(v);
  const fmt = Number(a[1]);
  if (asFloat || !Number.isInteger(n)) return n.toFixed(clamp(fmt, 0, 10));
  if (fmt === 16) return Math.trunc(n).toString(16).toUpperCase();
  if (fmt === 2) return Math.trunc(n).toString(2);
  if (fmt === 8) return Math.trunc(n).toString(8);
  if (fmt === 10) return String(Math.trunc(n));
  return n.toFixed(clamp(fmt, 0, 10));
}
function clamp(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }
function mapFn(x: number, inLo: number, inHi: number, outLo: number, outHi: number): number {
  if (inHi === inLo) return outLo;
  return ((x - inLo) * (outHi - outLo)) / (inHi - inLo) + outLo;
}
