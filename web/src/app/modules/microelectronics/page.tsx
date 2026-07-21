"use client";

import { useCallback, useState } from "react";
import { logIteration } from "../../../store/iterationStore";

const CHIPS = [
  {
    id: "atmega328p", name: "ATmega328P (Arduino Uno)",
    type: "Mikrokontroller", clock: "16 MHz", flash: "32 KB", sram: "2 KB",
    pins: "23 DIO + 8 ADC", voltage: "5V", desc: "8-bit AVR MCU",
    clockHz: 16_000_000, gpioTotal: 23, supplyV: 5,
  },
  {
    id: "esp32", name: "ESP32 (WiFi + BLE)",
    type: "Mikrokontroller", clock: "240 MHz", flash: "16 MB", sram: "520 KB",
    pins: "34 GPIO", voltage: "3.3V", desc: "Dual-core Xtensa LX6",
    clockHz: 240_000_000, gpioTotal: 34, supplyV: 3.3,
  },
  {
    id: "rp2040", name: "RP2040 (Raspberry Pi Pico)",
    type: "Mikrokontroller", clock: "133 MHz", flash: "2 MB", sram: "264 KB",
    pins: "30 GPIO", voltage: "3.3V", desc: "Dual-core Cortex-M0+",
    clockHz: 133_000_000, gpioTotal: 30, supplyV: 3.3,
  },
  {
    id: "74hc595", name: "74HC595 Shift Register",
    type: "Digital IC", clock: "100 MHz", flash: "-", sram: "-",
    pins: "16 pins", voltage: "5V", desc: "8-bit serial-in parallel-out",
    clockHz: 100_000_000, gpioTotal: 8, supplyV: 5,
  },
  {
    id: "lm358", name: "LM358 Op-Amp",
    type: "Analog IC", clock: "1 MHz GBW", flash: "-", sram: "-",
    pins: "8 pins", voltage: "3-32V", desc: "Dual low-power op-amp",
    clockHz: 1_000_000, gpioTotal: 2, supplyV: 12,
  },
  {
    id: "arduino_uno_r3", name: "Arduino Uno R3",
    type: "Development Board", clock: "16 MHz", flash: "32 KB", sram: "2 KB",
    pins: "14 DIO + 6 AI", voltage: "5V", desc: "ATmega328P based board",
    clockHz: 16_000_000, gpioTotal: 20, supplyV: 5,
  },
];

type MicroResult = {
  power_W: number;
  total_current_A: number;
  cycle_time_ns: number;
  loop_time_us: number;
  gpio_remaining: number;
  gpio_over_budget: boolean;
  battery_life_hours: number;
};

export default function MicroelectronicsPage() {
  const [selected, setSelected] = useState(CHIPS[0]);
  const [mcuIdleMa, setMcuIdleMa] = useState(20);
  const [peripheralCount, setPeripheralCount] = useState(2);
  const [peripheralMaEach, setPeripheralMaEach] = useState(15);
  const [instructionsPerLoop, setInstructionsPerLoop] = useState(1000);
  const [gpioUsed, setGpioUsed] = useState(4);
  const [batteryMah, setBatteryMah] = useState(2000);
  const [result, setResult] = useState<MicroResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const peripheralCurrentsA = Array.from({ length: peripheralCount }, () => peripheralMaEach / 1000);
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "microelectronics",
          params: {
            clockHz: selected.clockHz,
            supplyV: selected.supplyV,
            mcuIdleCurrentA: mcuIdleMa / 1000,
            peripheralCurrentsA,
            instructionsPerLoop,
            gpioTotal: selected.gpioTotal,
            gpioUsed,
            batteryCapacityMah: batteryMah,
          },
        }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setResult(data);
      logIteration(
        "microelectronics",
        { chip: selected.id, mcuIdleMa, peripheralCount, peripheralMaEach, gpioUsed, batteryMah },
        { label: "Batareya muddati", value: data.battery_life_hours, unit: " soat" }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [selected, mcuIdleMa, peripheralCount, peripheralMaEach, instructionsPerLoop, gpioUsed, batteryMah]);

  return (
    <div className="flex-1 bg-[#080b11] overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-6xl mx-auto py-8 p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold">Mikroelektronika Ensiklopediyasi</h1>
          <p className="text-slate-400 max-w-2xl mt-2">
            Mikrokontrollerlar, IC lar va elektron komponentlar haqida ma&apos;lumot.
          </p>
        </div>

        <div className="flex flex-wrap gap-8">
          <div className="flex flex-col gap-2 min-w-[250px] bg-[#0a0e18] rounded-xl p-4 border border-[rgba(255,255,255,0.1)]">
            <h2 className="font-semibold text-lg mb-2">Komponentlar</h2>
            {CHIPS.map(chip => (
              <button key={chip.id} onClick={() => setSelected(chip)}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  selected.id === chip.id
                    ? "bg-cyan-600 text-white"
                    : "bg-[#141a2b] text-slate-300 hover:bg-[#1a2236] border border-[rgba(255,255,255,0.08)]"
                }`}>
                <div className="font-semibold">{chip.name}</div>
                <div className="text-xs opacity-80">{chip.type}</div>
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[320px] bg-[#0a0e18] rounded-xl p-6 border border-[rgba(255,255,255,0.1)]">
            <h2 className="text-2xl font-bold mb-4">{selected.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/30">
                <div className="text-xs text-cyan-400">Turi</div>
                <div className="text-lg font-semibold">{selected.type}</div>
              </div>
              <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/30">
                <div className="text-xs text-cyan-400">Klock tezligi</div>
                <div className="text-lg font-semibold">{selected.clock}</div>
              </div>
              {selected.flash !== "-" && (
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                  <div className="text-xs text-blue-400">Flash xotira</div>
                  <div className="text-lg font-semibold">{selected.flash}</div>
                </div>
              )}
              {selected.sram !== "-" && (
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                  <div className="text-xs text-blue-400">SRAM</div>
                  <div className="text-lg font-semibold">{selected.sram}</div>
                </div>
              )}
              <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                <div className="text-xs text-purple-400">Pinlar</div>
                <div className="text-lg font-semibold">{selected.pins}</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                <div className="text-xs text-green-400">Kuchlanish</div>
                <div className="text-lg font-semibold">{selected.voltage}</div>
              </div>
            </div>
            <div className="mt-4 bg-[#141a2b] rounded-lg p-3 border border-[rgba(255,255,255,0.08)]">
              <div className="text-xs text-slate-500 mb-1">Ta&apos;rif</div>
              <p className="text-slate-300">{selected.desc}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-8">
          <div className="flex flex-col gap-4 min-w-[280px] bg-[#0a0e18] rounded-xl p-5 border border-[rgba(255,255,255,0.1)]">
            <h2 className="font-semibold text-lg">Quvvat va GPIO kalkulyatori</h2>
            <p className="text-xs text-slate-500 -mt-2">Tanlangan komponent: <span className="text-cyan-400 font-semibold">{selected.name}</span></p>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">MCU tinch holat toki: {mcuIdleMa} mA</span>
              <input type="range" min={1} max={200} step={1} value={mcuIdleMa} onChange={e => setMcuIdleMa(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Ulangan periferiya soni: {peripheralCount}</span>
              <input type="range" min={0} max={15} step={1} value={peripheralCount} onChange={e => setPeripheralCount(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Har biri iste&apos;mol qiladi: {peripheralMaEach} mA</span>
              <input type="range" min={1} max={200} step={1} value={peripheralMaEach} onChange={e => setPeripheralMaEach(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Sikl boshiga instruksiyalar: {instructionsPerLoop}</span>
              <input type="range" min={10} max={100000} step={10} value={instructionsPerLoop} onChange={e => setInstructionsPerLoop(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Ishlatilgan GPIO pinlar: {gpioUsed} / {selected.gpioTotal}</span>
              <input type="range" min={0} max={40} step={1} value={gpioUsed} onChange={e => setGpioUsed(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Batareya sig&apos;imi: {batteryMah} mAh</span>
              <input type="range" min={200} max={10000} step={100} value={batteryMah} onChange={e => setBatteryMah(Number(e.target.value))} />
            </label>

            <button onClick={handleCalc} disabled={loading} className="mt-2 rounded-xl bg-cyan-600 px-6 py-3 text-white font-semibold hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-md cursor-pointer">
              {loading ? "Hisoblanmoqda..." : "▶ Hisoblash"}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300 min-w-[320px] h-fit">
              ❌ Xatolik: {error}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4 flex-1 min-w-[320px]">
              <h2 className="font-semibold text-lg">Natijalar</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/30">
                  <div className="text-xs text-cyan-400">Umumiy quvvat</div>
                  <div className="text-lg font-bold">{result.power_W.toFixed(3)} W</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                  <div className="text-xs text-blue-400">Umumiy tok</div>
                  <div className="text-lg font-bold">{(result.total_current_A * 1000).toFixed(1)} mA</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                  <div className="text-xs text-purple-400">Sikl vaqti</div>
                  <div className="text-lg font-bold">{result.cycle_time_ns.toFixed(1)} ns</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                  <div className="text-xs text-purple-400">Sikl (loop) vaqti</div>
                  <div className="text-lg font-bold">{result.loop_time_us.toFixed(1)} µs</div>
                </div>
                <div className={`rounded-lg p-3 border ${result.gpio_over_budget ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}`}>
                  <div className={`text-xs ${result.gpio_over_budget ? "text-red-400" : "text-green-400"}`}>GPIO qoldiq</div>
                  <div className="text-lg font-bold">{result.gpio_remaining} pin{result.gpio_over_budget ? " ⚠️" : ""}</div>
                </div>
                <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/30">
                  <div className="text-xs text-cyan-400">Batareya muddati</div>
                  <div className="text-lg font-bold">{result.battery_life_hours.toFixed(1)} soat</div>
                </div>
              </div>
              {result.gpio_over_budget && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300">
                  ⚠️ Tanlangan komponentda mavjud GPIO pinlardan ko&apos;proq periferiya ulangan — pin sonini kamaytiring yoki boshqa chip tanlang.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
