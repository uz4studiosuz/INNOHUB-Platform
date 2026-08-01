import { useState } from 'react';
import { PackageCheck, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Download } from 'lucide-react';
import { ROBOT_KITS } from '../data/robotKits';
import { useI18n } from '../i18n/index.jsx';

const KIT_SCENARIOS = [
  {
    id: '2wd_car',
    title: '2WD Smart Robot-Mashina',
    description: 'Arduino Uno + L298N + 2 ta TT Motor + G\'ildiraklar + HC-SR04',
    steps: [
      { step: 1, partType: 'arduino-uno', name: 'Arduino Uno Platasi', desc: 'Asosiy shassiga Arduino Uno platasini o\'rnating' },
      { step: 2, partType: 'l298n', name: 'L298N Drayver', desc: 'L298N motor drayverini kontroller yoniga qo\'ying' },
      { step: 3, partType: 'dc-tt-yellow', name: 'DC Sariq TT motor', desc: 'Chap va o\'ng TT motorlarni biriktiring' },
      { step: 4, partType: 'tt-wheel-65mm', name: 'G\'ildirak 65mm', desc: 'G\'ildiraklarni TT motorning o\'qiga snap qiling' },
      { step: 5, partType: 'hc-sr04', name: 'HC-SR04 Sensori', desc: 'Old tomonga ultrasonik masofa sensorini o\'rnating' },
    ],
  },
  {
    id: 'obstacle_bot',
    title: 'Aylanma Radar Robot (Ultrasonic + Servo)',
    description: 'Arduino Uno + SG90 Servo + HC-SR04 Radar',
    steps: [
      { step: 1, partType: 'arduino-uno', name: 'Arduino Uno Platasi', desc: 'Platforma markaziga Arduino Uno platasini qo\'ying' },
      { step: 2, partType: 'sg90', name: 'Servo SG90 9g', desc: 'SG90 servoni old tayanchga mahkamlang' },
      { step: 3, partType: 'hc-sr04', name: 'HC-SR04 Sensori', desc: 'Ultrasonik sensorni servo o\'qiga biriktiring' },
    ],
  },
];

export default function KitAssemblyPanel({ sceneObjects, onAddComponent, onLoadKit }) {
  const { t } = useI18n();
  const [selectedScenarioId, setSelectedScenarioId] = useState('2wd_car');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [alertMessage, setAlertMessage] = useState(null);
  const [selectedKitId, setSelectedKitId] = useState(ROBOT_KITS[0]?.id || '');

  const activeKit = ROBOT_KITS.find(k => k.id === selectedKitId) || ROBOT_KITS[0];

  const handleLoadReadyKit = () => {
    if (!onLoadKit || !activeKit) return;
    if (sceneObjects?.length > 0) {
      const ok = window.confirm(
        t('kit.confirmReplace', { count: sceneObjects.length, title: activeKit.title })
      );
      if (!ok) return;
    }
    onLoadKit(activeKit.id);
    setAlertMessage({ type: 'success', text: t('kit.loadedSuccess', { title: activeKit.title, count: activeKit.partCount }) });
    setTimeout(() => setAlertMessage(null), 2000);
  };

  const activeScenario = KIT_SCENARIOS.find(s => s.id === selectedScenarioId) || KIT_SCENARIOS[0];
  const currentStep = activeScenario.steps[currentStepIndex];

  const handlePlaceTargetPart = () => {
    if (!currentStep) return;

    onAddComponent({
      type: currentStep.partType,
      name: currentStep.name,
    });

    setAlertMessage({ type: 'success', text: t('kit.placedSuccess', { name: currentStep.name }) });

    setTimeout(() => {
      setAlertMessage(null);
      if (currentStepIndex < activeScenario.steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      }
    }, 1200);
  };

  const handleResetScenario = () => {
    setCurrentStepIndex(0);
    setAlertMessage(null);
  };

  return (
    <aside className="sidebar-right glass-panel">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <PackageCheck className="icon-blue" size={20} />
          <h2>{t('kit.title')}</h2>
        </div>
        <p className="sidebar-subtitle">{t('kit.subtitle')}</p>
      </div>

      <div className="kit-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* ─── Tayyorini yukla ─── */}
        <div style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Download size={15} className="icon-blue" />
            <strong style={{ fontSize: '13px' }}>{t('kit.loadReadyTitle')}</strong>
          </div>
          <p style={{ fontSize: '11.5px', opacity: 0.75, margin: '0 0 10px 0', lineHeight: 1.5 }}>
            {t('kit.loadReadyDesc')}
          </p>
          <select
            className="pin-select"
            style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            value={selectedKitId}
            onChange={(e) => setSelectedKitId(e.target.value)}
          >
            {ROBOT_KITS.map(k => (
              <option key={k.id} value={k.id}>{k.title} — {k.difficulty}</option>
            ))}
          </select>
          {activeKit && (
            <p style={{ fontSize: '11px', opacity: 0.65, margin: '0 0 10px 0', lineHeight: 1.45 }}>
              {activeKit.description} · <strong>{activeKit.partCount} detal</strong>
            </p>
          )}
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '9px', fontSize: '13px' }}
            onClick={handleLoadReadyKit}
          >
            {t('kit.loadButton')}
          </button>
        </div>

        {/* Ssenariy Tanlash */}
        <div className="form-group">
          <label className="form-label">{t('kit.scenarioLabel')}</label>
          <select
            className="pin-select"
            style={{ width: '100%', padding: '8px' }}
            value={selectedScenarioId}
            onChange={(e) => {
              setSelectedScenarioId(e.target.value);
              setCurrentStepIndex(0);
              setAlertMessage(null);
            }}
          >
            {KIT_SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {/* Progress Bar */}
        <div className="progress-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
            <span>{t('kit.progress')}</span>
            <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>
              {t('kit.stepNumber', { current: currentStepIndex + 1, total: activeScenario.steps.length })}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${((currentStepIndex + 1) / activeScenario.steps.length) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #34d399)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Alert xabar */}
        {alertMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              background: alertMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: alertMessage.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
              color: alertMessage.type === 'success' ? '#34d399' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {alertMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{alertMessage.text}</span>
          </div>
        )}

        {/* Joriy Qadam Kartochkasi */}
        {currentStep && (
          <div className="current-step-card" style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '12px', border: '1px solid #3b82f6' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 'bold', marginBottom: '6px' }}>
              {t('kit.stepNumber', { current: currentStep.step, total: activeScenario.steps.length })}: {currentStep.name}
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#fff' }}>{currentStep.name}</h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>
              {currentStep.desc}
            </p>

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '10px' }}
              onClick={handlePlaceTargetPart}
            >
              <span>{t('kit.placeButton', { name: currentStep.name })}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Qadamlar Ro'yxati */}
        <div className="steps-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{t('kit.allSteps')}</span>
          {activeScenario.steps.map((st, idx) => (
            <div
              key={st.step}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                background: idx === currentStepIndex ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                border: idx === currentStepIndex ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
                fontSize: '13px',
                color: idx <= currentStepIndex ? '#fff' : '#64748b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: idx < currentStepIndex ? '#10b981' : idx === currentStepIndex ? '#3b82f6' : '#334155', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {idx < currentStepIndex ? '✓' : st.step}
                </span>
                <span>{st.name}</span>
              </div>
            </div>
          ))}
        </div>

        <button className="header-btn" style={{ marginTop: 'auto', justifyContent: 'center' }} onClick={handleResetScenario}>
          <RotateCcw size={16} />
          <span>{t('kit.restart')}</span>
        </button>
      </div>
    </aside>
  );
}

