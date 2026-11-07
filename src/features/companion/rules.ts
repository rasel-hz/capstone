import { currentLang, formatList, tr } from '../../i18n';
import type { AppState, ContextTag } from '../../types';
import type { Goal } from '../recommend/goals';
import type { SuggestInput } from '../recommend/suggest';
import { crisisMessage, detectCrisis } from './crisis';
import { messageLang } from './lang';

export interface CompanionReply {
  messages: string[];
  pending?: { ctx: ContextTag[]; low: number; card: 1 };
  tone: 'support' | 'friendly' | 'crisis';
  /** A proposed activity, not yet filtered. The chat runs it through the recommendation engine. */
  proposal?: SuggestInput;
}

// Keywords in both languages, because someone can type either whichever language the app is in.
// These are matching patterns, not interface text. Replies come from the locale files.
// This is the offline fallback, and the chat labels it as simple rules, not AI.
const LOW = /مالي خلق|تعبان|مرهق|منهك|تعبانة|\b(tired|exhausted|drained|no energy|low energy|worn out)\b/i;
const SLEEP = /متأخر|سهران|ما نمت|سهرت|\b(slept late|stayed up|up late|didn'?t sleep|barely slept|no sleep|bad sleep)\b/i;
const WORK = /دوام|شغل|محاضر|جامعة|\b(work|job|office|shift|class|lecture|university|college|study|studying)\b/i;
const EVENT = /عزيمة|عرس|زواج|جمعة|مناسبة|\b(gathering|wedding|dinner party|family dinner|party|event)\b/i;
const RESULTS = /نتيج|تقدم|أدائي|إنجاز|كيف سويت|\b(results?|progress|score|how did i do)\b/i;
const GREET = /وش علومك|كيف حالك|هلا|\b(hi|hello|hey|how are you)\b/i;
const THANKS = /شكرا|مشكور|يعطيك|\b(thanks|thank you)\b/i;

// What the user is trying to do, checked in order of how specific the wording is.
const GOAL_PATTERNS: [Goal, RegExp][] = [
  ['rest', /أبي أرتاح|ابي ارتاح|ما لي خلق أسوي|مالي خلق اسوي|ما ودي أسوي شي|\b(just want to rest|need (a )?rest|don'?t feel like doing anything|want to do nothing)\b/i],
  ['sleep', /ما أقدر أنام|ما اقدر انام|قبل النوم|أنام بسرعة|ما يجيني نوم|\b(can'?t sleep|fall asleep|before bed|wind(ing)? down|relax before (bed|sleep))\b/i],
  ['start', /ما أقدر أبدأ|ما اقدر ابدا|أأجل|اأجل|أسوّف|اسوف|تسويف|ما أعرف أبدأ|\b(can'?t (get myself to )?(start|begin)|procrastinat\w*|get started|keep putting (it|things) off)\b/i],
  ['prioritize', /من وين أبدأ|من وين ابدا|وش أبدأ فيه|أشياء كثير|مهام كثير|أرتب وقتي|ارتب وقتي|تنظيم وقتي|أنظم وقتي|أولوياتي|ترتيب أولويات|\b(where to start|too much to do|so much to do|too many (things|tasks|projects)|overwhelm\w*|organi[sz]e|prioriti[sz]\w*|priorities|juggl\w*|manage my time|time management)\b/i],
  ['worry', /قلقان|قلقانة|أفكر كثير|افكر كثير|شاغل بالي|ما أقدر أوقف تفكير|أشياء ما بيدي|\b(worr(y|ied|ying)|overthink\w*|can'?t stop thinking|things i can'?t control)\b/i],
  ['social', /اجتماع|أتكلم قدام|اتكلم قدام|عرض تقديمي|\b(meeting|presentation|speak up|talking in front|nervous about talking)\b/i],
  ['focus', /تشتت|أتشتت|اركز|أركز|تركيز|اختبار|مذاكرة|أذاكر|\b(distract\w*|focus|concentrat\w*|exam|revise|revision)\b/i],
  ['stress', /مضغوط|متوتر|توتر|ضغط|يوم طويل|\b(stress(ed|ful)?|tense|under pressure|long day)\b/i],
  ['time', /الوقت يروح|ما أحس بالوقت|أتأخر دايم|\b(lose track of time|time (flies|slips)|always late)\b/i],
  ['memory', /ذاكرتي|أنسى|انسى|\b(memory|forgetful|keep forgetting)\b/i],
];

/** The user mentioned work, so an optional break after it makes sense as a labelled suggestion. */
export const mentionsWork = (v: string) => /دوام|الدوام|شغلي|\b(work|job|office|shift)\b/i.test(v);

export function detectGoals(v: string): Goal[] {
  return GOAL_PATTERNS.filter(([, re]) => re.test(v)).map(([g]) => g);
}

export function statedMinutes(v: string): number | undefined {
  const m = v.match(/(\d{1,3})\s*(min\b|mins\b|minutes?\b|دقيقة|دقايق|دقائق)/i);
  const n = m ? Number(m[1]) : NaN;
  return n > 0 && n <= 240 ? n : undefined;
}

export function ruleReply(v: string, s: AppState): CompanionReply {
  // Reply in the language the user wrote in, like the AI does.
  const lng = messageLang(v, currentLang());
  const say = (key: string, o: Record<string, unknown> = {}) => tr(key, { ...o, lng });

  const cr = detectCrisis(v);
  if (cr) return { messages: [crisisMessage(cr, lng)], tone: 'crisis' };

  // Answer what the user is asking for first, with reviewed advice, and offer a fitting activity.
  const goals = detectGoals(v);
  if (goals.length && !s.driving) {
    const main = goals[0];
    return {
      tone: main === 'rest' || main === 'stress' || main === 'worry' ? 'support' : 'friendly',
      messages: [say(`companion.rules.advice.${main}`)],
      proposal: { goals, minutes: statedMinutes(v) },
    };
  }

  const c: ContextTag[] = [];
  const l: string[] = [];
  let lw = 0;
  if (LOW.test(v)) { lw = 1; l.push(say('companion.rules.factLow')); }
  if (SLEEP.test(v)) { c.push('sleep'); l.push(say('companion.rules.factSleep')); }
  if (WORK.test(v)) { c.push('work'); l.push(say('companion.rules.factWork')); }
  if (EVENT.test(v)) { c.push('event'); l.push(say('companion.rules.factEvent')); }

  if (l.length) {
    return {
      tone: 'support',
      messages: [say('companion.rules.understood', { facts: formatList(l, lng) })],
      pending: { ctx: c, low: lw, card: 1 },
    };
  }
  if (RESULTS.test(v)) {
    const H = s.hist.filter((h) => h.mid);
    if (!H.length) return { tone: 'friendly', messages: [say('companion.rules.noResults')] };
    const d = H.filter((h) => h.status === 'COMPLETED').length;
    const a = H.filter((h) => h.acc != null);
    const avg = a.length ? say('companion.rules.avg', { acc: Math.round(a.reduce((n, h) => n + (h.acc as number), 0) / a.length) }) : '';
    return { tone: 'friendly', messages: [say('companion.rules.results', { total: H.length, done: d, avg })] };
  }
  if (GREET.test(v)) return { tone: 'friendly', messages: [say('companion.rules.greet')] };
  if (THANKS.test(v)) return { tone: 'friendly', messages: [say('companion.rules.thanks')] };
  return { tone: 'friendly', messages: [say('companion.rules.fallback')] };
}
