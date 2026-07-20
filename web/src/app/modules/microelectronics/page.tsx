"use client";

import { useState } from "react";

const CHIPS = [
  {
    id: "atmega328p", name: "ATmega328P (Arduino Uno)",
    type: "Mikrokontroller", clock: "16 MHz", flash: "32 KB", sram: "2 KB",
    pins: "23 DIO + 8 ADC", voltage: "5V", desc: "8-bit AVR MCU",
  },
  {
    id: "esp32", name: "ESP32 (WiFi + BLE)",
    type: "Mikrokontroller", clock: "240 MHz", flash: "16 MB", sram: "520 KB",
    pins: "34 GPIO", voltage: "3.3V", desc: "Dual-core Xtensa LX6",
  },
  {
    id: "rp2040", name: "RP2040 (Raspberry Pi Pico)",
    type: "Mikrokontroller", clock: "133 MHz", flash: "2 MB", sram: "264 KB",
    pins: "30 GPIO", voltage: "3.3V", desc: "Dual-core Cortex-M0+",
  },
  {
    id: "74hc595", name: "74HC595 Shift Register",
    type: "Digital IC", clock: "100 MHz", flash: "-", sram: "-",
    pins: "16 pins", voltage: "5V", desc: "8-bit serial-in parallel-out",
  },
  {
    id: "lm358", name: "LM358 Op-Amp",
    type: "Analog IC", clock: "1 MHz GBW", flash: "-", sram: "-",
    pins: "8 pins", voltage: "3-32V", desc: "Dual low-power op-amp",
  },
  {
    id: "arduino_uno_r3", name: "Arduino Uno R3",
    type: "Development Board", clock: "16 MHz", flash: "32 KB", sram: "2 KB",
    pins: "14 DIO + 6 AI", voltage: "5V", desc: "ATmega328P based board",
  },
];

export default function MicroelectronicsPage() {
  const [selected, setSelected] = useState(CHIPS[0]);

  return (
    <div className="flex flex-col min-h-screen p-6 gap-6">
      <h1 className="text-3xl font-bold">Mikroelektronika Ensiklopediyasi</h1>
      <p className="text-gray-600 max-w-2xl">
        Mikrokontrollerlar, IC lar va elektron komponentlar haqida ma&apos;lumot.
      </p>

      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col gap-2 min-w-[250px] bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h2 className="font-semibold text-lg mb-2">Komponentlar</h2>
          {CHIPS.map(chip => (
            <button key={chip.id} onClick={() => setSelected(chip)}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selected.id === chip.id
                  ? "bg-cyan-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}>
              <div className="font-semibold">{chip.name}</div>
              <div className="text-xs opacity-80">{chip.type}</div>
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[320px] bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-4">{selected.name}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
              <div className="text-xs text-cyan-600">Turi</div>
              <div className="text-lg font-semibold">{selected.type}</div>
            </div>
            <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
              <div className="text-xs text-cyan-600">Klock tezligi</div>
              <div className="text-lg font-semibold">{selected.clock}</div>
            </div>
            {selected.flash !== "-" && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs text-blue-600">Flash xotira</div>
                <div className="text-lg font-semibold">{selected.flash}</div>
              </div>
            )}
            {selected.sram !== "-" && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs text-blue-600">SRAM</div>
                <div className="text-lg font-semibold">{selected.sram}</div>
              </div>
            )}
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="text-xs text-purple-600">Pinlar</div>
              <div className="text-lg font-semibold">{selected.pins}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="text-xs text-green-600">Kuchlanish</div>
              <div className="text-lg font-semibold">{selected.voltage}</div>
            </div>
          </div>
          <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Ta&apos;rif</div>
            <p className="text-gray-700">{selected.desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
