import { useState, useEffect } from 'react';
import { IconPlayerPlay as Play, IconSquare as Square, IconCpu as Cpu, IconTerminal2 as Terminal, IconBolt as Zap, IconGauge as Gauge, IconCompass as Compass, IconCircleCheck, IconAlertTriangle, IconCode, IconMap2, IconDeviceGamepad2, IconRobot, IconRefresh, IconTrophy } from '@tabler/icons-react';
import { useI18n } from '../i18n/index.jsx';
import { ARENA_ZONES } from '../simulation/arenaBuilder';

const DEFAULT_ARDUINO_CODE = `// Arduino Bot Control Code
#include <Servo.h>

Servo myServo;
const int ENA = 5;
const int IN1 = 6;
const int IN2 = 7;
const int TRIG = 9;
const int ECHO = 10;

void setup() {
  Serial.begin(9600);
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  myServo.attach(11);

  // Motor tezligini sozlash
  analogWrite(ENA, 200);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  // Servoni 90 gradusga burish
  myServo.write(90);
}

long readUltrasonic() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH, 30000) * 0.034 / 2;
}

void loop() {
  long distance = readUltrasonic();
  Serial.print("Masofa: ");
  Serial.print(distance);
  Serial.println(" cm");

  if (distance < 15) {
    // To'siq topildi — to'xtatish
    digitalWrite(IN1, LOW);
  }
  delay(100);
}`;

/** Kodda yozilgan to'siq chegarasini o'qiydi: `if (distance < 15)`.
 * Shunda o'quvchi kodni o'zgartirsa, robotning xatti-harakati ham o'zgaradi —
 * bu panelning butun ma'nosi shunda. Topilmasa 15 sm (standart qiymat). */
function readStopDistance(code) {
  const match = code.match(/distance\s*<\s*(\d+(?:\.\d+)?)/);
  if (!match) return 15;
  return Math.max(3, Math.min(120, Number(match[1])));
}

export default function SimulationPanel({
  sceneObjects = [],
  isSimulating,
  telemetry,
  driveMode,
  logs = [],
  onDriveModeChange,
  onStopCmChange,
  onLog,
  onResetLogs,
  onStartSimulation,
  onStopSimulation,
  onUpdateSimState,
}) {
  const { t } = useI18n();
  const [code, setCode] = useState(DEFAULT_ARDUINO_CODE);
  const [motorSpeed, setMotorSpeed] = useState(180);
  const [servoAngle, setServoAngle] = useState(90);
  const [compileState, setCompileState] = useState('idle');

  const stopCm = readStopDistance(code);

  const types = sceneObjects.map((item) => String(item.type || '').toLowerCase());
  const benchChecks = [
    { label: 'Kontroller', ok: types.some((type) => type.includes('arduino') || type.includes('esp32') || type.includes('raspberry')) },
    { label: 'Motor drayver', ok: types.some((type) => type.includes('l298') || type.includes('driver')) },
    { label: 'Harakat uzeli', ok: types.some((type) => type.includes('motor') || type.includes('wheel') || type.includes('gear')) },
    { label: 'Quvvat manbai', ok: types.some((type) => type.includes('battery') || type.includes('power')) },
  ];
  const hardwareReady = benchChecks.every((check) => check.ok);
  const codeReady = /void\s+setup\s*\(/.test(code) && /void\s+loop\s*\(/.test(code);

  // Slayderlar sahnaga uzatiladi: motor tezligi va servo burchagi robotning
  // haqiqiy harakatiga kiradi, shuning uchun ular o'zgargan zahoti yuboriladi.
  useEffect(() => {
    onUpdateSimState?.({ motorSpeed, servoAngle });
  }, [motorSpeed, servoAngle, onUpdateSimState]);

  // Kodda yozilgan to'siq chegarasi sahnaga ham kerak (HUD va avtonom mantiq).
  useEffect(() => {
    onStopCmChange?.(stopCm);
  }, [stopCm, onStopCmChange]);

  // Serial Monitor satrlari App da yig'iladi: masofa o'lchovlari sahnaning
  // animatsiya siklidan keladi, tugma xabarlari esa shu yerdan — ikkalasi
  // bitta ro'yxatda bo'lgandagina loglar to'g'ri tartibda turadi.

  const handleStart = () => {
    if (!hardwareReady || !codeReady) {
      onResetLogs?.([`[XATO] Sinovni boshlashdan oldin apparat zanjiri va setup()/loop() kodini tekshiring.`]);
      return;
    }
    onResetLogs?.([
      `[SYSTEM] INNOHUB sinov poligonida sinov boshlandi.`,
      `[ARDUINO] Setup bajarildi. PWM = ${motorSpeed}, Servo = ${servoAngle}°`,
      `[ARDUINO] To'siq chegarasi kodda: distance < ${stopCm} sm`,
      `[SENSOR] HC-SR04 ultratovush sensori faol.`,
      driveMode === 'manual'
        ? `[REJIM] Qo'lda: W/A/S/D — haydash, Space — yukni olish/qo'yish.`
        : `[REJIM] Avtonom: robot kod mantig'i bo'yicha o'zi yuradi.`,
    ]);
    onStartSimulation?.({ motorSpeed, servoAngle });
  };

  const handleRestart = () => {
    // Poligonni qayta qurish uchun sinovni to'xtatib, darhol qayta boshlaymiz:
    // ThreeScene dagi effekt shu paytda robotni startga qaytaradi.
    onStopSimulation?.();
    window.setTimeout(handleStart, 60);
  };

  const handleCompile = () => {
    const passed = codeReady;
    setCompileState(passed ? 'ready' : 'error');
    onLog?.(passed ? '[BUILD] sketch.ino tekshirildi: 0 ta xato, sinovga tayyor.' : '[BUILD] setup() yoki loop() funksiyasi topilmadi.');
  };

  const handleStop = () => {
    onLog?.(`[SYSTEM] Simulyatsiya to'xtatildi.`);
    if (onStopSimulation) {
      onStopSimulation();
    }
  };

  return (
    <aside className="sidebar-right glass-panel" style={{ width: '420px' }}>
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Cpu className="icon-blue" size={20} />
          <h2>{t('sim.title')}</h2>
        </div>
        <p className="sidebar-subtitle">Arduino C++ kodi va to‘siqli 3D sinov xonasi</p>
      </div>

      <div className="simulation-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100% - 70px)', overflowY: 'auto' }}>
        <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${hardwareReady ? '#1f8f6c' : '#475569'}`, background: '#111827' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f8fafc', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            <span>Sinov stendi</span>
            <span style={{ color: hardwareReady ? '#5ee5b0' : '#fbbf24' }}>{hardwareReady ? 'ULANISH TAYYOR' : 'ZANJIR TO‘LIQ EMAS'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {benchChecks.map((check) => (
              <div key={check.label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: check.ok ? '#d1fae5' : '#cbd5e1', fontSize: 11 }}>
                {check.ok ? <IconCircleCheck size={14} color="#34d399" /> : <IconAlertTriangle size={14} color="#fbbf24" />}
                {check.label}
              </div>
            ))}
          </div>
        </div>

        {/* Sinov poligoni: bitta maydon, ketma-ket zonalar */}
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#111827' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
            <IconMap2 size={14} />
            <span>INNOHUB sinov poligoni</span>
          </div>
          <p style={{ fontSize: 10.5, color: '#94a3b8', margin: '0 0 10px 0', lineHeight: 1.5 }}>
            2.9 × 2.1 m maydon. Robot chapdagi startdan o‘ngdagi finishga qadar
            barcha zonadan o‘tishi kerak.
          </p>
          <ol style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: 0, padding: 0, listStyle: 'none', counterReset: 'zone' }}>
            {ARENA_ZONES.map((zone, i) => (
              <li
                key={zone.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 9px',
                  borderRadius: 7,
                  border: '1px solid #24314a',
                  background: '#0f172a',
                }}
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    background: '#1e3a5f',
                    color: '#7dd3fc',
                    fontSize: 10,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{zone.label}</span>
                  <span style={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>{zone.hint}</span>
                </span>
              </li>
            ))}
          </ol>

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {[
              { id: 'auto', label: 'Avtonom', icon: IconRobot },
              { id: 'manual', label: "Qo'lda (WASD)", icon: IconDeviceGamepad2 },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onDriveModeChange?.(option.id)}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '8px 6px',
                  borderRadius: 7,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${driveMode === option.id ? '#7c3aed' : '#334155'}`,
                  background: driveMode === option.id ? 'rgba(124, 58, 237, 0.2)' : '#0f172a',
                  color: driveMode === option.id ? '#ddd6fe' : '#94a3b8',
                }}
              >
                <option.icon size={14} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Simulyatsiya Boshqaruv Tugmalari */}
        <div className="sim-controls" style={{ display: 'flex', gap: '10px' }}>
          {!isSimulating ? (
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '12px', background: hardwareReady && codeReady ? '#0f8065' : '#475569', fontSize: '14px', fontWeight: 'bold', cursor: hardwareReady && codeReady ? 'pointer' : 'not-allowed' }}
              onClick={handleStart}
            >
              <Play size={18} />
              <span>{t('sim.start')}</span>
            </button>
          ) : (
            <>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: '12px', background: '#dc2626', fontSize: '14px', fontWeight: 'bold' }}
                onClick={handleStop}
              >
                <Square size={18} />
                <span>{t('sim.stop')}</span>
              </button>
              <button
                className="btn-primary"
                title="Robotni startga qaytarish"
                style={{ padding: '12px 14px', background: '#1e293b', border: '1px solid #334155' }}
                onClick={handleRestart}
              >
                <IconRefresh size={18} />
              </button>
            </>
          )}
        </div>

        {/* Jonli natijalar tablosi */}
        {isSimulating && telemetry && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${telemetry.goalReached ? '#15803d' : '#334155'}`,
              background: telemetry.goalReached ? 'rgba(22, 163, 74, 0.14)' : '#0b1220',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9, fontSize: 12, fontWeight: 700, color: telemetry.goalReached ? '#4ade80' : '#38bdf8' }}>
              <IconTrophy size={14} />
              <span>{telemetry.goalReached ? 'MARRAGA YETDI' : 'Sinov ketmoqda'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'To‘siqqacha', value: `${telemetry.distanceCm.toFixed(1)} sm`, alert: telemetry.distanceCm < stopCm },
                { label: 'Tezlik', value: `${telemetry.speedMmS} mm/s` },
                { label: 'Vaqt', value: `${telemetry.elapsed.toFixed(1)} s` },
                { label: 'Urilishlar', value: telemetry.collisions, alert: telemetry.collisions > 0 },
              ].map((item) => (
                <div key={item.label} style={{ background: '#0f172a', borderRadius: 7, padding: '7px 9px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: item.alert ? '#f87171' : '#e2e8f0' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-vaqtli Boshqaruv Panelchasi */}
        <div className="sim-sliders-card" style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} />
            <span>3D Harakat Interaktiv Tekshiruvi</span>
          </div>

          {/* Motor Speed Slider */}
          <div className="slider-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#e2e8f0', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Gauge size={14} /> DC Motor Tezligi:</span>
              <span style={{ fontWeight: 'bold', color: '#34d399' }}>{motorSpeed} RPM</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={motorSpeed}
              onChange={(e) => setMotorSpeed(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981' }}
            />
          </div>

          {/* Servo Angle Slider */}
          <div className="slider-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#e2e8f0', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Compass size={14} /> Servo Burchagi:</span>
              <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{servoAngle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={servoAngle}
              onChange={(e) => setServoAngle(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
          </div>
        </div>

        {/* Arduino C++ Kod Muharriri */}
        <div className="code-block-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#94a3b8' }}>
            <span>Arduino C++ Kodi (sketch.ino)</span>
            <span style={{ color: compileState === 'error' ? '#f87171' : '#34d399', fontSize: '11px' }}>{compileState === 'ready' ? '● Build tayyor' : compileState === 'error' ? '● Xato topildi' : '● C++ Syntax'}</span>
          </div>
          <div style={{ fontSize: 10.5, color: '#94a3b8', lineHeight: 1.45 }}>
            Poligondagi robot shu koddan <b style={{ color: '#38bdf8' }}>distance &lt; {stopCm}</b> chegarasini o‘qiydi — raqamni
            o‘zgartiring va robot to‘siqlarga boshqacha munosabat bildiradi.
          </div>
          <textarea
            value={code}
            onChange={(e) => { setCode(e.target.value); setCompileState('idle'); }}
            style={{
              width: '100%',
              height: '180px',
              background: '#090d16',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '12px',
              color: '#38bdf8',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.4',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <button type="button" onClick={handleCompile} style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #334155', background: '#172033', color: '#e2e8f0', borderRadius: 7, padding: '8px 11px', fontSize: 12, fontWeight: 700 }}>
            <IconCode size={15} /> Kodni tekshirish
          </button>
        </div>

        {/* Simulyatsiya Konsoli (Loglar) */}
        <div className="console-card" style={{ background: '#020617', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            <Terminal size={14} />
            <span>Serial Monitor (Simulyatsiya konsoli)</span>
          </div>
          <div style={{ height: '110px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', color: '#a7f3d0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {logs.map((lg, idx) => (
              <div key={idx}>{lg}</div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
