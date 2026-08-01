// The libraries a sketch may #include, and what each one actually brings.
//
// This is the compiler's link table as much as it is the palette's catalogue:
// an #include of a header that is not here fails to compile, and a class used
// without including its header fails too, the same way the real toolchain
// behaves. `simulated` is the honest part - a header can be recognised and
// still drive no hardware, and the compiler says so instead of letting the
// sketch look like it works.

export interface LibraryDef {
  /** What goes inside the angle brackets. */
  header: string;
  name: string;
  /** Classes it introduces, usable as a variable type. */
  types: string[];
  /** Objects it provides ready-made, like Serial (which is built in). */
  objects: string[];
  /** Methods accepted per type/object name, so a typo is caught. */
  methods: Record<string, string[]>;
  /** Free functions and constants added to the global namespace. */
  functions: string[];
  constants: Record<string, number>;
  /** Whether the methods actually do something in this simulator. */
  simulated: boolean;
  /** Shown in the library panel, in Uzbek. */
  note: string;
  /** Starter code the panel can paste in. */
  snippet: string;
}

const SERVO: LibraryDef = {
  header: "Servo.h",
  name: "Servo",
  types: ["Servo"],
  objects: [],
  methods: {
    Servo: ["attach", "detach", "write", "writeMicroseconds", "read", "attached"],
  },
  functions: [],
  constants: {},
  simulated: true,
  note: "Servo motorni burchak bo'yicha boshqaradi. Kanvasdagi servo signal simi ulangan pinni topib, o'sha servoni buradi.",
  snippet: `#include <Servo.h>

Servo mening;

void setup() {
  mening.attach(9);
}

void loop() {
  mening.write(0);
  delay(1000);
  mening.write(180);
  delay(1000);
}`,
};

const LIQUID_CRYSTAL: LibraryDef = {
  header: "LiquidCrystal.h",
  name: "LiquidCrystal",
  types: ["LiquidCrystal"],
  objects: [],
  methods: {
    LiquidCrystal: [
      "begin", "clear", "home", "setCursor", "print", "write", "cursor", "noCursor",
      "blink", "noBlink", "display", "noDisplay", "scrollDisplayLeft", "scrollDisplayRight",
      "autoscroll", "noAutoscroll", "leftToRight", "rightToLeft", "createChar",
    ],
  },
  functions: [],
  constants: {},
  simulated: true,
  note: "16x2 LCD ekran. Yozilgan matn kanvasdagi LCD komponentida ko'rinadi (RS pini qaysi ekranga ulangani bo'yicha topiladi).",
  snippet: `#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

void setup() {
  lcd.begin(16, 2);
  lcd.print("Salom, INNO HUB");
}

void loop() {
  lcd.setCursor(0, 1);
  lcd.print(millis() / 1000);
}`,
};

const EEPROM_LIB: LibraryDef = {
  header: "EEPROM.h",
  name: "EEPROM",
  types: [],
  objects: ["EEPROM"],
  methods: { EEPROM: ["read", "write", "update", "length", "get", "put"] },
  functions: [],
  constants: {},
  simulated: true,
  note: "1024 baytli o'chmas xotira. Simulyatsiya davomida yozilgan qiymatlar saqlanadi (sahifa yangilanganda tozalanadi).",
  snippet: `#include <EEPROM.h>

void setup() {
  Serial.begin(9600);
  EEPROM.write(0, 42);
  Serial.println(EEPROM.read(0));
}

void loop() {
}`,
};

const SOFTWARE_SERIAL: LibraryDef = {
  header: "SoftwareSerial.h",
  name: "SoftwareSerial",
  types: ["SoftwareSerial"],
  objects: [],
  methods: {
    SoftwareSerial: ["begin", "print", "println", "write", "available", "read", "end", "listen"],
  },
  functions: [],
  constants: {},
  simulated: true,
  note: "Istalgan pinda ikkinchi ketma-ket port. Yozilgani Serial Monitorda [nom] belgisi bilan ko'rinadi; o'qish har doim bo'sh.",
  snippet: `#include <SoftwareSerial.h>

SoftwareSerial bt(10, 11);

void setup() {
  bt.begin(9600);
  bt.println("SoftwareSerial ishlayapti");
}

void loop() {
}`,
};

const WIRE: LibraryDef = {
  header: "Wire.h",
  name: "Wire (I2C)",
  types: [],
  objects: ["Wire"],
  methods: {
    Wire: ["begin", "beginTransmission", "write", "endTransmission", "requestFrom", "read", "available", "onReceive", "onRequest", "setClock"],
  },
  functions: [],
  constants: {},
  simulated: false,
  note: "I2C shinasi. Kod kompilyatsiya bo'ladi, lekin shinada qurilma yo'q — o'qishlar 0 qaytaradi.",
  snippet: `#include <Wire.h>

void setup() {
  Wire.begin();
  Wire.beginTransmission(0x27);
  Wire.write(0);
  Wire.endTransmission();
}

void loop() {
}`,
};

const SPI: LibraryDef = {
  header: "SPI.h",
  name: "SPI",
  types: [],
  objects: ["SPI"],
  methods: { SPI: ["begin", "end", "transfer", "beginTransaction", "endTransaction", "setBitOrder", "setDataMode", "setClockDivider"] },
  functions: [],
  constants: {},
  simulated: false,
  note: "SPI shinasi. Kompilyatsiya bo'ladi, lekin uzatilgan baytlar hech qayerga bormaydi.",
  snippet: `#include <SPI.h>

void setup() {
  SPI.begin();
  SPI.transfer(0xAA);
}

void loop() {
}`,
};

/**
 * Headers that exist only so an #include of them is not an error. They add
 * nothing the interpreter does not already provide - the maths functions are
 * built in, and Arduino.h is implicit in every sketch.
 */
export const FREE_HEADERS = new Set([
  "Arduino.h", "math.h", "stdlib.h", "stdio.h", "string.h", "stdint.h", "avr/pgmspace.h",
]);

export const LIBRARIES: LibraryDef[] = [
  SERVO, LIQUID_CRYSTAL, EEPROM_LIB, SOFTWARE_SERIAL, WIRE, SPI,
];

export const LIB_BY_HEADER: Record<string, LibraryDef> =
  Object.fromEntries(LIBRARIES.map((l) => [l.header, l]));

/** Every header the compiler will accept, for the "unknown library" message. */
export function knownHeaders(): string[] {
  return [...LIBRARIES.map((l) => l.header), ...FREE_HEADERS].sort();
}
