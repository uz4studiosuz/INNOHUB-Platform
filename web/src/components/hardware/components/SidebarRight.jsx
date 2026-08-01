import { useState, useMemo, useEffect } from 'react';
import { Plus, Cpu, Cog, Box, Search, Layers } from 'lucide-react';
import { CATALOG, CATEGORIES, getPartName, getPartSpecs } from '../data/catalog';
import PartThumbnail from './PartThumbnail';
import { useI18n } from '../i18n/index.jsx';

import { preloadThumbnails } from '../utils/partThumbnails';

// Ro'yxatda bir vaqtda ko'rsatiladigan maksimal detal soni. Katalog 1300+
// detaldan iborat; hammasini birdan chizish sidebar'ni sezilarli sekinlashtiradi.
const LIST_LIMIT = 150;

function getGroupTitle(groupObj, lang) {
  if (!groupObj) return '';
  if (typeof groupObj === 'object') {
    return groupObj[lang] || groupObj.uz || groupObj.en || '';
  }
  return String(groupObj);
}

export default function SidebarRight({ onAdd, onAddLego, onAddLDrawPart }) {
  const { t, lang } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState('ldraw_all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ldrawCatalog, setLdrawCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState(null);

  // JSON katalogni yuklash (scripts/build-parts-catalog.mjs yasaydi)
  useEffect(() => {
    fetch('/parts-catalog.json')
      .then(res => res.json())
      .then(data => {
        setLdrawCatalog(data);
        // Preload recommended starred parts and electronics in background idle callback (§4)
        const starredItems = [];
        data.forEach(g => {
          g.items.forEach(i => {
            if (i.starred || i.isCatalogType) {
              starredItems.push({
                isLDraw: !i.isCatalogType,
                partNum: i.num,
                type: i.type,
                file: i.file,
                name: i.uz || i.en,
              });
            }
          });
        });
        preloadThumbnails(starredItems);
      })
      .catch(err => {
        console.warn("parts-catalog.json yuklanmadi:", err);
        setCatalogError(err.message || 'yuklanmadi');
      });
  }, []);

  const getCategoryIcon = (iconName) => {
    switch (iconName) {
      case 'Cpu': return <Cpu size={14} />;
      case 'Cog': return <Cog size={14} />;
      case 'Box': return <Box size={14} />;
      default: return null;
    }
  };

  // Katalogni saralash va qidirish
  const { items: displayItems, total } = useMemo(() => {
    let items = [];

    if (selectedCategory.startsWith('ldraw_')) {
      const groupKey = selectedCategory.replace('ldraw_', '');

      ldrawCatalog.forEach(group => {
        const titleStr = getGroupTitle(group.group, lang);

        if (groupKey === 'all' || titleStr === groupKey || String(group.group) === groupKey) {
          group.items.forEach(item => {
            const partName = item.uz === item.en ? item.uz : `${item.uz} (${item.en})`;
            items.push({
              isLDraw: true,
              partNum: item.num,
              name: partName,
              description: item.specs || (item.isCatalogType ? '3D model' : `LDraw Part #${item.num}`),
              group: titleStr,
              starred: item.starred,
              rawItem: item,
            });
          });
        }
      });
    } else if (selectedCategory === 'all') {
      items = CATALOG.map(c => ({
        ...c,
        name: getPartName(c, lang),
        description: getPartSpecs(c, lang),
      }));
    } else {
      items = CATALOG.filter(item => item.category === selectedCategory).map(c => ({
        ...c,
        name: getPartName(c, lang),
        description: getPartSpecs(c, lang),
      }));
    }

    // Qidiruv filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.partNum && item.partNum.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    return { items: items.slice(0, LIST_LIMIT), total: items.length };
  }, [selectedCategory, searchQuery, ldrawCatalog, lang]);

  const ldrawTotal = useMemo(
    () => ldrawCatalog.reduce((sum, g) => sum + g.items.length, 0),
    [ldrawCatalog],
  );

  return (
    <div className="glass-panel" style={{ width: '330px', display: 'flex', flexDirection: 'column', height: '100%', zIndex: 10 }}>
      {/* Sarlavha */}
      <div style={{ padding: '16px 20px 12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>{t('catalog.title')}</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {catalogError
            ? t('catalog.notLoaded', { error: catalogError })
            : ldrawTotal
              ? t('catalog.summary', { total: ldrawTotal })
              : t('catalog.loading')}
        </p>

        {/* Qidiruv Inpiti */}
        <div style={{ position: 'relative', marginTop: '10px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder={t('catalog.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              borderRadius: '6px',
              background: '#1e293b',
              border: '1px solid var(--panel-border)',
              color: '#fff',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Categories Tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '10px 16px 0 16px', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto' }}>
        <div style={{ width: '100%', fontSize: '10px', color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
          {t('catalog.elecAndRealLego')}{ldrawTotal ? ` (${ldrawTotal})` : ''}
        </div>
        <button
          className="btn-icon"
          onClick={() => setSelectedCategory('ldraw_all')}
          style={{
            padding: '4px 8px',
            fontSize: '0.72rem',
            background: selectedCategory === 'ldraw_all' ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
            color: selectedCategory === 'ldraw_all' ? '#fff' : 'var(--text-secondary)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Layers size={12} />
          {t('catalog.all')}{ldrawTotal ? ` (${ldrawTotal})` : ''}
        </button>

        {ldrawCatalog.map(cat => {
          const title = getGroupTitle(cat.group, lang);
          const catKey = `ldraw_${title}`;

          return (
            <button
              key={title}
              className="btn-icon"
              onClick={() => setSelectedCategory(catKey)}
              style={{
                padding: '4px 8px',
                fontSize: '0.72rem',
                background: selectedCategory === catKey ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedCategory === catKey ? '#fff' : 'var(--text-secondary)',
                borderRadius: '6px',
              }}
            >
              {title} ({cat.items.length})
            </button>
          );
        })}

        <div style={{ width: '100%', fontSize: '10px', color: '#34d399', fontWeight: 'bold', textTransform: 'uppercase', margin: '6px 0 2px 0' }}>
          {t('catalog.proceduralTitle')}
        </div>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className="btn-icon"
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: '4px 8px',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: selectedCategory === cat.id ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
              color: selectedCategory === cat.id ? '#fff' : 'var(--text-secondary)',
              borderRadius: '6px',
            }}
          >
            {getCategoryIcon(cat.icon)}
            {cat.name}
          </button>
        ))}
      </div>

      {/* Detallar Ro'yxati */}
      <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayItems.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px', fontSize: '0.85rem' }}>
            {t('catalog.noResults')}
          </div>
        ) : (
          displayItems.map((item, idx) => (
            <div
              key={item.id || item.partNum || idx}
              className="item-card"
              onClick={() => {
                if (item.rawItem?.isCatalogType) {
                  onAdd(item.partNum);
                } else if (item.isLDraw && onAddLDrawPart) {
                  onAddLDrawPart(item.partNum, item.name);
                } else if (item.isLegoPart && onAddLego) {
                  onAddLego(item.part);
                } else {
                  onAdd(item.type || item.partNum);
                }
              }}
              style={{ cursor: 'pointer', padding: '10px 12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PartThumbnail item={item} name={item.name} group={item.group} colorHex={item.colorHex || item.material?.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {item.starred && <span title={t('catalog.recommended')} style={{ marginRight: '4px' }}>⭐</span>}
                    {item.name}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {item.description || `Part #${item.partNum}`}
                  </p>
                </div>
                <button className="btn-icon" style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary-color)', flexShrink: 0, padding: '4px' }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))
        )}

        {total > displayItems.length && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '10px 0 4px 0', fontSize: '0.75rem', lineHeight: 1.5 }}>
            {t('catalog.shownCount', { total, shown: displayItems.length })}<br />
            {t('catalog.searchMoreHint')}
          </div>
        )}
      </div>
    </div>
  );
}


