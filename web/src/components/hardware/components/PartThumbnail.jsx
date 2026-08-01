import { useState, useEffect, useRef } from 'react';
import { getPartThumbnail } from '../utils/partThumbnails';

/**
 * Katalogdagi har bir detal nomi yonida ko'rsatiladigan 3D rasmcha.
 * IntersectionObserver orqali faqat ekranda ko'ringanda offscreen render'da
 * 3D rasm generatsiya qiladi va IndexedDB (hk_thumbs) da keshlaydi.
 * Rasm tayyor bo'lguncha SVG shakl zaxira (fallback) bo'lib turadi.
 */

const KIND_COLORS = {
  gear: '#38bdf8',
  beam: '#f59e0b',
  axle: '#94a3b8',
  pin: '#60a5fa',
  bush: '#a3a3a3',
  wheel: '#334155',
  tire: '#1f2937',
  motor: '#22c55e',
  servo: '#3b82f6',
  sensor: '#e2e8f0',
  connector: '#f472b6',
  panel: '#f59e0b',
  brick: '#ef4444',
};

// Detal turini nom/guruh bo'yicha aniqlash
export function detectKind(name = '', group = '') {
  const n = `${name} ${group}`.toLowerCase();
  const has = (...w) => w.some((x) => n.includes(x));
  if (has('gear', 'shester', 'tishli', 'bevel', 'worm', 'chervya', 'rack', 'reyka', 'differ', 'turntable', 'toj')) return 'gear';
  if (has('servo')) return 'servo';
  if (has('sensor')) return 'sensor';
  if (has('motor', 'l298', 'driver', 'drayver')) return 'motor';
  if (has('axle', "o'q", 'val') && !has('beam')) return 'axle';
  if (has('beam', 'balka', 'liftarm', "g'o'la")) return 'beam';
  if (has('frame', 'ramka', 'panel')) return 'panel';
  if (has('bush', 'vtulka')) return 'bush';
  if (has('pin', 'shtift', 'connector', 'konnektor')) return has('connector', 'konnektor') ? 'connector' : 'pin';
  if (has('tire', 'shina', 'tasma')) return 'tire';
  if (has('wheel', 'rim', "g'ildirak", 'caster')) return 'wheel';
  return 'brick';
}

const C = 20; // markaz (viewBox 40x40)

function gearTeeth(count, rIn, rOut, w, fill) {
  const rects = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const mid = (rIn + rOut) / 2;
    const x = C + Math.cos(a) * mid;
    const y = C + Math.sin(a) * mid;
    const deg = (a * 180) / Math.PI;
    rects.push(
      <rect key={i} x={x - w / 2} y={y - (rOut - rIn) / 2} width={w} height={rOut - rIn}
        transform={`rotate(${deg} ${x} ${y})`} fill={fill} />
    );
  }
  return rects;
}

export default function PartThumbnail({ item, name = '', group = '', colorHex, size = 36 }) {
  const [thumbUrl, setThumbUrl] = useState(null);
  const containerRef = useRef(null);

  const kind = detectKind(name, group);
  const fill = colorHex || KIND_COLORS[kind] || '#94a3b8';

  useEffect(() => {
    let isMounted = true;
    let observer = null;

    const targetItem = item || { name, group, colorHex };

    if (!containerRef.current || typeof IntersectionObserver === 'undefined') {
      getPartThumbnail(targetItem).then((url) => {
        if (isMounted && url) setThumbUrl(url);
      });
      return () => { isMounted = false; };
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          getPartThumbnail(targetItem).then((url) => {
            if (isMounted && url) setThumbUrl(url);
          });
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(containerRef.current);

    return () => {
      isMounted = false;
      if (observer) observer.disconnect();
    };
  }, [item, name, group, colorHex]);

  let shape;
  switch (kind) {
    case 'gear':
      shape = (
        <g>
          {gearTeeth(9, 10, 16, 5, fill)}
          <circle cx={C} cy={C} r="11" fill={fill} />
          <circle cx={C} cy={C} r="4" fill="#0f172a" />
        </g>
      );
      break;
    case 'beam':
      shape = (
        <g>
          <rect x="4" y="14" width="32" height="12" rx="6" fill={fill} />
          <circle cx="11" cy="20" r="2.4" fill="#0f172a" />
          <circle cx="20" cy="20" r="2.4" fill="#0f172a" />
          <circle cx="29" cy="20" r="2.4" fill="#0f172a" />
        </g>
      );
      break;
    case 'panel':
      shape = (
        <g>
          <path d="M5 26 Q5 12 20 12 L35 12 L35 26 Z" fill={fill} />
          <circle cx="27" cy="20" r="2.2" fill="#0f172a" />
        </g>
      );
      break;
    case 'axle':
      shape = (
        <g>
          <rect x="4" y="18" width="32" height="4" fill={fill} />
          <rect x="4" y="16" width="4" height="8" fill={fill} />
          <rect x="32" y="16" width="4" height="8" fill={fill} />
          <rect x="18" y="17" width="4" height="6" fill={fill} />
        </g>
      );
      break;
    case 'pin':
      shape = (
        <g>
          <rect x="6" y="16" width="28" height="8" rx="4" fill={fill} />
          <rect x="18" y="14" width="3" height="12" fill="#0f172a" opacity="0.35" />
        </g>
      );
      break;
    case 'connector':
      shape = (
        <g>
          <rect x="6" y="10" width="12" height="20" rx="3" fill={fill} />
          <rect x="22" y="14" width="12" height="12" rx="3" fill={fill} />
          <rect x="16" y="18" width="8" height="4" fill={fill} />
        </g>
      );
      break;
    case 'bush':
      shape = (
        <g>
          <rect x="12" y="12" width="16" height="16" rx="2" fill={fill} />
          <ellipse cx="20" cy="12" rx="8" ry="3" fill="#0f172a" opacity="0.3" />
        </g>
      );
      break;
    case 'wheel':
      shape = (
        <g>
          <circle cx={C} cy={C} r="15" fill="#1f2937" />
          <circle cx={C} cy={C} r="8" fill={fill} />
          <circle cx={C} cy={C} r="3" fill="#0f172a" />
        </g>
      );
      break;
    case 'tire':
      shape = (
        <g>
          <circle cx={C} cy={C} r="16" fill="#1f2937" />
          <circle cx={C} cy={C} r="8" fill="#0f172a" />
        </g>
      );
      break;
    case 'motor':
      shape = (
        <g>
          <rect x="6" y="12" width="22" height="16" rx="2" fill={fill} />
          <rect x="28" y="17" width="6" height="6" fill="#0f172a" />
          <circle cx="34" cy="20" r="2" fill="#94a3b8" />
        </g>
      );
      break;
    case 'servo':
      shape = (
        <g>
          <rect x="10" y="10" width="16" height="20" rx="2" fill={fill} />
          <rect x="6" y="16" width="24" height="4" fill={fill} />
          <circle cx="18" cy="12" r="3" fill="#e2e8f0" />
        </g>
      );
      break;
    case 'sensor':
      shape = (
        <g>
          <rect x="8" y="12" width="24" height="16" rx="2" fill={fill} />
          <circle cx="15" cy="20" r="3.5" fill="#0f172a" />
          <circle cx="25" cy="20" r="3.5" fill="#0f172a" />
        </g>
      );
      break;
    default:
      shape = (
        <g>
          <rect x="8" y="16" width="24" height="14" rx="1.5" fill={fill} />
          <ellipse cx="15" cy="15" rx="3" ry="2" fill={fill} />
          <ellipse cx="25" cy="15" rx="3" ry="2" fill={fill} />
        </g>
      );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={name || 'thumbnail'}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          style={{ flexShrink: 0 }}
          aria-label={kind}
        >
          {shape}
        </svg>
      )}
    </div>
  );
}
