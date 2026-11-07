export type ChatLang = 'ar-SA' | 'en';

// Character codes rather than a pattern, so this file holds no Arabic text (tests/i18n.test.ts).
const isArabic = (c: number) => c >= 0x0600 && c <= 0x06ff;
const isLatin = (c: number) => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);

// The language the user wrote in, which can differ from the app's language. Mixed text goes by
// whichever script has more letters; text with no letters, such as a number, keeps the fallback.
export function messageLang(message: string, fallback: ChatLang): ChatLang {
  let arabic = 0;
  let latin = 0;
  for (let i = 0; i < message.length; i++) {
    const c = message.charCodeAt(i);
    if (isArabic(c)) arabic++;
    else if (isLatin(c)) latin++;
  }
  if (!arabic && !latin) return fallback;
  return arabic >= latin ? 'ar-SA' : 'en';
}
