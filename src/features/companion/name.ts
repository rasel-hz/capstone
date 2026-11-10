// Zaho calls the user by their own first name, never a generic term of endearment.
// The name stays on the device: the model writes the placeholder {NAME} and the app fills it in here.

export const NAME_TOKEN = '{NAME}';
// The old generic address ("ya ba'di"), written with escapes because source files hold no Arabic text.
const OLD_ADDRESS = /\u064a\u0627 \u0628\u0639\u062f\u064a/g;
const COMMA = '[\u060c,]';

/** i18n options for texts that have a "named" variant: "ya <name>, ..." when a name is known, neutral otherwise. */
export const named = (name: string | null | undefined): { context?: 'named'; name?: string } => {
  const n = (name ?? '').trim();
  return n ? { context: 'named', name: n } : {};
};

/**
 * Puts the user's first name into a reply. With no name, the vocative and its comma are dropped, so the
 * sentence still reads naturally. Any old generic address the model still writes is replaced the same way.
 */
export function fillName(text: string, name: string | null | undefined): string {
  const n = (name ?? '').trim();
  let out = text.replace(OLD_ADDRESS, `\u064a\u0627 ${NAME_TOKEN}`);
  if (n) return out.split(NAME_TOKEN).join(n);
  // "<vocative> {NAME}, rest" becomes "rest"; a bare "{NAME}, rest" becomes "rest".
  out = out.replace(new RegExp(`(^|\\s)\\S+ \\{NAME\\}\\s*${COMMA}?\\s*`, 'g'), '$1');
  out = out.replace(new RegExp(`\\{NAME\\}\\s*${COMMA}?\\s*`, 'g'), '');
  return out.replace(/\s{2,}/g, ' ').trim();
}
