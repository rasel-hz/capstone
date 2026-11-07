// A keyword safety net, not understanding. Wording and numbers still need clinical review (reference 11.6).
// This file also runs on the server, so it imports the locale files directly instead of using i18n.
import ar from '../../i18n/locales/ar-SA/companion.json' with { type: 'json' };
import en from '../../i18n/locales/en/companion.json' with { type: 'json' };

export type CrisisLang = 'ar-SA' | 'en';

export const normalizeArabic = (s: string) =>
  s.normalize('NFKC').replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/(.)\1+/g, '$1').replace(/\s+/g, ' ').trim();

const IDIOM = new RegExp(
  '[ابن]?موت (' +
    ['فيك', 'فيه', 'فيها', 'فيكم', 'عليك', 'عليه', 'عليها', 'من الضحك', 'من الجوع', 'من العطش', 'من البرد', 'من الحر', 'من الفرح', 'من الوناسة', 'من الحماس', 'من الشوق']
      .map(normalizeArabic).join('|') + ')',
  'g',
);

// Both languages are always checked, whichever language the app is showing.
const HIGH = ['انتحر', 'انتحار', 'اقتل نفسي', 'أذي نفسي', 'أذيت نفسي', 'اجرح نفسي', 'اضر نفسي', 'انهي حياتي', 'انهي نفسي', 'ابي اموت', 'ابغى اموت', 'ابغا اموت', 'ودي اموت', 'بغيت اموت', 'ما ابي اعيش', 'ماابي اعيش', 'مابي اعيش', 'ما ابغى اعيش', 'ما ودي اعيش', 'ما عاد ابي اعيش', 'ما لي خلق اعيش', 'مالي خلق اعيش', 'تعبت من الحياة', 'مليت من الحياة', 'كرهت الحياة', 'كرهت حياتي', 'الموت ارحم', 'ليتني ميت', 'ليتني اموت', 'لو مت احسن', 'لو اموت احسن', 'ما اقدر اكمل حياتي',
  'kill myself', 'killing myself', 'suicide', 'suicidal', 'end my life', 'ending my life', 'end it all', 'want to die', 'wanna die', 'wish i was dead', 'wish i were dead', 'better off dead', "don't want to live", 'dont want to live', 'self harm', 'selfharm', 'hurt myself', 'hurting myself', 'harm myself', 'cut myself'].map(normalizeArabic);
const CHECK = ['ما عاد فيني', 'تعبت من كل شي', 'مالي داعي', 'ما لي داعي', 'ابي اختفي', 'ما فيه فايدة مني',
  "can't go on", 'cant go on', "can't do this anymore", 'cant do this anymore', 'want to disappear', 'no reason to live', 'no point in living', 'better off without me', 'tired of living'].map(normalizeArabic);

export type CrisisLevel = 0 | 1 | 2;

export function detectCrisis(text: string): CrisisLevel {
  const t = normalizeArabic(text).replace(IDIOM, ' ');
  if (HIGH.some((p) => t.includes(p))) return 1;
  if (CHECK.some((p) => t.includes(p)) || /(^| )[ابن]موت( |$)/.test(t)) return 2;
  return 0;
}

const TEXT = { 'ar-SA': ar.crisis, en: en.crisis };

// Crisis exchanges stay out of the history sent to the AI service, in either direction.
// The markers also match replies saved under earlier wording, so keep each phrase in its support message.
export const isCrisisText = (t: string) => detectCrisis(t) !== 0 || t.includes(TEXT['ar-SA'].marker) || t.includes(TEXT.en.marker);

// Level 2 also covers someone being harmed by another person, so it can't assume self-harm or safe family.
export const crisisMessage = (lv: CrisisLevel, lang: CrisisLang = 'ar-SA') =>
  (lv === 2 ? TEXT[lang].check + ' ' : '') + TEXT[lang].support;
