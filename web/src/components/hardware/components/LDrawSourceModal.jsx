import { useState, useRef } from 'react';
import { IconFolder as Folder, IconWorld as Globe, IconX as X, IconCheck as Check, IconDatabase as HardDrive, IconAlertTriangle as AlertTriangle } from '@tabler/icons-react';
import { setLocalLDrawFolder, setCdnFallbackUrl, getLDrawLibraryStatus } from '../library/ldrawLibrary';
import { useI18n } from '../i18n/index.jsx';

export default function LDrawSourceModal({ isOpen, onClose }) {
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(getLDrawLibraryStatus());
  const [cdnInput, setCdnInput] = useState(status.cdnUrl);
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  // Local folder tanlanganda
  const handleFolderSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const count = setLocalLDrawFolder(files);
    const newStatus = getLDrawLibraryStatus();
    setStatus(newStatus);
    setMessage({
      type: 'success',
      text: `Mahalliy LDraw kutubxonasidan ${count} ta fayl muvaffaqiyatli yuklandi!`,
    });
  };

  // CDN manzili saqlanganda
  const handleSaveCdn = () => {
    setCdnFallbackUrl(cdnInput);
    setStatus(getLDrawLibraryStatus());
    setMessage({
      type: 'info',
      text: 'CDN fallback manbasi saqlandi.',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container ldraw-source-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <HardDrive className="modal-icon text-blue" />
            <div>
              <h2>{t('ldraw.title')}</h2>
              <p className="modal-subtitle">
                {t('ldraw.subtitle')}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {message && (
            <div className={`alert-box ${message.type === 'success' ? 'alert-success' : 'alert-info'}`}>
              <Check size={16} />
              <span>{message.text}</span>
            </div>
          )}

          {/* MANBA 1: MAHALLIY PAPKA (PRIMARY) */}
          <div className="source-option-card active-card">
            <div className="option-header">
              <Folder className="option-icon text-green" />
              <div>
                <h3>1. {t('ldraw.localFolder')}</h3>
                <p>
                  library.ldraw.org rasmiy saytidan yuklangan va ochilgan <code>ldraw</code> papkasini tanlang (`parts/`, `p/`, `LDConfig.ldr`).
                </p>
              </div>
            </div>

            <div className="option-body">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                webkitdirectory="true"
                directory="true"
                onChange={handleFolderSelect}
              />

              <div className="action-row">
                <button
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Folder size={16} />
                  {t('ldraw.selectFolder')}
                </button>

                <span className="status-badge">
                   {status.isLocal
                     ? <><Check size={14} /> Boshqarilmoqda ({status.fileCount} ta fayl)</>
                     : status.cdnUrl === '/ldraw/'
                       ? <><Check size={14} /> O&apos;rnatilgan lokal kutubxona faol</>
                       : <><X size={14} /> Mahalliy papka biriktirilmagan</>}
                 </span>
              </div>
            </div>
          </div>

          {/* MANBA 2: CDN FALLBACK */}
          <div className="source-option-card">
            <div className="option-header">
              <Globe className="option-icon text-blue" />
              <div>
                <h3>2. {t('ldraw.cdnOnline')}</h3>
                <p>
                  Mahalliy fayllar yetishmasa, LDraw `.dat` fayllarini tarmoq orqali yuklash:
                </p>
              </div>
            </div>

            <div className="option-body">
              <div className="alert-box alert-warning" style={{ margin: '0 0 10px 0', fontSize: '11px', padding: '8px 12px' }}>
                <span className="flex items-start gap-2"><AlertTriangle size={15} className="shrink-0" /> CDN orqali yuklash har bir primitivni alohida HTTP so&apos;rov bilan yuklaydi. Sekin bo&apos;lishi va rate-limit yuzaga kelishi mumkin. Mahalliy papkadan foydalanish tavsiya etiladi.</span>
              </div>
              <div className="cdn-input-group">
                <input
                  type="text"
                  className="cdn-input"
                  value={cdnInput}
                  onChange={(e) => setCdnInput(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/gregveres/LDraw-Parts-Library/master/"
                />
                <button className="btn btn-secondary" onClick={handleSaveCdn}>
                  {t('common.apply')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            {t('ldraw.saveClose')}
          </button>
        </div>
      </div>
    </div>
  );
}
