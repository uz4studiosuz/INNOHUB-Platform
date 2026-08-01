import { useState, useEffect, useRef } from 'react';
import { Play, Square, Cpu, Terminal, Zap, Gauge, Compass } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

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
  myServo.attach(11);

  // Motor tezligini sozlash
  analogWrite(ENA, 200);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  // Servoni 90 gradusga burish
  myServo.write(90);
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

export default function SimulationPanel({
  _sceneObjects,
  isSimulating,
  onStartSimulation,
  onStopSimulation,
  onUpdateSimState,
}) {
  const { t } = useI18n();
  const [code, setCode] = useState(DEFAULT_ARDUINO_CODE);
  const [motorSpeed, setMotorSpeed] = useState(180);
  const [servoAngle, setServoAngle] = useState(90);
  const [sensorDistance] = useState(35.0);
  const [logs, setLogs] = useState([]);

  // The ticking log reads the sliders, but it must not be *restarted* by them.
  // While these values were effect dependencies, nudging a slider mid-run tore
  // down the interval, reseeded the log from scratch and lost the second in
  // progress. A ref lets each tick see the current values without the effect
  // ever re-running.
  const liveRef = useRef({ motorSpeed, servoAngle, sensorDistance, onUpdateSimState });
  useEffect(() => {
    liveRef.current = { motorSpeed, servoAngle, sensorDistance, onUpdateSimState };
  });

  // Only the interval belongs here. The start and stop banners are consequences
  // of pressing a button, not state to be synchronised, so they are written by
  // the handlers below.
  useEffect(() => {
    if (!isSimulating) return undefined;

    const interval = setInterval(() => {
      const live = liveRef.current;
      const noise = (Math.random() * 2 - 1).toFixed(1);
      const dist = Math.max(5, (parseFloat(live.sensorDistance) + parseFloat(noise))).toFixed(1);
      setLogs(prev => [
        `[LOG ${new Date().toLocaleTimeString()}] HC-SR04 Distance: ${dist} cm | Motors: ${live.motorSpeed} RPM | Servo: ${live.servoAngle}°`,
        ...prev.slice(0, 15),
      ]);

      if (live.onUpdateSimState) {
        live.onUpdateSimState({ motorSpeed: live.motorSpeed, servoAngle: live.servoAngle, sensorDistance: dist });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleStart = () => {
    setLogs([
      `[SYSTEM] Simulyatsiya boshlandi...`,
      `[ARDUINO] Setup bajarildi. Motor Speed = ${motorSpeed} RPM, Servo = ${servoAngle}°`,
      `[SENSOR] HC-SR04 Ultrasonik masofa sensori faol.`,
    ]);
    if (onStartSimulation) {
      onStartSimulation({ motorSpeed, servoAngle, sensorDistance });
    }
  };

  const handleStop = () => {
    setLogs(prev => [`[SYSTEM] Simulyatsiya to'xtatildi.`, ...prev]);
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
        <p className="sidebar-subtitle">Arduino C++ kodi va 3D harakat simulyatori</p>
      </div>

      <div className="simulation-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100% - 70px)', overflowY: 'auto' }}>
        {/* Simulyatsiya Boshqaruv Tugmalari */}
        <div className="sim-controls" style={{ display: 'flex', gap: '10px' }}>
          {!isSimulating ? (
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '12px', background: 'linear-gradient(90deg, #10b981, #059669)', fontSize: '14px', fontWeight: 'bold' }}
              onClick={handleStart}
            >
              <Play size={18} />
              <span>{t('sim.start')}</span>
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '12px', background: 'linear-gradient(90deg, #ef4444, #dc2626)', fontSize: '14px', fontWeight: 'bold' }}
              onClick={handleStop}
            >
              <Square size={18} />
              <span>{t('sim.stop')}</span>
            </button>
          )}
        </div>

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
            <span style={{ color: '#34d399', fontSize: '11px' }}>● C++ Syntax</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
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

