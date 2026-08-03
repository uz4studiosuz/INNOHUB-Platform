import { useState, useMemo } from 'react';
import { IconCpu as Cpu, IconX as X, IconCopy as Copy, IconDownload as Download, IconAlertTriangle as AlertTriangle, IconCheck as Check, IconBolt as Zap, IconPlugConnected as Cable, IconCode as Code } from '@tabler/icons-react';
import { generateArduinoCode } from '../arduino/codeGenerator';
import { useI18n } from '../i18n/index.jsx';

const ARDUINO_PINS = [
  { val: 0, label: 'D0 (RX)' },
  { val: 1, label: 'D1 (TX)' },
  { val: 2, label: 'D2 (Digital)' },
  { val: 3, label: 'D3 (PWM)' },
  { val: 4, label: 'D4 (Digital)' },
  { val: 5, label: 'D5 (PWM)' },
  { val: 6, label: 'D6 (PWM)' },
  { val: 7, label: 'D7 (Digital)' },
  { val: 8, label: 'D8 (Digital)' },
  { val: 9, label: 'D9 (PWM)' },
  { val: 10, label: 'D10 (PWM)' },
  { val: 11, label: 'D11 (PWM)' },
  { val: 12, label: 'D12 (Digital)' },
  { val: 13, label: 'D13 (LED/Digital)' },
  { val: 14, label: 'A0 (Analog)' },
  { val: 15, label: 'A1 (Analog)' },
  { val: 16, label: 'A2 (Analog)' },
  { val: 17, label: 'A3 (Analog)' },
];

export default function ArduinoPanel({ isOpen, onClose, objects, pinMappings, onUpdatePinMappings }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('pins'); // 'pins' | 'code' | 'wiring'
  const [copied, setCopied] = useState(false);

  // Arduino kodi va pin diagrammasini avto-generatsiya qilish
  const generated = useMemo(() => {
    return generateArduinoCode(objects, pinMappings);
  }, [objects, pinMappings]);

  if (!isOpen) return null;

  const { code, electronics, conflicts, wiringGuide } = generated;

  // Pin tanlovini o'zgartirish
  const handlePinChange = (objId, pinName, newPinVal) => {
    const updated = {
      ...(pinMappings || {}),
      [objId]: {
        ...((pinMappings && pinMappings[objId]) || {}),
        [pinName]: Number(newPinVal),
      },
    };
    onUpdatePinMappings(updated);
  };

  // Kodni klipbordga nusxalash
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // .ino fayli sifatida yuklab olish
  const handleDownloadIno = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `robot_sketch_${new Date().toISOString().slice(0, 10)}.ino`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container arduino-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Sarlavhasi */}
        <div className="modal-header">
          <div className="modal-title-group">
            <Cpu className="modal-icon text-green" />
            <div>
              <h2>{t('arduino.title')}</h2>
              <p className="modal-subtitle">
                Pin taqsimoti, avtomatik .ino kodi va simlash sxemasi
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Menyu */}
        <div className="tab-menu">
          <button
            className={`tab-item ${activeTab === 'pins' ? 'active' : ''}`}
            onClick={() => setActiveTab('pins')}
          >
            <Zap size={16} />
            Pin Taqsimoti ({electronics.length})
            {conflicts.length > 0 && <span className="badge-danger">{conflicts.length} konflikt</span>}
          </button>

          <button
            className={`tab-item ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            <Code size={16} />
            Arduino Kod (.ino)
          </button>

          <button
            className={`tab-item ${activeTab === 'wiring' ? 'active' : ''}`}
            onClick={() => setActiveTab('wiring')}
          >
            <Cable size={16} />
            Simlash (Wiring) Sxemasi
          </button>
        </div>

        {/* Modal Kontenti */}
        <div className="modal-body">
          {/* TAB 1: PIN TAQSIMOTI */}
          {activeTab === 'pins' && (
            <div className="tab-content">
              {conflicts.length > 0 && (
                <div className="alert-box alert-warning">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>{t('arduino.conflicts')}</strong>
                    <ul className="conflict-list">
                      {conflicts.map((c, idx) => (
                        <li key={idx}>
                          Pin <strong>D{c.pinNum}</strong> ga bir vaqtda 
                          {c.users.map(u => ` "${u.objName} (${u.pinName})"`).join(' va ')} ulanmoqda.
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {electronics.length === 0 ? (
                <div className="empty-state">
                  <Cpu size={40} className="text-gray" />
                  <p>{t('arduino.noElectronics')}</p>
                </div>
              ) : (
                <div className="pin-mapping-grid">
                  {electronics.map((item) => (
                    <div className="pin-card" key={item.id}>
                      <div className="pin-card-header">
                        <span className="font-semibold text-lg">{item.name}</span>
                        <span className="type-tag">{item.type}</span>
                      </div>
                      <div className="pin-card-body">
                        {Object.entries(item.pins).map(([pinName, currentPinVal]) => (
                          <div className="pin-row" key={pinName}>
                            <label className="pin-label">{pinName} pini:</label>
                            <select
                              className="pin-select"
                              value={currentPinVal}
                              onChange={(e) => handlePinChange(item.id, pinName, e.target.value)}
                            >
                              {ARDUINO_PINS.map(p => (
                                <option key={p.val} value={p.val}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ARDUINO KOD (.INO) */}
          {activeTab === 'code' && (
            <div className="tab-content">
              <div className="code-toolbar">
                <span>Generatsiya qilingan Arduino C++ skripti</span>
                <div className="code-actions">
                  <button className="btn btn-sm btn-secondary" onClick={handleCopyCode}>
                    {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                    {copied ? t('arduino.copied') : t('arduino.copyCode')}
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={handleDownloadIno}>
                    <Download size={14} />
                    {t('arduino.downloadIno')}
                  </button>
                </div>
              </div>
              <pre className="code-editor-block">
                <code>{code}</code>
              </pre>
            </div>
          )}

          {/* TAB 3: SIMLASH SXEMASI */}
          {activeTab === 'wiring' && (
            <div className="tab-content">
              <p className="section-desc">
                {t('arduino.wiringGuide')}
              </p>
              <div className="table-responsive">
                <table className="bom-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('bom.colPart')}</th>
                      <th>Detal Pini</th>
                      <th>Arduino Uno Pini</th>
                      <th>Quvvat / Eslatma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wiringGuide.map((row, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td className="font-semibold">{row.component}</td>
                        <td><span className="part-badge">{row.componentPin}</span></td>
                        <td><span className="category-badge bg-blue">{row.arduinoPin}</span></td>
                        <td><span className="power-note">{row.powerNote}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
