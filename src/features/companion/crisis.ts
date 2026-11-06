// A keyword safety net, not understanding. Wording and numbers still need clinical review (reference 11.6).
export const normalizeArabic = (s: string) =>
  s.normalize('NFKC').replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/(.)\1+/g, '$1').replace(/\s+/g, ' ').trim();

const IDIOM = new RegExp(
  '[ابن]?موت (' +
    ['فيك', 'فيه', 'فيها', 'فيكم', 'عليك', 'عليه', 'عليها', 'من الضحك', 'من الجوع', 'من العطش', 'من البرد', 'من الحر', 'من الفرح', 'من الوناسة', 'من الحماس', 'من الشوق']
      .map(normalizeArabic).join('|') + ')',
  'g',
);

const HIGH = ['انتحر', 'انتحار', 'اقتل نفسي', 'أذي نفسي', 'أذيت نفسي', 'اجرح نفسي', 'اضر نفسي', 'انهي حياتي', 'انهي نفسي', 'ابي اموت', 'ابغى اموت', 'ابغا اموت', 'ودي اموت', 'بغيت اموت', 'ما ابي اعيش', 'ماابي اعيش', 'مابي اعيش', 'ما ابغى اعيش', 'ما ودي اعيش', 'ما عاد ابي اعيش', 'ما لي خلق اعيش', 'مالي خلق اعيش', 'تعبت من الحياة', 'مليت من الحياة', 'كرهت الحياة', 'كرهت حياتي', 'الموت ارحم', 'ليتني ميت', 'ليتني اموت', 'لو مت احسن', 'لو اموت احسن', 'ما اقدر اكمل حياتي', 'kill myself', 'suicide', 'suicidal', 'end my life', 'want to die', 'self harm', 'hurt myself'].map(normalizeArabic);
const CHECK = ['ما عاد فيني', 'تعبت من كل شي', 'مالي داعي', 'ما لي داعي', 'ابي اختفي', 'ما فيه فايدة مني'].map(normalizeArabic);

export type CrisisLevel = 0 | 1 | 2;

export function detectCrisis(text: string): CrisisLevel {
  const t = normalizeArabic(text).replace(IDIOM, ' ');
  if (HIGH.some((p) => t.includes(p))) return 1;
  if (CHECK.some((p) => t.includes(p)) || /(^| )[ابن]موت( |$)/.test(t)) return 2;
  return 0;
}

const SUPPORT = 'يا بعدي، كلامك مهم عندي وأهتم فيك. أنا مو بديل عن إنسان يكون جنبك الحين. إذا في خطر عليك فاتصل بالإسعاف 997 أو توجّه لأقرب طوارئ، أو كلّم الصحة على 937. وإذا تقدر كلّم أحد من أهلك أو أصحابك الحين وخلّه يجلس معك.';

export const crisisMessage = (lv: CrisisLevel) =>
  (lv === 2 ? 'أبي أتأكد منك لأن كلامك يهمني: إذا تقصد إنك تفكر تؤذي نفسك أو ما ودك تعيش، لا تشيلها لحالك. ' : '') + SUPPORT;
