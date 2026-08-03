import { useEffect, useRef, useState } from 'react';
import { IconCpu as Cpu, IconDeviceFloppy as Save, IconFolderOpen as FolderOpen, IconTrash as Trash2, IconPackage as PackageCheck, IconRobot as Bot, IconDownload as Download, IconUpload as Upload, IconDatabase as HardDrive, IconBox as Box, IconPlayerPlay as Play, IconFolder, IconChevronDown } from '@tabler/icons-react';
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
  const { t } = useI18n();
  const jsonFileInputRef = useRef(null);
  const ldrFileInputRef = useRef(null);

  // Fayl amallari (saqlash, yuklash, import/eksport, tozalash) bitta menyuga
  // yig'ildi. Avval ular sarlavha qatorida oltita alohida tugma bo'lib turardi
  // va asosiy ish — rejim tanlash hamda BOM/Arduino — ular orasida yo'qolib
  // ketardi; tor ekranda esa yozuvlar butunlay yashirinib, faqat ikonkalar
  // qolardi va qaysi biri nima qilishini bilib bo'lmasdi.
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef(null);

  useEffect(() => {
    if (!fileMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (!fileMenuRef.current?.contains(event.target)) setFileMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setFileMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [fileMenuOpen]);

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
            {/* The platform calls this section 3D Konstruktor; the module used
                to call itself something else on its own header. */}
            <h1>{t('nav.hardware')}</h1>
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
        {/* The language switcher moved to the platform top bar. Two of them on
            one screen was one too many, and this one only ever changed the
            language of this module. */}

        {/* Fayl menyusi — saqlash, yuklash, import/eksport, tozalash */}
        <div className="header-menu" ref={fileMenuRef}>
          <button
            className={`header-btn${fileMenuOpen ? ' is-open' : ''}`}
            onClick={() => setFileMenuOpen((open) => !open)}
            aria-expanded={fileMenuOpen}
            aria-haspopup="menu"
            title="Loyiha fayllari va kutubxona"
          >
            <IconFolder size={16} />
            <span>Loyiha</span>
            <IconChevronDown size={14} style={{ opacity: 0.6 }} />
          </button>

          {fileMenuOpen && (
            <div className="header-menu-panel" role="menu">
              <button role="menuitem" onClick={() => { setFileMenuOpen(false); handleSave(); }}>
                <Save size={15} />
                <span>{t('header.save')}</span>
                <small>JSON</small>
              </button>
              <button role="menuitem" onClick={() => { setFileMenuOpen(false); jsonFileInputRef.current?.click(); }}>
                <FolderOpen size={15} />
                <span>{t('header.load')}</span>
                <small>JSON</small>
              </button>

              <div className="header-menu-sep" />

              <button role="menuitem" onClick={() => { setFileMenuOpen(false); onExportLdr(); }}>
                <Download size={15} />
                <span>{t('header.exportLdr')}</span>
                <small>.ldr</small>
              </button>
              <button role="menuitem" onClick={() => { setFileMenuOpen(false); ldrFileInputRef.current?.click(); }}>
                <Upload size={15} />
                <span>{t('header.importLdr')}</span>
                <small>.ldr</small>
              </button>
              <button role="menuitem" onClick={() => { setFileMenuOpen(false); onOpenLDrawSourceModal(); }}>
                <HardDrive size={15} />
                <span>{t('header.ldrawLib')}</span>
              </button>

              <div className="header-menu-sep" />

              <button
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  setFileMenuOpen(false);
                  if (window.confirm(t('header.clearConfirm'))) onClearScene();
                }}
              >
                <Trash2 size={15} />
                <span>{t('header.clear')}</span>
              </button>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={ldrFileInputRef}
          style={{ display: 'none' }}
          accept=".ldr,.mpd,.dat"
          onChange={handleLdrFileChange}
        />
        <input
          type="file"
          ref={jsonFileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={handleJsonFileChange}
        />

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
