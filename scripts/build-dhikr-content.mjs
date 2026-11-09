// Builds src/features/dhikr/content.json: the approved dhikr for the five dhikr challenges.
// Nothing religious is typed here. Every text is taken word for word from its source, and every record must
// pass all of these checks, or the script stops and writes nothing:
//   1. The text is extracted verbatim from the hadith in the six books (hadith-api, Arabic editions), or from
//      the Tanzil Quran text (alquran.cloud).
//   2. The hadith is in Sahih al-Bukhari or Sahih Muslim, or al-Albani grades it sahih or hasan.
//   3. The hadith itself states the context (morning, evening, sleep, distress...) given below.
//   4. A repetition count above one is stated in the hadith itself.
//   5. Hadith texts also appear in Hisn al-Muslim (hisnmuslim.com API), as an independent check.
// The selection and the context words are this app's choices; the texts, references and gradings are not.
// Usage: node scripts/build-dhikr-content.mjs   (needs network; writes nothing if any check fails)
import { writeFileSync } from 'node:fs';

const HADITH_API = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';
const QURAN_API = 'https://api.alquran.cloud/v1';
const HISN_API = 'https://www.hisnmuslim.com/api/ar';

const BOOKS = {
  bukhari: { ar: 'صحيح البخاري', sahih: true },
  muslim: { ar: 'صحيح مسلم', sahih: true },
  abudawud: { ar: 'سنن أبي داود' },
  tirmidhi: { ar: 'جامع الترمذي' },
};

// Letters only: diacritics, tatweel, punctuation and spacing are ignored; alef, ya, ta marbuta forms unified.
const MARK = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/;
const unify = (ch) => ({ 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' })[ch] ?? ch;
// Hamza to ya, plus alef wasla (written in the Uthmani Quran text).
const isLetter = (ch) => /[\u0621-\u064a\u0671]/.test(ch) && !MARK.test(ch);
/** The letters of a text, each with its position in the original, so a match maps back to the source. */
function letters(raw) {
  const out = [];
  [...raw].forEach((ch, i) => { if (isLetter(ch)) out.push([unify(ch), i]); });
  return out;
}
const flat = (s) => letters(s).map(([c]) => c).join('');

/** The source's own text from the first letter of `from` to the last letter of `to`, with its diacritics. */
function span(raw, from, to, what) {
  const chars = [...raw];
  const L = letters(raw);
  const s = L.map(([c]) => c).join('');
  const a = s.indexOf(flat(from));
  if (a < 0) throw new Error(`${what}: start "${from}" not found in the source`);
  const zEnd = s.indexOf(flat(to), a);
  if (zEnd < 0) throw new Error(`${what}: end "${to}" not found after the start`);
  const z = zEnd + flat(to).length - 1;
  let end = L[z][1] + 1;
  while (end < chars.length && MARK.test(chars[end])) end++;
  return chars.slice(L[a][1], end).join('').replace(/[\u200e\u200f]/g, '').replace(/\s+/g, ' ').trim();
}

// jsDelivr sometimes refuses a burst of requests, so retries wait, and the same files are then read from the
// repository on GitHub, which is the same release of the same dataset.
const MIRROR = ['https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/', 'https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(url) {
  const urls = url.startsWith(MIRROR[0]) ? [url, url.replace(MIRROR[0], MIRROR[1])] : [url];
  let last;
  for (const u of urls) {
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(u, { headers: { 'User-Agent': 'zaho-dhikr-build' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return JSON.parse((await r.text()).replace(/^\ufeff/, ''));
      } catch (e) {
        last = `${u}: ${e.message}`;
        await wait(800 * (i + 1));
      }
    }
  }
  throw new Error(last);
}

const hadithCache = new Map();
/** One hadith by its standard number. Muslim's file numbering differs, so its sequence number is given too. */
async function hadith(book, number, seq = number) {
  const key = `${book}:${number}`;
  if (hadithCache.has(key)) return hadithCache.get(key);
  const d = await json(`${HADITH_API}/ara-${book}/${seq}.json`);
  const h = d.hadiths[0];
  if (Math.floor(Number(h.arabicnumber)) !== number) throw new Error(`${book} ${seq}: expected standard number ${number}, got ${h.arabicnumber}`);
  let grade = null;
  if (!BOOKS[book].sahih) {
    const e = await json(`${HADITH_API}/eng-${book}/${seq}.json`);
    const albani = (e.hadiths[0].grades || []).find((g) => /albani/i.test(g.name));
    if (!albani) throw new Error(`${book} ${number}: no grading by al-Albani`);
    grade = albani.grade.trim();
  }
  const out = { book, number, text: h.text, grade };
  hadithCache.set(key, out);
  return out;
}

// al-Albani's wording, as it appears in the dataset, and how it is said in Arabic.
const GRADES = { 'Sahih': 'صحّحه الألباني', 'Hasan': 'حسّنه الألباني', 'Hasan Sahih': 'قال الألباني: حسن صحيح', 'Hasan Isnaad': 'حسّن الألباني إسناده' };
function gradeOf(h) {
  if (BOOKS[h.book].sahih) return { en: 'sahih (in a Sahih collection)', ar: null };
  if (!Object.hasOwn(GRADES, h.grade)) throw new Error(`${h.book} ${h.number}: grade "${h.grade}" is not accepted`);
  return { en: `${h.grade} (al-Albani)`, ar: GRADES[h.grade] };
}
const refOf = (h) => {
  const g = gradeOf(h);
  return {
    book: h.book, number: h.number, grade: g.en,
    text: `${BOOKS[h.book].ar} ${h.number}${g.ar ? `، ${g.ar}` : ''}`,
    url: `https://sunnah.com/${h.book}:${h.number}`,
  };
};

const needs = (h, words, what) => {
  for (const w of [words].flat()) if (!flat(h.text).includes(flat(w))) throw new Error(`${what}: the hadith does not say "${w}"`);
};

// Hisn al-Muslim, every chapter, for the independent check.
async function hisnIndex() {
  const list = await json(`${HISN_API}/husn_ar.json`);
  const chapters = list[Object.keys(list)[0]];
  const out = [];
  for (const c of chapters) {
    const d = await json(`${HISN_API}/${c.ID}.json`);
    for (const x of d[Object.keys(d)[0]]) out.push({ chapter: c.ID, chapterTitle: c.TITLE, id: x.ID, flat: flat(x.ARABIC_TEXT) });
  }
  return out;
}

const quranCache = new Map();
async function surah(n) {
  if (!quranCache.has(n)) quranCache.set(n, (await json(`${QURAN_API}/surah/${n}/quran-uthmani`)).data);
  return quranCache.get(n);
}
/** Ayat from the Tanzil Uthmani text. A surah's first ayah carries the basmala, which is kept as its own line. */
async function ayat(n, from, to) {
  const s = await surah(n);
  const list = s.ayahs.filter((a) => a.numberInSurah >= from && a.numberInSurah <= to).map((a) => ({ n: a.numberInSurah, text: a.text.replace(/^\ufeff/, '').trim() }));
  if (list.length !== to - from + 1) throw new Error(`surah ${n}: ayat ${from}-${to} missing`);
  let basmala = null;
  if (from === 1 && n !== 1 && n !== 9) {
    const w = list[0].text.split(' ');
    basmala = w.slice(0, 4).join(' ');
    if (flat(basmala) !== flat('بسم الله الرحمن الرحيم')) throw new Error(`surah ${n}: no basmala at the start`);
    list[0] = { ...list[0], text: w.slice(4).join(' ') };
  }
  return { surah: n, name: s.name, basmala, ayat: list };
}

// ---------------------------------------------------------------------------------------------------
// The selection. `context` and `count` words must appear in the hadith; they are checks, not displayed.
// ---------------------------------------------------------------------------------------------------
const H = (book, number, from, to, o = {}) => ({ kind: 'hadith', book, number, from, to, ...o });

const ITEMS = {
  // Morning and evening
  quls: { kind: 'quran', surahs: [[112, 1, 4], [113, 1, 5], [114, 1, 6]], count: 3, evidence: { book: 'abudawud', number: 5082, context: ['حين تمسي وحين تصبح'], count: 'ثلاث مرات' } },
  bika_asbahna: H('abudawud', 5068, 'اللهم بك اصبحنا', 'واليك النشور', { context: 'اذا اصبح', count: 1 }),
  sayyid_istighfar: H('bukhari', 6306, 'اللهم انت ربي', 'لا يغفر الذنوب الا انت', { context: ['من النهار', 'من الليل'], count: 1 }),
  juwayriyah: H('muslim', 2726, 'سبحان الله وبحمده عدد خلقه', 'ومداد كلماته', { seq: 6913, context: 'صلي الصبح', count: 3, countWords: 'ثلاث مرات' }),
  bismillah_la_yadurr: H('abudawud', 5088, 'بسم الله الذي لا يضر', 'وهو السميع العليم', { context: ['حين يصبح', 'حتي يصبح'], count: 3, countWords: 'ثلاث مرات' }),
  subhan_100: H('muslim', 2692, 'سبحان الله وبحمده', 'سبحان الله وبحمده', { seq: 6843, context: 'حين يصبح وحين يمسي', count: 100, countWords: 'مايه مره' }),
  kalimat_tammat: H('muslim', 2709, 'اعوذ بكلمات الله التامات', 'من شر ما خلق', { seq: 6880, occurrence: 'حين امسيت', context: 'حين امسيت', count: 1 }),
  // Worry, distress and fear
  karb: H('bukhari', 6346, 'لا اله الا الله العظيم الحليم', 'ورب العرش الكريم', { context: 'عند الكرب', count: 1 }),
  hamm_hazan: H('bukhari', 6363, 'اللهم اني اعوذ بك من الهم والحزن', 'وغلبه الرجال', { context: 'الهم والحزن', count: 1 }),
  makrub: H('abudawud', 5090, 'اللهم رحمتك ارجو', 'لا اله الا انت', { occurrence: 'دعوات المكروب', context: 'دعوات المكروب', count: 1 }),
  allah_rabbi: H('abudawud', 1525, 'الله الله ربي', 'لا اشرك به شيئا', { context: 'عند الكرب', count: 1 }),
  dhun_nun: H('tirmidhi', 3505, 'لا اله الا انت سبحانك', 'من الظالمين', { context: 'في بطن الحوت', count: 1 }),
  hasbuna: H('bukhari', 4563, 'حسبنا الله ونعم الوكيل', 'حسبنا الله ونعم الوكيل', { context: 'قد جمعوا لكم فاخشوهم', count: 1 }),
  // A moment of remembrance (no fixed number in these hadith, so the counter is free)
  kalimatan: H('muslim', 2694, 'سبحان الله وبحمده', 'سبحان الله العظيم', { seq: 6846, context: 'خفيفتان علي اللسان', count: null, hisnChapter: 130 }),
  baqiyat: H('muslim', 2695, 'سبحان الله والحمد لله', 'والله اكبر', { seq: 6847, context: 'احب الي مما طلعت عليه الشمس', count: null, hisnChapter: 130 }),
  hawqala: H('muslim', 2704, 'لا حول ولا قوه الا بالله', 'لا حول ولا قوه الا بالله', { seq: 6862, occurrence: 'قل لا حول', context: 'كنز من كنوز الجنه', count: null, hisnChapter: 130 }),
  ighfir_li: H('muslim', 2697, 'اللهم اغفر لي', 'وارزقني', { seq: 6850, context: 'ان يدعو بهولاء الكلمات', count: null, hisnChapter: 130 }),
  // Before sleep
  muawwidhat_sleep: { kind: 'quran', surahs: [[112, 1, 4], [113, 1, 5], [114, 1, 6]], count: 3, evidence: { book: 'bukhari', number: 5017, context: ['اذا اوي الي فراشه', 'نفث فيهما'], count: 'يفعل ذلك ثلاث مرات' } },
  kursi_sleep: { kind: 'quran', surahs: [[2, 255, 255]], count: 1, evidence: { book: 'bukhari', number: 2311, context: ['اذا اويت الي فراشك فاقرا ايه الكرسي'] } },
  bismika_rabbi: H('tirmidhi', 3401, 'باسمك ربي وضعت جنبي', 'عبادك الصالحين', { context: 'فاذا اضطجع', count: 1 }),
  qini_adhabak: H('abudawud', 5045, 'اللهم قني عذابك', 'تبعث عبادك', { context: 'اذا اراد ان يرقد', count: 3, countWords: 'ثلاث مرار' }),
  tasbih_sleep: { kind: 'steps', evidence: { book: 'bukhari', number: 5361, context: 'اخذتما مضاجعكما' }, hisn: 106, steps: [
    { from: 'سبحان الله', to: 'سبحان الله', count: 33, countWords: 'فسبحا ثلاثا وثلاثين' },
    { from: 'الحمد لله', to: 'الحمد لله', count: 33, countWords: 'واحمدا ثلاثا وثلاثين' },
    { from: 'الله اكبر', to: 'الله اكبر', count: 34, countWords: 'وكبرا اربعا وثلاثين' },
  ] },
  bismika_amut: H('bukhari', 6324, 'باسمك اللهم اموت واحيا', 'باسمك اللهم اموت واحيا', { context: 'اذا اراد ان ينام', count: 1 }),
  aslamtu: H('bukhari', 6313, 'اللهم اسلمت نفسي اليك', 'وبنبيك الذي ارسلت', { context: 'اذا اردت مضجعك', count: 1 }),
};

// Order inside each challenge. The bedtime list ends with the supplication the hadith asks to be said last.
const CHALLENGES = {
  dhikr_morning: ['quls', 'bika_asbahna', 'sayyid_istighfar', 'juwayriyah', 'bismillah_la_yadurr', 'subhan_100'],
  dhikr_evening: ['quls', 'sayyid_istighfar', 'bismillah_la_yadurr', 'kalimat_tammat', 'subhan_100'],
  dhikr_calm_heart: ['karb', 'hamm_hazan', 'makrub', 'allah_rabbi', 'dhun_nun', 'hasbuna'],
  dhikr_moment: ['kalimatan', 'baqiyat', 'hawqala', 'ighfir_li'],
  dhikr_sleep: ['muawwidhat_sleep', 'kursi_sleep', 'bismika_rabbi', 'qini_adhabak', 'tasbih_sleep', 'bismika_amut', 'aslamtu'],
};
const EVENING_CONTEXT = { quls: 'حين تمسي', sayyid_istighfar: 'من الليل', bismillah_la_yadurr: 'ثلاث مرات لم تصبه فجاه بلاء حتي يصبح', subhan_100: 'حين يمسي' };
const MORNING_CONTEXT = { quls: 'تصبح', sayyid_istighfar: 'من النهار', bismillah_la_yadurr: 'حين يصبح', subhan_100: 'حين يصبح' };

// ---------------------------------------------------------------------------------------------------
const hisn = await hisnIndex();
// The displayed text is always the hadith's own wording. This check only confirms that Hisn al-Muslim carries
// the same dhikr: identical letters, or at least 85% of the text's 4-letter runs where Hisn uses another
// narration's wording (for example "وأبوء بذنبي" against al-Bukhari's "وأبوء لك بذنبي"). The figure is kept.
const HISN_MIN = 0.85;
const runs = (f) => Array.from({ length: Math.max(1, f.length - 3) }, (_, i) => f.slice(i, i + 4));
const inHisn = (text, what, prefer) => {
  const f = flat(text);
  // A record in the chapter that fits the challenge is preferred when the same words appear elsewhere too.
  const exact = (prefer && hisn.find((x) => x.chapter === prefer && x.flat.includes(f))) || hisn.find((x) => x.flat.includes(f));
  if (exact) return { chapter: exact.chapter, chapterTitle: exact.chapterTitle, id: exact.id, match: 1 };
  const r = runs(f);
  let best = null;
  for (const x of hisn) {
    const m = r.filter((g) => x.flat.includes(g)).length / r.length;
    if (!best || m > best.match) best = { chapter: x.chapter, chapterTitle: x.chapterTitle, id: x.id, match: Math.round(m * 100) / 100 };
  }
  if (!best || best.match < HISN_MIN) throw new Error(`${what}: not found in Hisn al-Muslim (best ${best?.match})`);
  return best;
};

const out = {};
for (const [key, it] of Object.entries(ITEMS)) {
  if (it.kind === 'hadith') {
    const h = await hadith(it.book, it.number, it.seq);
    needs(h, it.context, key);
    if (it.count > 1) needs(h, it.countWords, key);
    // When the text occurs more than once, start from the place the hadith actually teaches it.
    const from = it.occurrence ? span(h.text, it.occurrence, it.to, key).slice(0) : null;
    const text = from ? span(from, it.from, it.to, key) : span(h.text, it.from, it.to, key);
    out[key] = { kind: 'hadith', text, count: it.count, ref: refOf(h), hisn: inHisn(text, key, it.hisnChapter) };
  } else if (it.kind === 'quran') {
    const h = await hadith(it.evidence.book, it.evidence.number);
    needs(h, it.evidence.context, key);
    if (it.count > 1) needs(h, it.evidence.count, key);
    const parts = [];
    for (const [n, a, b] of it.surahs) parts.push(await ayat(n, a, b));
    out[key] = { kind: 'quran', parts, count: it.count, ref: refOf(h), quran: parts.map((p) => `${p.name} ${p.ayat[0].n === p.ayat.at(-1).n ? p.ayat[0].n : `${p.ayat[0].n}-${p.ayat.at(-1).n}`}`) };
  } else {
    const h = await hadith(it.evidence.book, it.evidence.number);
    needs(h, it.evidence.context, key);
    const src = (await json(`${HISN_API}/28.json`));
    const rec = src[Object.keys(src)[0]].find((x) => x.ID === it.hisn);
    if (!rec) throw new Error(`${key}: Hisn record ${it.hisn} missing`);
    const steps = it.steps.map((s) => {
      needs(h, s.countWords, key);
      return { text: span(rec.ARABIC_TEXT, s.from, s.to, key), count: s.count };
    });
    out[key] = { kind: 'steps', steps, count: null, ref: refOf(h), hisn: { chapter: 28, chapterTitle: 'أذكار النوم', id: it.hisn, match: 1 } };
  }
}
for (const [k, w] of Object.entries(EVENING_CONTEXT)) needs(await hadith(ITEMS[k].book ?? ITEMS[k].evidence.book, ITEMS[k].number ?? ITEMS[k].evidence.number, ITEMS[k].seq), w, `${k} (evening)`);
// The bedtime order puts aslamtu last because this narration asks for it to be the last words.
needs(await hadith('bukhari', 6311), ['اللهم اسلمت', 'فاجعلهن اخر ما تقول'], 'aslamtu (last)');
for (const [k, w] of Object.entries(MORNING_CONTEXT)) needs(await hadith(ITEMS[k].book ?? ITEMS[k].evidence.book, ITEMS[k].number ?? ITEMS[k].evidence.number, ITEMS[k].seq), w, `${k} (morning)`);

const content = {
  _about: 'Generated by scripts/build-dhikr-content.mjs. Do not edit by hand. Every text is verbatim from its source; see docs/dhikr-challenges.md.',
  sources: {
    hadith: { name: 'hadith-api (Arabic text of the six books)', url: 'https://github.com/fawazahmed0/hadith-api', license: 'Unlicense (public domain)' },
    quran: { name: 'Tanzil Quran text (Uthmani), via alquran.cloud', url: 'https://tanzil.net', license: 'Tanzil terms: verbatim use with attribution' },
    check: { name: 'Hisn al-Muslim (hisnmuslim.com API)', url: 'https://www.hisnmuslim.com', license: 'Used to cross-check only; no text is taken from it except the three tasbih words' },
  },
  items: out,
  challenges: CHALLENGES,
};
writeFileSync('src/features/dhikr/content.json', JSON.stringify(content, null, 2) + '\n');
console.log(`Approved ${Object.keys(out).length} records for ${Object.keys(CHALLENGES).length} challenges.`);
for (const [k, v] of Object.entries(out)) console.log(`${k.padEnd(20)} ${v.ref.text}${v.hisn ? ` | Hisn ${v.hisn.chapter}/${v.hisn.id}` : ''} | x${v.count ?? (v.steps ? v.steps.map((s) => s.count).join('/') : 'free')}`);

// ---------------------------------------------------------------------------------------------------
// docs/dhikr-challenges.md, written from the same verified data. The "why" lines are this app's reasons for
// choosing a record; they make no religious or medical claim of their own.
// ---------------------------------------------------------------------------------------------------
const WHY = {
  quls: 'The hadith tells the listener to recite these three surahs "حين تمسي وحين تصبح ثلاث مرات".',
  bika_asbahna: 'The hadith states it was said "إذا أصبح". Morning only: the evening wording of the same hadith differs from Hisn al-Muslim\'s, so it was not used.',
  sayyid_istighfar: 'The hadith names its reward for saying it "من النهار" and "من الليل", so it fits both lists.',
  juwayriyah: 'Said by the Prophet after the dawn prayer, "ثلاث مرات", in the hadith of Juwayriyah.',
  bismillah_la_yadurr: 'The hadith gives it "ثلاث مرات" for the evening ("حتى يصبح") and the morning ("حين يصبح").',
  subhan_100: 'The hadith says "حين يصبح وحين يمسي ... مائة مرة".',
  kalimat_tammat: 'The hadith: "لو قلت حين أمسيت". It gives no number, so it is said once here (Hisn al-Muslim lists three times from another source, which was not verified).',
  karb: 'Ibn Abbas reports the Prophet said it "عند الكرب" (in distress).',
  hamm_hazan: 'The supplication itself seeks refuge from worry and grief ("الهم والحزن"), and Anas reports the Prophet said it often.',
  makrub: 'The Prophet called it "دعوات المكروب": the supplication of the one in distress.',
  allah_rabbi: 'Taught to Asma bint Umays to say "عند الكرب أو في الكرب".',
  dhun_nun: 'The supplication of Yunus "في بطن الحوت", with the promise that a Muslim who calls with it in any matter is answered. Hisn al-Muslim lists it under distress.',
  hasbuna: 'Said by Ibrahim and by the Prophet when told "إن الناس قد جمعوا لكم فاخشوهم": words for facing fear. Hisn al-Muslim lists it under facing an enemy or a person in power ("دعاء لقاء العدو و ذي السلطان").',
  kalimatan: '"Two words light on the tongue": short, with no fixed number, suited to a pause.',
  baqiyat: 'The four phrases the Prophet said he loved more than all the sun rises on. No fixed number.',
  hawqala: 'Described as "a treasure of the treasures of Paradise". No fixed number.',
  ighfir_li: 'A short supplication the Prophet taught to new Muslims. No fixed number.',
  muawwidhat_sleep: 'The Prophet did this every night "إذا أوى إلى فراشه", reciting the three surahs, "يفعل ذلك ثلاث مرات".',
  kursi_sleep: 'The hadith of Abu Hurayrah: "إذا أويت إلى فراشك فاقرأ آية الكرسي", confirmed by the Prophet.',
  bismika_rabbi: 'To be said "فإذا اضطجع".',
  qini_adhabak: 'Said "إذا أراد أن يرقد", "ثلاث مرار": three times per the hadith (Hisn al-Muslim\'s data says once; the hadith was followed).',
  tasbih_sleep: 'Taught to Ali and Fatimah "إذا أخذتما مضاجعكما": 33, 33 and 34 in this narration. Another narration (al-Bukhari 6318) reports Ibn Sirin saying the tasbih is the 34; this one matches Hisn al-Muslim.',
  bismika_amut: 'The Prophet said it "إذا أراد أن ينام".',
  aslamtu: 'Taught "إذا أردت مضجعك". Placed last because another narration (al-Bukhari 6311) asks that it be the last words before sleep.',
};
const TITLES = {
  dhikr_morning: ['ابدأ يومك بذكر', 'Morning, when the user starts the day', 'Offered by the companion between 04:00 and 12:00 on the device clock.'],
  dhikr_evening: ['اختم يومك بذكر', 'Evening', 'Offered by the companion between 15:00 and 23:00.'],
  dhikr_calm_heart: ['طمّن قلبك', 'Worry, distress, fear, feeling overwhelmed', 'Any time, but only when the companion or the user asks for it by name: it is never picked automatically, so stress does not bring a dhikr suggestion every time.'],
  dhikr_moment: ['خذ لك لحظة ذكر', 'A short break during the day', 'Any time, on request.'],
  dhikr_sleep: ['قبل لا تنام', 'Bedtime', 'Offered by the companion between 20:00 and 04:00. Quiet: no sound, confetti or cheering at the end.'],
};
const words = (v) => v.text ?? (v.steps ? v.steps.map((s) => `${s.text} (${s.count})`).join(' / ') : v.parts.map((p) => p.name).join('، '));
const md = [];
md.push('# Dhikr challenges', '', '> Generated by `scripts/build-dhikr-content.mjs` together with `src/features/dhikr/content.json`. Do not edit by hand: change the script and run `node scripts/build-dhikr-content.mjs`.', '');
md.push('## Sources and how each record is verified', '');
md.push('| Role | Source | Endpoint | Licence |', '|---|---|---|---|');
md.push(`| Hadith text and numbering (displayed) | ${content.sources.hadith.name} | \`${HADITH_API}/ara-<book>/<n>.json\` | ${content.sources.hadith.license} |`);
md.push(`| Gradings of the Sunan (al-Albani) | same dataset, English editions | \`${HADITH_API}/eng-<book>/<n>.json\` | ${content.sources.hadith.license} |`);
md.push(`| Quran text (displayed) | ${content.sources.quran.name} | \`${QURAN_API}/surah/<n>/quran-uthmani\` | ${content.sources.quran.license} |`);
md.push(`| Independent cross-check | ${content.sources.check.name} | \`${HISN_API}/<chapter>.json\` | No licence stated; used to check, and only the three tasbih words are displayed from it |`, '');
md.push('A record is approved only if all of these hold. The build stops and writes nothing otherwise.', '',
  '1. **Exact text**: the words are cut verbatim from the hadith, with its own diacritics, or are the Tanzil Quran text. Nothing is typed, translated or paraphrased.',
  '2. **Authenticity**: the hadith is in Sahih al-Bukhari or Sahih Muslim, or al-Albani grades it sahih, hasan, hasan sahih or hasan isnad.',
  '3. **Context**: the hadith itself says when or why it is said (morning, evening, before sleep, distress). The exact words checked are in the script.',
  '4. **Count**: any number above one appears in the hadith itself. Where the hadith gives no number, the counter is free and no number is claimed.',
  '5. **Cross-check**: the same dhikr appears in Hisn al-Muslim (letters compared without diacritics; the match is shown below, 1 = identical).', '',
  'References use the standard numbering (al-Bukhari: Fath al-Bari; Muslim: Muhammad Fuad Abd al-Baqi; the Sunan: their usual numbering). Each links to sunnah.com so anyone can check it.', '',
  '**Verified religious references** are the text, the hadith or Quran reference, the grading and the count. **App-specific mappings** are the choice of records per challenge, their order, the time windows and the "why" notes: these are this app\'s decisions, not religious rulings.', '',
  'The app ships this approved copy and does not fetch religious text at run time, so a change or outage at a provider can never alter what users read. Running the script again re-fetches and re-verifies everything.', '');
md.push('## Not included, and why', '',
  '- **Athkar API (athkar.thkee.com)**: all 243 records were `draft`, none had references, and several repetition counts contradicted their own text. Not used.',
  '- **حسبي الله لا إله إلا هو... سبع مرات** (Hisn al-Muslim 27/83): the matching hadith, Abu Dawud 5081, is graded *mawdu* (fabricated) by al-Albani.',
  '- **اللهم إني أصبحت أشهدك... أربع مرات** (27/80) and **أصبحنا وأصبح الملك لله رب العالمين... فتحه ونصره** (27/89): graded *daif* by al-Albani.',
  '- **اللهم إني عبدك ابن عبدك...** (34/120) and **يا حي يا قيوم برحمتك أستغيث...** (27/88): not in the six books in the dataset, so they could not be verified here.',
  '- **أمسينا وأمسى الملك لله...** (Muslim 2723): the hadith text has the narrators\' remarks inside the wording, so it cannot be shown as one verbatim text.',
  '- **Audio**: Hisn al-Muslim has recordings but states no licence, and the Athkar API recordings belong to its unreviewed records. No audio is used.', '');
for (const [cid, keys] of Object.entries(CHALLENGES)) {
  const [name, ctx, when] = TITLES[cid];
  md.push(`## ${name} (\`${cid}\`)`, '', `**Context:** ${ctx}. ${when}`, '');
  md.push('| # | Key | Text (verbatim) | Reference | Grade | Count | Hisn al-Muslim (chapter/record, match) | Why it is here |', '|---|---|---|---|---|---|---|---|');
  keys.forEach((k, i) => {
    const v = out[k];
    const count = v.steps ? v.steps.map((s) => s.count).join(' / ') : v.count ?? 'free (no number in the hadith)';
    const quran = v.quran ? ` (Quran: ${v.quran.join('، ')})` : '';
    const h = v.hisn ? `${v.hisn.chapter}/${v.hisn.id}, ${v.hisn.match}` : 'n/a (Quran text, from Tanzil)';
    md.push(`| ${i + 1} | \`${k}\` | ${words(v)}${quran} | [${v.ref.text}](${v.ref.url}) | ${v.ref.grade} | ${count} | ${h} | ${WHY[k]} |`);
  });
  md.push('');
}
writeFileSync('docs/dhikr-challenges.md', md.join('\n'));
console.log('wrote docs/dhikr-challenges.md');
