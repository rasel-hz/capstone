import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export type Lang = 'ar-SA' | 'en';
export const LANGS: Lang[] = ['ar-SA', 'en'];
export const DEFAULT_LANG: Lang = 'ar-SA';

// Each locale folder holds one JSON file per area. The file name is the first part of the key:
// common.json + { "save": ... } is t('common.save'). Everything is bundled, so switching is instant.
const files = import.meta.glob('./locales/*/*.json', { eager: true, import: 'default' }) as Record<string, Record<string, unknown>>;
const resources: Record<string, { translation: Record<string, unknown> }> = {};
for (const [path, content] of Object.entries(files)) {
  const [, lang, area] = path.match(/locales\/([^/]+)\/([^/]+)\.json$/) as RegExpMatchArray;
  resources[lang] ??= { translation: {} };
  resources[lang].translation[area] = content;
}

// Read directly so the very first render is already in the saved language.
function savedLang(): Lang {
  try {
    const l = JSON.parse(localStorage.getItem('kw2') || 'null')?.lang;
    return LANGS.includes(l) ? l : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLang(),
  fallbackLng: DEFAULT_LANG,
  supportedLngs: LANGS,
  nsSeparator: false,
  initAsync: false,
  // React already escapes text, and user text is never rendered as HTML.
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export const currentLang = () => i18n.language as Lang;
export const isRtl = (l: Lang = currentLang()) => l === 'ar-SA';

export function applyDocument(l: Lang = currentLang()) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = l;
  document.documentElement.dir = isRtl(l) ? 'rtl' : 'ltr';
  document.title = i18n.t('common.pageTitle');
  document.querySelector('meta[name="description"]')?.setAttribute('content', i18n.t('common.pageDescription'));
}

// Only re-renders components. Nothing is remounted, so timers and game state carry on.
export function setLanguage(l: Lang) {
  void i18n.changeLanguage(l);
  applyDocument(l);
}

applyDocument();

export const tr = (key: string, options?: Record<string, unknown>) => i18n.t(key, options as never) as unknown as string;

// A message kept in state or passed between components. It is a key or a function, never finished text,
// so it always appears in the language selected when it is shown, even after a switch mid-game.
export type Msg = string | (() => string);
export const msg = (m?: Msg | null): string => (typeof m === 'function' ? m() : m ? tr(m) : '');

const dateLocale = (l: Lang = currentLang()) => (isRtl(l) ? 'ar-SA-u-ca-gregory' : 'en-GB');
export const formatDate = (d: Date | number, o: Intl.DateTimeFormatOptions) => new Date(d).toLocaleDateString(dateLocale(), o);
export const formatList = (a: string[], l?: Lang) => new Intl.ListFormat(dateLocale(l), { style: 'long', type: 'conjunction' }).format(a);

// Keeps a name or typed text in its own direction inside a sentence in the other language.
export const iso = (text: string) => `⁨${text}⁩`;

export default i18n;
