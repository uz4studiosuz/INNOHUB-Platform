import { useRef } from 'react';
import { Cpu, Save, FolderOpen, Trash2, PackageCheck, Bot, Download, Upload, HardDrive, Box, Play, Globe } from 'lucide-react';
import { exportProjectToJson, importProjectFromJson } from '../utils/projectStorage';
import { importFromLdr } from '../utils/ldrConverter';
import { useI18n } from '../i18n/index.jsx';

export default function Header({
  sceneObjects,
  pinMappings,
  activeMode = 'free_build',
  onSelectMode,
  onLoadProject,
  onClearScene,
  onOpenBomModal,
  onOpenArduinoModal,
  onExportLdr,
  onImportLdrObjects,
  onOpenLDrawSourceModal,
}) {
  const { t, lang, setLang } = useI18n();
  const jsonFileInputRef = useRef(null);
  const ldrFileInputRef = useRef(null);

  // Saqlash
  const handleSave = () => {
    exportProjectToJson(sceneObjects, pinMappings, 'robot_konstruksiya');
  };

  // JSON Yuklash
  const handleJsonFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importProjectFromJson(file);
      onLoadProject(data);
    } catch (err) {
      alert(`Loyiha faylini yuklashda xatolik: ${err.message}`);
    } finally {
      if (jsonFileInputRef.current) {
        jsonFileInputRef.current.value = '';
      }
    }
  };

  // .ldr Fayl Import
  const handleLdrFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const ldrText = event.target.result;
        const importedObjs = importFromLdr(ldrText);
        if (importedObjs.length > 0) {
          onImportLdrObjects(importedObjs);
        } else {
          alert("LDR faylidan hech qanday detal o'qib bo'lmadi.");
        }
      } catch (err) {
        alert(`LDR faylini o'qishda xatolik: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (ldrFileInputRef.current) ldrFileInputRef.current.value = '';
  };

  const electronicCount = sceneObjects.filter(o => 
    o.type.includes('motor') || o.type.includes('l298n') || o.type.includes('servo') || o.type.includes('stepper')
  ).length;

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-badge">
          <Bot className="logo-icon" />
          <div className="logo-text">
            <h1>Hardware Konstruktsiya</h1>
            <span className="logo-tagline">3D Robot Constructor & Simulator</span>
          </div>
        </div>

        {/* Rejimlar Tablari (Mode Navigation) */}
        <div className="header-mode-tabs">
          <button
            className={`mode-tab-btn ${activeMode === 'free_build' ? 'active' : ''}`}
            onClick={() => onSelectMode && onSelectMode('free_build')}
            title={t('header.freeBuildTitle')}
          >
            <Box size={16} />
            <span>{t('header.freeBuild')}</span>
          </button>
          <button
            className={`mode-tab-btn ${activeMode === 'kit_assembly' ? 'active' : ''}`}
            onClick={() => onSelectMode && onSelectMode('kit_assembly')}
            title={t('header.kitAssemblyTitle')}
          >
            <PackageCheck size={16} />
            <span>{t('header.kitAssembly')}</span>
          </button>
          <button
            className={`mode-tab-btn ${activeMode === 'simulation' ? 'active' : ''}`}
            onClick={() => onSelectMode && onSelectMode('simulation')}
            title={t('header.codeSimTitle')}
          >
            <Play size={16} />
            <span>{t('header.codeSim')}</span>
          </button>
        </div>
      </div>

      <div className="header-actions">
        {/* Tilni almashtirgich (Language Switcher) */}
        <div className="lang-switcher">
          <Globe size={14} className="text-blue" />
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="uz">UZ</option>
            <option value="ru">RU</option>
            <option value="en">EN</option>
          </select>
        </div>

        <div className="divider-vertical" />

        {/* LDraw Source Config */}
        <button className="header-btn" onClick={onOpenLDrawSourceModal} title={t('header.ldrawLibTitle')}>
          <HardDrive size={16} className="text-blue" />
          <span>{t('header.ldrawLib')}</span>
        </button>

        <div className="divider-vertical" />

        {/* LDR Export / Import */}
        <button className="header-btn primary" onClick={onExportLdr} title={t('header.exportLdrTitle')}>
          <Download size={16} />
          <span>{t('header.exportLdr')}</span>
        </button>

        <button className="header-btn" onClick={() => ldrFileInputRef.current?.click()} title={t('header.importLdrTitle')}>
          <Upload size={16} />
          <span>{t('header.importLdr')}</span>
        </button>

        <input
          type="file"
          ref={ldrFileInputRef}
          style={{ display: 'none' }}
          accept=".ldr,.mpd,.dat"
          onChange={handleLdrFileChange}
        />

        <div className="divider-vertical" />

        {/* JSON Saqlash / Yuklash */}
        <button className="header-btn" onClick={handleSave} title={t('header.saveTitle')}>
          <Save size={16} />
          <span>{t('header.save')}</span>
        </button>

        <button className="header-btn" onClick={() => jsonFileInputRef.current?.click()} title={t('header.loadTitle')}>
          <FolderOpen size={16} />
          <span>{t('header.load')}</span>
        </button>

        <input
          type="file"
          ref={jsonFileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={handleJsonFileChange}
        />

        <button
          className="header-btn danger"
          onClick={() => {
            if (window.confirm(t('header.clearConfirm'))) {
              onClearScene();
            }
          }}
          title={t('header.clearTitle')}
        >
          <Trash2 size={16} />
          <span>{t('header.clear')}</span>
        </button>

        <div className="divider-vertical" />

        {/* Modal Modullari */}
        <button className="header-btn primary" onClick={onOpenBomModal} title={t('header.bomTableTitle')}>
          <PackageCheck size={16} />
          <span>{t('header.bomTable')}</span>
          <span className="count-pill">{sceneObjects.length}</span>
        </button>

        <button className="header-btn success" onClick={onOpenArduinoModal} title={t('header.arduinoCodeTitle')}>
          <Cpu size={16} />
          <span>{t('header.arduinoCode')}</span>
          {electronicCount > 0 && <span className="count-pill badge-green">{electronicCount}</span>}
        </button>
      </div>
    </header>
  );
}


