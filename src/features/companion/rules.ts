import { currentLang, formatList, tr } from '../../i18n';
import type { AppState, ContextTag } from '../../types';
import { crisisMessage, detectCrisis } from './crisis';

export interface CompanionReply {
  messages: string[];
  pending?: { ctx: ContextTag[]; low: number; card: 1 };
  tone: 'support' | 'friendly' | 'crisis';
}

// Keywords in both languages, because someone can type either whichever language the app is in.
// These are matching patterns, not interface text. Replies come from the locale files.
const LOW = /مالي خلق|تعبان|مرهق|منهك|تعبانة|\b(tired|exhausted|drained|no energy|low energy|worn out)\b/i;
const SLEEP = /متأخر|سهران|ما نمت|سهرت|\b(slept late|stayed up|up late|didn'?t sleep|barely slept|no sleep|bad sleep)\b/i;
const WORK = /دوام|شغل|محاضر|جامعة|\b(work|job|office|shift|class|lecture|university|college|study|studying)\b/i;
const EVENT = /عزيمة|عرس|زواج|جمعة|مناسبة|\b(gathering|wedding|dinner party|family dinner|party|event)\b/i;
const RESULTS = /نتيج|تقدم|أدائي|إنجاز|كيف سويت|\b(results?|progress|score|how did i do)\b/i;
const GREET = /وش علومك|كيف حالك|هلا|\b(hi|hello|hey|how are you)\b/i;
const THANKS = /شكرا|مشكور|يعطيك|\b(thanks|thank you)\b/i;

export function ruleReply(v: string, s: AppState): CompanionReply {
  const cr = detectCrisis(v);
  if (cr) return { messages: [crisisMessage(cr, currentLang())], tone: 'crisis' };

  const c: ContextTag[] = [];
  const l: string[] = [];
  let lw = 0;
  if (LOW.test(v)) { lw = 1; l.push(tr('companion.rules.factLow')); }
  if (SLEEP.test(v)) { c.push('sleep'); l.push(tr('companion.rules.factSleep')); }
  if (WORK.test(v)) { c.push('work'); l.push(tr('companion.rules.factWork')); }
  if (EVENT.test(v)) { c.push('event'); l.push(tr('companion.rules.factEvent')); }

  if (l.length) {
    return {
      tone: 'support',
      messages: [tr('companion.rules.understood', { facts: formatList(l) })],
      pending: { ctx: c, low: lw, card: 1 },
    };
  }
  if (RESULTS.test(v)) {
    const H = s.hist.filter((h) => h.mid);
    if (!H.length) return { tone: 'friendly', messages: [tr('companion.rules.noResults')] };
    const d = H.filter((h) => h.status === 'COMPLETED').length;
    const a = H.filter((h) => h.acc != null);
    const avg = a.length ? tr('companion.rules.avg', { acc: Math.round(a.reduce((n, h) => n + (h.acc as number), 0) / a.length) }) : '';
    return { tone: 'friendly', messages: [tr('companion.rules.results', { total: H.length, done: d, avg })] };
  }
  if (GREET.test(v)) return { tone: 'friendly', messages: [tr('companion.rules.greet')] };
  if (THANKS.test(v)) return { tone: 'friendly', messages: [tr('companion.rules.thanks')] };
  return { tone: 'friendly', messages: [tr('companion.rules.fallback')] };
}
