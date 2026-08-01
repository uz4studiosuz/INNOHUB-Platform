"""Generate electronics parts from the Fritzing library.

Usage:  python scripts/gen-electronics-parts.py

For each entry in MANIFEST this downloads the .fzp part definition, follows it
to the breadboard-view SVG, reads every connector's real position and name out
of that SVG, trims the bendable legs to a sane length, and writes both the
asset (public/electronics/) and a ready-to-use ComponentDef (generatedParts.ts).

Doing it this way rather than by hand is the only way the pin coordinates stay
honest across ~30 parts: they are never typed in, only read out of the artwork.
"""
import os
import re
import json
import urllib.parse
import urllib.request

BASE = "https://raw.githubusercontent.com/fritzing/fritzing-parts/master"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".fzcache")
OUT_SVG = os.path.join(HERE, "..", "public", "electronics")
OUT_TS = os.path.join(HERE, "..", "src", "components", "electronics", "generatedParts.ts")
PX_PER_INCH = 144

os.makedirs(CACHE, exist_ok=True)


def fetch(path):
    key = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9._-]", "_", path))
    if not os.path.exists(key):
        url = BASE + "/" + urllib.parse.quote(path)
        with urllib.request.urlopen(url, timeout=30) as r, open(key, "wb") as f:
            f.write(r.read())
    with open(key, encoding="utf-8", errors="replace") as f:
        return f.read()


# ---------------------------------------------------------------- svg helpers
NUM = r"[-+]?[\d.]+(?:e[-+]?\d+)?"


def find_element(svg, elem_id):
    """Return (tag, attr-text, translate) for the element carrying this id."""
    m = re.search(rf'<([a-zA-Z]+)\b([^>]*?\bid="{re.escape(elem_id)}"[^>]*)>', svg)
    if not m:
        return None
    # accumulate translate() from every <g> that opens before, and closes after, us
    tx = ty = 0.0
    depth_stack = []
    for gm in re.finditer(r'<g\b([^>]*)>|</g>', svg[: m.start()]):
        if gm.group(0) == "</g>":
            if depth_stack:
                depth_stack.pop()
        else:
            t = re.search(rf'transform="translate\(\s*({NUM})[ ,]+({NUM})\s*\)"', gm.group(1) or "")
            depth_stack.append((float(t.group(1)), float(t.group(2))) if t else (0.0, 0.0))
    for dx, dy in depth_stack:
        tx += dx
        ty += dy
    return m.group(1), m.group(2), (tx, ty)


def attr(text, name, default=None):
    m = re.search(rf'\b{name}="({NUM})"', text)
    return float(m.group(1)) if m else default


def element_point(svg, elem_id):
    """The connection point of a connector element, in viewBox units."""
    found = find_element(svg, elem_id)
    if not found:
        return None
    tag, text, (tx, ty) = found
    if tag == "line":
        p = (attr(text, "x2"), attr(text, "y2"))
    elif tag in ("circle", "ellipse"):
        p = (attr(text, "cx", 0), attr(text, "cy", 0))
    elif tag == "rect":
        p = (attr(text, "x", 0) + attr(text, "width", 0) / 2,
             attr(text, "y", 0) + attr(text, "height", 0) / 2)
    elif tag == "path":
        d = re.search(r'\bd="([^"]+)"', text)
        p = path_centre(d.group(1)) if d else None
    else:
        # a <g> wrapper: locate whichever shape it holds
        body = re.search(rf'<{tag}\b[^>]*?id="{re.escape(elem_id)}".*?</{tag}>', svg, re.S)
        p = find_first_shape(body.group(0) if body else text)
    if p is None:
        return None
    if p[0] is None or p[1] is None:
        return None
    return (p[0] + tx, p[1] + ty)


def path_centre(d):
    """Centre of a path's on-curve points. Fritzing often draws a pin as a
    four-arc circle rather than <circle>, so this is the only way to locate it."""
    tokens = re.findall(rf"([A-Za-z])|({NUM})", d)
    x = y = sx = sy = 0.0
    cmd = None
    nums, pts = [], []
    # how many numbers each command consumes, and which pair ends the segment
    arity = {"m": 2, "l": 2, "h": 1, "v": 1, "c": 6, "s": 4, "q": 4, "t": 2, "a": 7, "z": 0}

    def flush():
        nonlocal x, y, sx, sy, nums
        c = cmd.lower()
        n = arity.get(c, 2)
        while c != "z" and len(nums) >= n:
            args, nums = nums[:n], nums[n:]
            rel = cmd.islower()
            if c == "h":
                x = x + args[0] if rel else args[0]
            elif c == "v":
                y = y + args[0] if rel else args[0]
            else:
                ex, ey = args[-2], args[-1]
                x, y = (x + ex, y + ey) if rel else (ex, ey)
            if c == "m":
                sx, sy = x, y
                c = "l"  # subsequent pairs after M are implicit lineto
            pts.append((x, y))
        if c == "z":
            x, y = sx, sy

    for letter, num in tokens:
        if letter:
            if cmd:
                flush()
            cmd, nums = letter, []
            if letter.lower() == "z":
                flush()
        else:
            nums.append(float(num))
    if cmd:
        flush()
    if not pts:
        return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)


def find_first_shape(blob):
    m = re.search(rf'<circle\b[^>]*cx="({NUM})"[^>]*cy="({NUM})"', blob)
    if m:
        return (float(m.group(1)), float(m.group(2)))
    m = re.search(rf'<circle\b[^>]*cy="({NUM})"[^>]*cx="({NUM})"', blob)
    if m:
        return (float(m.group(2)), float(m.group(1)))
    m = re.search(r'<rect\b([^>]*)>', blob)
    if m:
        t = m.group(1)
        return (attr(t, "x", 0) + attr(t, "width", 0) / 2,
                attr(t, "y", 0) + attr(t, "height", 0) / 2)
    m = re.search(r'<path\b[^>]*\bd="([^"]+)"', blob)
    if m:
        return path_centre(m.group(1))
    return None


def units_per_inch(svg, vb_w):
    m = re.search(r'\bwidth="([\d.]+)(in|mm|px|)"', svg)
    if not m:
        return 72.0
    v, unit = float(m.group(1)), m.group(2)
    if unit == "in":
        return vb_w / v
    if unit == "mm":
        return vb_w / (v / 25.4)
    return 72.0  # bare px in Fritzing files means 72 dpi


def viewbox(svg):
    m = re.search(r'viewBox="([-\d.\s]+)"', svg)
    return [float(v) for v in m.group(1).split()]


def trim_legs(svg, max_len):
    """Fritzing legs run far past the viewBox because the app bends them; clip
    them to a fixed stub so the part reads as a part."""
    def cut(m):
        head, t = m.group(0), m.group(0)
        x1, y1, x2, y2 = (attr(t, a) for a in ("x1", "y1", "x2", "y2"))
        if None in (x1, y1, x2, y2):
            return head
        dx, dy = x2 - x1, y2 - y1
        d = (dx * dx + dy * dy) ** 0.5 or 1
        if d <= max_len:
            return head
        nx, ny = x1 + dx / d * max_len, y1 + dy / d * max_len
        return re.sub(rf'y2="{NUM}"', f'y2="{ny:g}"', re.sub(rf'x2="{NUM}"', f'x2="{nx:g}"', head))

    return re.sub(r'<line\b[^>]*id="connector\d+leg"[^>]*/>', cut, svg)


def grow_viewbox(svg, pts):
    """Make sure every connection point is inside the drawing area."""
    x, y, w, h = viewbox(svg)
    need_w = max([w] + [p[0] + 2 for p in pts])
    need_h = max([h] + [p[1] + 2 for p in pts])
    if need_w <= w and need_h <= h:
        return svg
    old = re.search(r'viewBox="([-\d.\s]+)"', svg).group(0)
    svg = svg.replace(old, f'viewBox="{x:g} {y:g} {need_w:g} {need_h:g}"', 1)
    for a, ratio in (("width", need_w / w), ("height", need_h / h)):
        m = re.search(rf'\b{a}="([\d.]+)([a-z]*)"', svg)
        if m:
            svg = svg.replace(m.group(0), f'{a}="{float(m.group(1)) * ratio:g}{m.group(2)}"', 1)
    return svg


# ------------------------------------------------------------------ fzp parse
def parse_buses(text):
    """Connector ids that are permanently wired together inside the part."""
    out = []
    for m in re.finditer(r"<bus\b[^>]*>(.*?)</bus>", text, re.S):
        members = re.findall(r'<nodeMember\b[^>]*connectorId="([^"]+)"', m.group(1))
        if len(members) > 1:
            out.append(members)
    return out


def parse_fzp(text):
    img = re.search(r'<breadboardView\b[^>]*>.*?image="breadboard/([^"]+)"', text, re.S)
    conns = []
    for m in re.finditer(r'<connector\b([^>]*)>(.*?)</connector>', text, re.S):
        head, body = m.group(1), m.group(2)
        cid = re.search(r'id="([^"]+)"', head).group(1)
        name = re.search(r'name="([^"]*)"', head)
        bb = re.search(r'<breadboardView\b[^>]*>(.*?)</breadboardView>', body, re.S)
        svg_id = re.search(r'svgId="([^"]+)"', bb.group(1)) if bb else None
        term_id = re.search(r'terminalId="([^"]+)"', bb.group(1)) if bb else None
        leg_id = re.search(r'legId="([^"]+)"', bb.group(1)) if bb else None
        conns.append({
            "id": cid,
            "name": (name.group(1) if name else cid).strip(),
            "svgId": svg_id.group(1) if svg_id else f"{cid}pin",
            "terminalId": term_id.group(1) if term_id else None,
            "legId": leg_id.group(1) if leg_id else None,
        })
    return (img.group(1) if img else None), conns


def nice(name, index):
    """Fritzing connector names range from 'common cathode' to '+' to bare '0',
    so turn each into a usable (id, tooltip) pair."""
    n = (name or "").strip()
    if n in ("+", "＋"):
        return "pos", "+"
    if n in ("-", "–", "−"):
        return "neg", "-"
    s = re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")
    if not s:
        return f"p{index}", f"Pin {index}"
    if s[0].isdigit():
        return f"p{s}", f"Pin {n}"
    return s, n


def slug(name, used, index):
    s, label = nice(name, index)
    base, i = s, 2
    while s in used:
        s, i = f"{base}{i}", i + 1
    used.add(s)
    return s, label


# -------------------------------------------------------------------- manifest
# (type, display name, category, fzp path, icon, leg stub length in svg units)
MANIFEST = [
    ("capacitor", "Capacitor", "general", "core/capacitor_ceramic_100mil.fzp", "🔵", 14),
    ("capacitor-polarized", "Polarized Capacitor", "general", "core/capacitor_electrolytic_medium.fzp", "⚫", 14),
    ("diode", "Diode", "general", "core/diode_1N4001_300mil.fzp", "▶", 14),
    ("diode-zener", "Zener Diode", "general", "core/diode_zener_0_5w_3_6v_300mil.fzp", "▷", 14),
    ("inductor", "Inductor", "general", "core/inductor.fzp", "🌀", 14),

    ("toggle-switch", "Toggle Switch", "input", "core/basic-toggle-switch.fzp", "🔀", 12),
    ("tilt-sensor", "Tilt Sensor", "input", "core/Tilt switch.fzp", "📐", 14),
    ("reed-switch", "Reed Switch", "input", "core/reedSwitch_500mil.fzp", "🧲", 14),
    ("photoresistor", "Photoresistor", "input", "core/LDR_photocell_300mil.fzp", "🔆", 14),
    ("force-sensor", "Force Sensor", "input", "core/basic_fsr.fzp", "👆", 12),
    ("temperature-sensor", "Temperature Sensor", "input", "core/tmp36.fzp", "🌡️", 14),
    ("ultrasonic", "Ultrasonic Distance", "input", "core/HC-SR04 Ultrasonic Distance Sensor.fzp", "📡", 12),

    ("dc-motor", "DC Motor", "output", "core/dc_motor.fzp", "🔃", 14),
    ("stepper-motor", "Stepper Motor", "output", "core/stepper_motor_bipolar.fzp", "⚙", 12),
    ("seven-segment", "7-Segment Display", "output", "core/7segment_13_cat.fzp", "🔢", 12),
    ("lcd16x2", "LCD 16x2", "output", "core/lcd-GDM1602K.fzp", "📺", 12),
    ("neopixel", "NeoPixel", "output", "core/ws2812b.fzp", "✨", 12),

    ("battery-9v", "9V Battery", "power", "core/Battery block 9V.fzp", "🔋", 16),
    ("battery-aa", "1.5V Battery", "power", "core/battery-AA.fzp", "🔋", 16),
    ("coin-cell", "Coin Cell 3V", "power", "core/sparkfun-electromechanical-battery-20pth.fzp", "🪙", 12),

    ("transistor-npn", "NPN Transistor", "ics", "core/transistor_signal_NPN_TO92_CBE.fzp", "🔺", 14),
    ("transistor-pnp", "PNP Transistor", "ics", "core/basic_power_transistor_pnp.fzp", "🔻", 14),
    ("relay", "Relay SPDT", "ics", "core/TE_RELAY.fzp", "🧰", 12),
    ("timer-555", "555 Timer", "ics", "core/555timer.fzp", "⏱️", 12),
    ("shift-register", "8-Bit Shift Register", "ics", "core/74HC595.fzp", "🧮", 12),
    ("opamp", "Dual Op-Amp", "ics", "core/lm358.fzp", "📈", 12),

    ("breadboard-mini", "Breadboard Mini", "breadboards", "core/miniBreadboard.fzp", "▤", 12),
]


def main():
    entries = []
    for ctype, name, category, fzp_path, icon, leg in MANIFEST:
        try:
            fzp = fetch(fzp_path)
        except Exception as e:
            print(f"  SKIP {ctype}: fzp {fzp_path} -> {e}")
            continue
        svg_name, conns = parse_fzp(fzp)
        if not svg_name or not conns:
            print(f"  SKIP {ctype}: no breadboard svg / connectors")
            continue
        try:
            svg = fetch("svg/core/breadboard/" + svg_name)
        except Exception as e:
            print(f"  SKIP {ctype}: svg {svg_name} -> {e}")
            continue

        svg = trim_legs(svg, leg)
        vb = viewbox(svg)
        upi = units_per_inch(svg, vb[2])

        pts, used, terms, by_conn = [], set(), [], {}
        for idx, cn in enumerate(conns):
            p = None
            for candidate in (cn["legId"], cn["terminalId"], cn["svgId"], f'{cn["id"]}pin'):
                if candidate:
                    p = element_point(svg, candidate)
                    if p:
                        break
            if not p:
                print(f"    ! {ctype}: no position for {cn['id']} ({cn['name']})")
                continue
            tid, label = slug(cn["name"], used, idx)
            by_conn[cn["id"]] = tid
            pts.append(p)
            terms.append((tid, label, p))

        if len(terms) < 2:
            print(f"  SKIP {ctype}: only {len(terms)} usable terminals")
            continue

        groups = []
        for bus in parse_buses(fzp):
            ids = [by_conn[c] for c in bus if c in by_conn]
            if len(ids) > 1:
                groups.append(ids)

        svg = grow_viewbox(svg, pts)
        vb = viewbox(svg)
        art = f"{ctype}.svg"
        with open(os.path.join(OUT_SVG, art), "w", encoding="utf-8", newline="\n") as f:
            f.write(svg)

        k = PX_PER_INCH / upi
        entries.append({
            "type": ctype, "name": name, "category": category, "icon": icon, "art": art,
            "width": round(vb[2] * k, 2), "height": round(vb[3] * k, 2),
            "source": fzp_path.replace("core/", ""), "svg": svg_name,
            "internalGroups": groups,
            "terminals": [{"id": tid, "label": lbl, "x": round(p[0] * k, 2), "y": round(p[1] * k, 2)}
                          for tid, lbl, p in terms],
        })
        print(f"  ok  {ctype:22s} {vb[2] * k:6.1f}x{vb[3] * k:6.1f}px  "
              f"{len(terms):2d} pins {len(groups):2d} buses  <- {svg_name}")

    with open(os.path.join(CACHE, "entries.json"), "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=1)
    emit_ts(entries)
    print(f"\n{len(entries)}/{len(MANIFEST)} parts generated")
    return entries


def js(v):
    return json.dumps(v, ensure_ascii=False)


def emit_ts(entries):
    out = [
        "// AUTO-GENERATED - do not edit by hand.",
        "// Produced by scripts/gen-electronics-parts.py, which reads every size, pin",
        "// position and internal bus straight out of the Fritzing part it names,",
        "// so nothing here is a guess. Artwork lives in public/electronics/.",
        "",
        'import { ComponentDef } from "./types";',
        "",
        "export const GENERATED_PARTS: ComponentDef[] = [",
    ]
    for e in entries:
        out.append(f"  // {e['source']} -> {e['svg']}")
        out.append("  {")
        out.append(f"    type: {js(e['type'])}, name: {js(e['name'])}, category: {js(e['category'])},")
        out.append(f"    icon: {js(e['icon'])}, art: {js(e['art'])}, width: {e['width']}, height: {e['height']},")
        out.append("    terminals: [")
        for t in e["terminals"]:
            out.append(f"      {{ id: {js(t['id'])}, label: {js(t['label'])}, x: {t['x']}, y: {t['y']} }},")
        out.append("    ],")
        if e["internalGroups"]:
            out.append("    internalGroups: [")
            for grp in e["internalGroups"]:
                out.append("      [" + ", ".join(js(g) for g in grp) + "],")
            out.append("    ],")
        out.append("  },")
    out.append("];")
    out.append("")
    with open(OUT_TS, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out))
    print(f"  -> {OUT_TS}")


if __name__ == "__main__":
    main()
