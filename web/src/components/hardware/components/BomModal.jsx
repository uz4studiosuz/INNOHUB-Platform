import { useMemo } from 'react';
import { X, Download, FileSpreadsheet, PackageCheck, Scale } from 'lucide-react';
import { getCatalogEntry, getPartName } from '../data/catalog';
import { useI18n } from '../i18n/index.jsx';

export default function BomModal({ isOpen, onClose, objects }) {
  const { t, lang } = useI18n();

  // Obyektlarni guruhlash va sonini hisoblash
  const bomItems = useMemo(() => {
    if (!objects || objects.length === 0) return [];

    const map = new Map();

    objects.forEach(obj => {
      const entry = getCatalogEntry(obj.type);
      const key = obj.partNum || obj.legoId || obj.type;
      const name = entry ? getPartName(entry, lang) : (obj.name || 'Noma\'lum detal');
      const massG = entry?.massG || 0;

      if (map.has(key)) {
        const item = map.get(key);
        item.count += 1;
      } else {
        map.set(key, {
          key,
          name,
          partNum: obj.partNum || entry?.partNum || 'N/A',
          category: obj.isLego ? 'LEGO Technic' : (entry?.category || 'Mexanika'),
          type: obj.type,
          count: 1,
          massG,
          color: obj.colorHex || entry?.material?.color || '#3b82f6',
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [objects, lang]);

  const totalParts = useMemo(() => {
    return bomItems.reduce((sum, item) => sum + item.count, 0);
  }, [bomItems]);

  const totalMassG = useMemo(() => {
    return bomItems.reduce((sum, item) => sum + (item.massG * item.count), 0);
  }, [bomItems]);

  if (!isOpen) return null;

  // CSV formatida eksport qilish
  const handleExportCSV = () => {
    let csv = `${t('bom.colNum')},${t('bom.colPart')},Part #,${t('bom.colCategory')},${t('bom.colCount')},${t('bom.colMass')},${t('bom.colTotalMass')}\n`;
    bomItems.forEach((item, idx) => {
      csv += `"${idx + 1}","${item.name}","${item.partNum}","${item.category}","${item.count}","${item.massG ? item.massG + 'g' : '-'}","${item.massG ? (item.massG * item.count) + 'g' : '-'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `robot_bom_list_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON formatida eksport qilish
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify({ totalParts, totalMassG, items: bomItems }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `robot_bom_list_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container bom-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Sarlavhasi */}
        <div className="modal-header">
          <div className="modal-title-group">
            <PackageCheck className="modal-icon text-blue" />
            <div>
              <h2>{t('bom.title')}</h2>
              <p className="modal-subtitle">
                {t('bom.totalTypes')} {bomItems.length} | {t('bom.totalCount')} {totalParts}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title={t('bom.close')}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Kontenti */}
        <div className="modal-body">
          <div className="bom-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div className="stat-card">
              <span className="stat-label">{t('bom.totalCount')}</span>
              <span className="stat-value">{totalParts}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('bom.totalTypes')}</span>
              <span className="stat-value">{bomItems.length}</span>
            </div>
            <div className="stat-card" style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
              <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
                <Scale size={14} /> {t('bom.totalMass')}
              </span>
              <span className="stat-value" style={{ color: '#34d399' }}>
                {totalMassG > 0 ? `${totalMassG} ${t('scene.gram')}` : '-'}
              </span>
            </div>
          </div>

          {bomItems.length === 0 ? (
            <div className="empty-state">
              <p>{t('bom.empty')}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="bom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>{t('bom.colNum')}</th>
                    <th>Rang</th>
                    <th>{t('bom.colPart')}</th>
                    <th>Part #</th>
                    <th>{t('bom.colCategory')}</th>
                    <th style={{ textAlign: 'center', width: '70px' }}>{t('bom.colCount')}</th>
                    <th style={{ textAlign: 'right', width: '90px' }}>{t('bom.colMass')}</th>
                    <th style={{ textAlign: 'right', width: '100px' }}>{t('bom.colTotalMass')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bomItems.map((item, index) => (
                    <tr key={item.key}>
                      <td>{index + 1}</td>
                      <td>
                        <span
                          className="color-swatch"
                          style={{ backgroundColor: item.color }}
                          title={item.color}
                        />
                      </td>
                      <td className="font-semibold">{item.name}</td>
                      <td>
                        <span className="part-badge">{item.partNum}</span>
                      </td>
                      <td>
                        <span className="category-badge">{item.category}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {item.count}
                      </td>
                      <td style={{ textAlign: 'right', color: '#94a3b8' }}>
                        {item.massG ? `${item.massG} g` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#34d399' }}>
                        {item.massG ? `${item.massG * item.count} g` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer / Harakatlar */}
        <div className="modal-footer">
          <div className="export-actions">
            <button
              className="btn btn-secondary"
              onClick={handleExportCSV}
              disabled={bomItems.length === 0}
            >
              <FileSpreadsheet size={16} />
              {t('bom.exportCsv')}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportJSON}
              disabled={bomItems.length === 0}
            >
              <Download size={16} />
              JSON Eksport
            </button>
          </div>
          <button className="btn btn-primary" onClick={onClose}>
            {t('bom.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

