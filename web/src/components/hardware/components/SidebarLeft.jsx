import { Eye, EyeOff, Trash2, Box, Cpu, CircleDot, Sliders } from 'lucide-react';
import { getCatalogEntry, getPartName } from '../data/catalog';
import LDrawColorPicker from './LDrawColorPicker';
import { useI18n } from '../i18n/index.jsx';

export default function SidebarLeft({
  objects,
  selectedId,
  onSelect,
  onRemove,
  onToggleVisibility,
  onUpdateParams,
  onChangeColorCode,
}) {
  const { t, lang } = useI18n();

  const getIcon = (type) => {
    switch (type) {
      case 'motor':
      case 'servo':
      case 'stepper':
      case 'lego_spike_motor':
      case 'lego_wedo_motor':
        return <Cpu size={16} />;
      case 'wheel':
      case 'gear':
      case 'lego_gear':
        return <CircleDot size={16} />;
      default:
        return <Box size={16} />;
    }
  };

  const selectedObj = objects.find(o => o.id === selectedId);
  const catalogEntry = selectedObj ? getCatalogEntry(selectedObj.type) : null;
  const paramSchema = catalogEntry?.paramSchema;
  const displayName = (obj) => {
    const entry = getCatalogEntry(obj.type);
    return entry ? getPartName(entry, lang) : obj.name;
  };

  return (
    <div className="glass-panel" style={{ width: '280px', display: 'flex', flexDirection: 'column', height: '100%', zIndex: 10 }}>
      {/* Sahnadagi qurilmalar ro'yxati */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--panel-border)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{t('scene.objectsTitle')}</h2>
        <p style={{ margin: '5px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {t('scene.totalObjects')} {objects.length}
        </p>
      </div>

      <div style={{ padding: '12px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {objects.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px', fontSize: '0.9rem' }}>
            {t('scene.empty')}
          </div>
        ) : (
          objects.map(obj => (
            <div
              key={obj.id}
              className={`scene-item ${selectedId === obj.id ? 'active' : ''}`}
              onClick={() => onSelect(obj.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>
                  {getIcon(obj.type)}
                </span>
                <span style={{ fontSize: '0.9rem' }}>{displayName(obj)}</span>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="btn-icon"
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj.id); }}
                  title={obj.visible ? "Yashirish" : "Ko'rsatish"}
                >
                  {obj.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  className="btn-icon"
                  onClick={(e) => { e.stopPropagation(); onRemove(obj.id); }}
                  title={t('scene.delete')}
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tanlangan detal parametri va O'lchamini o'zgartirish paneli (Inspector) */}
      {selectedObj && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sliders size={16} style={{ color: 'var(--primary-color)' }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {displayName(selectedObj)}
            </h3>
          </div>

          {catalogEntry?.massG && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {t('scene.mass')} <span style={{ color: '#34d399', fontWeight: 'bold' }}>{catalogEntry.massG} {t('scene.gram')}</span>
            </div>
          )}

          {selectedObj.isLDraw && (
            <div style={{ marginBottom: '12px' }}>
              <LDrawColorPicker
                currentColorCode={selectedObj.colorCode || 71}
                onChangeColor={(code) => onChangeColorCode && onChangeColorCode(selectedObj.id, code)}
              />
            </div>
          )}

          {paramSchema ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                {paramSchema.label}
              </label>

              {paramSchema.type === 'select' && (
                <select
                  value={selectedObj.params?.[paramSchema.key] ?? catalogEntry?.defaultParams?.[paramSchema.key]}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    const val = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
                    onUpdateParams(selectedObj.id, { [paramSchema.key]: val });
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid var(--panel-border)',
                    outline: 'none',
                    fontSize: '0.85rem',
                  }}
                >
                  {paramSchema.options.map(opt => (
                    <option key={opt} value={opt}>
                      {typeof opt === 'string' ? opt.toUpperCase() : opt} {paramSchema.key === 'holes' ? 'teshikli' : paramSchema.key === 'teeth' ? 'tishli' : paramSchema.key === 'lengthStuds' ? 'stud (L)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Part #: <span style={{ color: '#38bdf8' }}>{selectedObj.partNum || catalogEntry?.partNum || 'Standart'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

