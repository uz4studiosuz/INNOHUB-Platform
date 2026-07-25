import { ComponentDef, Terminal } from "./types";
import { BREADBOARD_DEF } from "./breadboard";
import { svgScale } from "./units";

// Every part below is drawn with the real Fritzing breadboard-view artwork we
// serve out of public/electronics/ (see CREDITS.md), not a hand-drawn stand-in.
// So the terminals are not an invented grid either: each x/y is the pin-hole or
// lead-tip coordinate read out of that same SVG, run through the part's own
// units-per-inch so it lands exactly on the artwork. Sizes come from the SVGs'
// real physical dimensions, which is what keeps a resistor resistor-sized next
// to an Arduino, the way it is in Tinkercad.

const uno = svgScale(72); //  arduino-uno.svg    212.372 x 151.2
const led = svgScale(100); // led-<colour>.svg    21.467 x 57
const rgb = svgScale(72); //  rgb-led.svg         23.76 x 44
const res = svgScale(100); // resistor artwork    42.917 x 9.71
const btn = svgScale(100); // pushbutton.svg      24.518 x 33.002
const pot = svgScale(72); //  potentiometer.svg   42.539 x 84.941
const srv = svgScale(100); // servo-*.svg        113.976 x 91.702
const pzo = svgScale(72); //  piezo.svg           78.585 x 78

/**
 * Landmarks inside the artwork that the renderer paints over - the LED dome it
 * lights up, the hub the servo horn pivots around, and so on. Pre-scaled to
 * canvas px here so ComponentView never has to know a part's SVG unit system.
 */
export const ART = {
  led: { cx: led(9.844), cy: led(15), r: led(12) },
  rgb: { cx: rgb(11.95), cy: rgb(12), r: rgb(9) },
  button: { cx: btn(12.27), cy: btn(16.491), r: btn(7.15) },
  piezo: { cx: pzo(39.292), cy: pzo(28.367), r: pzo(28.4) },
  // The horn pivots on the output shaft - the big ellipse sitting on the top
  // flange, not the small screw hole out at the far end of the lever.
  servo: { hubX: srv(35.536), hubY: srv(19.647) },
  /** The resistor is inlined instead, so its colour bands can track the ohms. */
  resistor: { scale: res(1) },
};

// ---- Arduino Uno -----------------------------------------------------------
const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);

interface PinSpec { id: string; label: string; x: number; y: number; role?: Terminal["role"]; pin?: string }

function digitalTop(): Terminal[] {
  const digital = (p: number, x: number): PinSpec => ({
    id: `d${p}`,
    label: PWM_PINS.has(p) ? `~${p}` : `${p}`,
    x: uno(x),
    y: uno(7.2),
    role: "digital",
    pin: `${p}`,
  });
  // x values are the connectorNNpin cx from arduino-uno.svg, left to right.
  return [
    { id: "aref", label: "AREF", x: uno(85.652), y: uno(7.2) },
    { id: "gnd0", label: "GND", x: uno(92.852), y: uno(7.2), role: "gnd" },
    digital(13, 100.052), digital(12, 107.252), digital(11, 114.452),
    digital(10, 121.652), digital(9, 128.852), digital(8, 136.051),
    digital(7, 147.573), digital(6, 154.772), digital(5, 161.972),
    digital(4, 169.172), digital(3, 176.372), digital(2, 183.573),
    { id: "d1", label: "TX1", x: uno(190.772), y: uno(7.2), role: "digital", pin: "1" },
    { id: "d0", label: "RX0", x: uno(197.972), y: uno(7.2), role: "digital", pin: "0" },
  ];
}

function bottomRow(): Terminal[] {
  return [
    { id: "ioref", label: "IOREF", x: uno(104.372), y: uno(144) },
    { id: "reset", label: "RESET", x: uno(111.573), y: uno(144) },
    { id: "3v3", label: "3V3", x: uno(118.772), y: uno(144), role: "power3v3" },
    { id: "5v", label: "5V", x: uno(125.972), y: uno(144), role: "power5v" },
    { id: "gnd1", label: "GND", x: uno(133.172), y: uno(144), role: "gnd" },
    { id: "gnd2", label: "GND", x: uno(140.372), y: uno(144), role: "gnd" },
    { id: "vin", label: "VIN", x: uno(147.573), y: uno(144), role: "vin" },
    { id: "a0", label: "A0", x: uno(161.972), y: uno(144), role: "analog", pin: "A0" },
    { id: "a1", label: "A1", x: uno(169.172), y: uno(144), role: "analog", pin: "A1" },
    { id: "a2", label: "A2", x: uno(176.372), y: uno(144), role: "analog", pin: "A2" },
    { id: "a3", label: "A3", x: uno(183.573), y: uno(144), role: "analog", pin: "A3" },
    { id: "a4", label: "A4", x: uno(190.772), y: uno(144), role: "analog", pin: "A4" },
    { id: "a5", label: "A5", x: uno(197.972), y: uno(144), role: "analog", pin: "A5" },
  ];
}

// The simplified 5-hole node is our own teaching aid rather than a real part,
// so it stays hand-drawn - but on the breadboard's 0.1in pitch, so wires run
// between the two without kinking.
const PITCH = svgScale(72)(7.1995);

export const COMPONENT_LIBRARY: Record<string, ComponentDef> = {
  "arduino-uno": {
    type: "arduino-uno",
    name: "Arduino Uno",
    category: "boards",
    width: uno(212.372),
    height: uno(151.2),
    terminals: [...digitalTop(), ...bottomRow()],
    icon: "🟩",
  },

  led: {
    type: "led",
    name: "LED",
    category: "output",
    width: led(21.467),
    height: led(57),
    // connector0 is the cathode (left leg), connector1 the anode (right).
    terminals: [
      { id: "cathode", label: "-", x: led(6.287), y: led(55) },
      { id: "anode", label: "+", x: led(16.29), y: led(55) },
    ],
    defaults: { color: "red" },
    icon: "💡",
  },

  "rgb-led": {
    type: "rgb-led",
    name: "RGB LED",
    category: "output",
    width: rgb(23.76),
    height: rgb(44),
    // Fritzing's pin order on a common-cathode RGB: red, cathode, green, blue.
    terminals: [
      { id: "r", label: "R", x: rgb(1.08), y: rgb(42) },
      { id: "cathode", label: "-", x: rgb(8.28), y: rgb(42) },
      { id: "g", label: "G", x: rgb(15.48), y: rgb(42) },
      { id: "b", label: "B", x: rgb(22.68), y: rgb(42) },
    ],
    icon: "🌈",
  },

  resistor: {
    type: "resistor",
    name: "Resistor",
    category: "general",
    width: res(42.917),
    height: res(9.71),
    terminals: [
      { id: "a", label: "", x: res(1), y: res(5.045) },
      { id: "b", label: "", x: res(41.917), y: res(5.045) },
    ],
    defaults: { ohms: 220 },
    icon: "〰️",
  },

  pushbutton: {
    type: "pushbutton",
    name: "Pushbutton",
    category: "input",
    width: btn(24.518),
    height: btn(33.002),
    // Each side of the switch body is permanently bridged; pressing joins them.
    terminals: [
      { id: "1a", label: "1a", x: btn(2.106), y: btn(1.502) },
      { id: "2a", label: "2a", x: btn(22.106), y: btn(1.502) },
      { id: "1b", label: "1b", x: btn(2.106), y: btn(31.502) },
      { id: "2b", label: "2b", x: btn(22.106), y: btn(31.502) },
    ],
    internalGroups: [["1a", "1b"], ["2a", "2b"]],
    icon: "🔘",
  },

  buzzer: {
    type: "buzzer",
    name: "Piezo Buzzer",
    category: "output",
    width: pzo(78.585),
    height: pzo(78),
    // Black lead is the negative one, red the positive - as drawn.
    terminals: [
      { id: "neg", label: "-", x: pzo(35.687), y: pzo(76.004) },
      { id: "pos", label: "+", x: pzo(42.928), y: pzo(76.004) },
    ],
    icon: "🔊",
  },

  potentiometer: {
    type: "potentiometer",
    name: "Potentiometer",
    category: "input",
    width: pot(42.539),
    height: pot(84.941),
    terminals: [
      { id: "t1", label: "1", x: pot(6.87), y: pot(84.66) },
      { id: "wiper", label: "W", x: pot(21.27), y: pot(84.66) },
      { id: "t2", label: "2", x: pot(35.67), y: pot(84.66) },
    ],
    defaults: { value: 512 }, // 0..1023
    icon: "🎛️",
  },

  servo: {
    type: "servo",
    name: "Servo Motor",
    category: "output",
    width: srv(113.976),
    height: srv(91.702),
    // The three lead tips, in the artwork's own black / red / yellow order.
    terminals: [
      { id: "gnd", label: "-", x: srv(113.42), y: srv(84.439) },
      { id: "vcc", label: "+", x: srv(113.42), y: srv(74.439) },
      { id: "sig", label: "S", x: srv(113.42), y: srv(64.439) },
    ],
    icon: "⚙️",
  },

  "bb-node": {
    type: "bb-node",
    name: "Breadboard node",
    category: "breadboards",
    width: PITCH * 6,
    height: PITCH * 2,
    // All 5 holes share a single electrical net (like a breadboard column).
    terminals: [0, 1, 2, 3, 4].map((i) => ({
      id: `n${i}`,
      label: "",
      x: PITCH * (i + 1),
      y: PITCH,
    })),
    internalGroups: [["n0", "n1", "n2", "n3", "n4"]],
    icon: "▦",
  },

  breadboard: BREADBOARD_DEF,
};

export const PALETTE_ORDER: ComponentDef["type"][] = [
  "breadboard",
  "arduino-uno",
  "led",
  "rgb-led",
  "resistor",
  "pushbutton",
  "potentiometer",
  "buzzer",
  "servo",
  "bb-node",
];

/** Must stay in step with the led-<name>.svg files in public/electronics/. */
export const LED_COLORS: Record<string, string> = {
  red: "#ff3b30",
  green: "#34c759",
  blue: "#0a84ff",
  yellow: "#ffd60a",
  white: "#f5f5f5",
};
