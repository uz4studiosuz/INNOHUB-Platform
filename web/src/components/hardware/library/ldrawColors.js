/**
 * Standart LDraw rang kodlari va Hex ko'rinishlari
 */

export const LDRAW_COLORS = [
  { code: 71, name: 'Light Gray', hex: '#A0A5A9' },
  { code: 0,  name: 'Black',      hex: '#1B2A34' },
  { code: 4,  name: 'Red',        hex: '#C91A09' },
  { code: 1,  name: 'Blue',       hex: '#0055BF' },
  { code: 14, name: 'Yellow',     hex: '#F2CD37' },
  { code: 15, name: 'White',      hex: '#FFFFFF' },
  { code: 2,  name: 'Green',      hex: '#4B9F4A' },
  { code: 72, name: 'Dark Gray',  hex: '#6C6E68' },
  { code: 28, name: 'Dark Tan',   hex: '#958A73' },
  { code: 320, name: 'Dark Red',  hex: '#720E0F' },
  { code: 19, name: 'Tan',       hex: '#E4CD9E' },
  { code: 25, name: 'Orange',    hex: '#FE8A18' },
  { code: 22, name: 'Purple',    hex: '#81007B' },
  { code: 3,  name: 'Dark Turquoise', hex: '#008F9B' },
];

export function getLDrawColorHex(code) {
  const color = LDRAW_COLORS.find(c => c.code === Number(code));
  return color ? color.hex : '#A0A5A9';
}
