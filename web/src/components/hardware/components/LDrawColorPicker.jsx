import { LDRAW_COLORS } from '../library/ldrawColors';
import { IconPalette as Palette } from '@tabler/icons-react';

export default function LDrawColorPicker({ currentColorCode, onChangeColor }) {
  return (
    <div className="ldraw-color-picker">
      <div className="color-picker-header">
        <Palette size={14} />
        <span>LDraw Rang Kodlari:</span>
      </div>
      <div className="color-swatch-grid">
        {LDRAW_COLORS.map((c) => (
          <button
            key={c.code}
            className={`color-btn ${currentColorCode === c.code ? 'active' : ''}`}
            style={{ backgroundColor: c.hex }}
            onClick={() => onChangeColor(c.code)}
            title={`${c.name} (#${c.code})`}
          />
        ))}
      </div>
    </div>
  );
}
