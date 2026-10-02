export const textWeight = (layer, advanced) => {
  const requested = Number(advanced ? layer.text.weight : layer.role === 'headline' ? 700 : layer.role === 'kicker' ? 600 : 400);
  return requested >= 700 ? 700 : requested >= 600 ? 600 : 400;
};
const pending = new Map();
export const loadDegular = async (weight = 400, italic = false) => {
  const style = italic ? 'italic' : 'normal';
  const key = `${weight}:${style}`;
  const matches = face => face.family.replace(/['"]/g, '').toLowerCase() === 'degular' && face.style === style && face.status === 'loaded' && (() => { const [min, max = min] = face.weight.split(' ').map(Number); return weight >= min && weight <= max; })();
  if ([...document.fonts].some(matches)) return true;
  if (!pending.has(key)) pending.set(key, (async () => {
    try { await document.fonts.load(`${style} ${weight} 32px "degular"`, 'ÄÖÜß DigiLab'); } catch { /* Try an installed font below. */ }
    if ([...document.fonts].some(matches)) return true;
    const name = weight === 700 ? 'Bold' : weight === 600 ? 'Semibold' : 'Regular';
    const suffix = italic ? ' Italic' : '';
    const face = new FontFace('Degular', `local("Degular ${name}${suffix}"), local("Degular-${name}${italic ? 'Italic' : ''}")`, {weight:String(weight), style});
    try { await face.load(); document.fonts.add(face); return true; } catch { return false; }
  })());
  const result = await pending.get(key);
  if (!result) pending.delete(key);
  return result;
};

export const fontWeight = (bytes, name) => {
  try {
    const view = new DataView(bytes);
    const tag = offset => String.fromCharCode(...new Uint8Array(bytes, offset, 4));
    const count = view.getUint16(4);
    if (tag(0) === 'OTTO' || view.getUint32(0) === 0x00010000) {
      let weight = '400';
      for (let index = 0; index < count; index++) {
        const table = 12 + index * 16;
        const offset = view.getUint32(table + 8);
        if (tag(table) === 'OS/2') weight = String(view.getUint16(offset + 4));
        if (tag(table) === 'fvar') {
          const axes = offset + view.getUint16(offset + 4);
          const axisCount = view.getUint16(offset + 8);
          const axisSize = view.getUint16(offset + 10);
          for (let axis = 0; axis < axisCount; axis++) {
            const record = axes + axis * axisSize;
            if (tag(record) === 'wght') return `${view.getInt32(record + 4) / 65536} ${view.getInt32(record + 12) / 65536}`;
          }
        }
      }
      return weight;
    }
  } catch { /* Compressed web fonts use their filename below. */ }
  const token = name.toLowerCase();
  if (/semibold|semi-bold/.test(token)) return '600';
  if (/black|heavy|extrabold/.test(token)) return '800';
  if (/bold/.test(token)) return '700';
  if (/medium/.test(token)) return '500';
  if (/light/.test(token)) return '300';
  return '400';
};
