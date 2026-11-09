import { iso } from '../../i18n/index.ts';

// The AI never receives the user's name. When it wants to address them, it writes the {name} token and the
// app fills it in here, on the device. With no name saved, the "ya {name}," address is dropped cleanly.
const YA = String.fromCharCode(0x64a, 0x627);
const COMMA = String.fromCharCode(0x60c);
const TOKEN = /\{name\}/g;
const ADDRESS = new RegExp(`${YA}\\s*\\{name\\}\\s*[${COMMA},]?\\s*`, 'g');
const BARE = new RegExp(`\\s*\\{name\\}\\s*[${COMMA},]?`, 'g');

export function fillName(text: string, name: string): string {
  if (!text.includes('{name}')) return text;
  const n = name.trim();
  if (n) return text.replace(TOKEN, iso(n));
  return text.replace(ADDRESS, '').replace(BARE, '').replace(/\s{2,}/g, ' ').trim();
}
