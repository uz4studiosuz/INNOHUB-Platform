import { PlacedComponent, Wire } from "./types";

export interface Example {
  key: string;
  name: string;
  code: string;
  components: PlacedComponent[];
  wires: Wire[];
}

const wire = (id: string, fc: string, ft: string, tc: string, tt: string, color: string): Wire => ({
  id, from: { compId: fc, terminalId: ft }, to: { compId: tc, terminalId: tt }, color,
});

export const EXAMPLES: Example[] = [
  {
    key: "blink",
    name: "LED miltillashi (Blink)",
    code: `// LED miltillashi — Arduino 13-pin
int led = 13;

void setup() {
  pinMode(led, OUTPUT);
}

void loop() {
  digitalWrite(led, HIGH);
  delay(500);
  digitalWrite(led, LOW);
  delay(500);
}`,
    components: [
      { id: "u", type: "arduino-uno", x: 80, y: 80, rotation: 0, props: {} },
      { id: "r", type: "resistor", x: 540, y: 120, rotation: 0, props: { ohms: 220 } },
      { id: "l", type: "led", x: 690, y: 170, rotation: 0, props: { color: "red" } },
    ],
    wires: [
      wire("w1", "u", "d13", "r", "a", "#dc2626"),
      wire("w2", "r", "b", "l", "anode", "#ca8a04"),
      wire("w3", "l", "cathode", "u", "gnd1", "#111827"),
    ],
  },
  {
    key: "button",
    name: "Tugma bilan LED",
    code: `// Tugma bosilganda LED yonadi
int btn = 2;
int led = 13;

void setup() {
  pinMode(btn, INPUT_PULLUP);
  pinMode(led, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(btn) == LOW) {
    digitalWrite(led, HIGH);
    Serial.println("Bosildi");
  } else {
    digitalWrite(led, LOW);
  }
}`,
    components: [
      { id: "u", type: "arduino-uno", x: 80, y: 90, rotation: 0, props: {} },
      { id: "b", type: "pushbutton", x: 540, y: 120, rotation: 0, props: {} },
      { id: "r", type: "resistor", x: 540, y: 260, rotation: 0, props: { ohms: 220 } },
      { id: "l", type: "led", x: 700, y: 240, rotation: 0, props: { color: "green" } },
    ],
    wires: [
      wire("w1", "u", "d2", "b", "1a", "#2563eb"),
      wire("w2", "b", "2a", "u", "gnd1", "#111827"),
      wire("w3", "u", "d13", "r", "a", "#dc2626"),
      wire("w4", "r", "b", "l", "anode", "#ca8a04"),
      wire("w5", "l", "cathode", "u", "gnd2", "#111827"),
    ],
  },
  {
    key: "fade",
    name: "PWM bilan LED xiralashishi (Fade)",
    code: `// analogWrite (PWM) bilan yorqinlikni o'zgartirish
int led = 9;

void setup() {
  pinMode(led, OUTPUT);
}

void loop() {
  for (int b = 0; b <= 255; b++) {
    analogWrite(led, b);
    delay(8);
  }
  for (int b = 255; b >= 0; b--) {
    analogWrite(led, b);
    delay(8);
  }
}`,
    components: [
      { id: "u", type: "arduino-uno", x: 80, y: 80, rotation: 0, props: {} },
      { id: "r", type: "resistor", x: 540, y: 120, rotation: 0, props: { ohms: 220 } },
      { id: "l", type: "led", x: 690, y: 170, rotation: 0, props: { color: "blue" } },
    ],
    wires: [
      wire("w1", "u", "d9", "r", "a", "#9333ea"),
      wire("w2", "r", "b", "l", "anode", "#ca8a04"),
      wire("w3", "l", "cathode", "u", "gnd1", "#111827"),
    ],
  },
];

export const DEFAULT_CODE = EXAMPLES[0].code;
