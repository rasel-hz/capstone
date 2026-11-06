import type { AppState, ContextTag } from '../../types';
import { crisisMessage, detectCrisis } from './crisis';

export interface CompanionReply {
  messages: string[];
  pending?: { ctx: ContextTag[]; low: number; card: string };
  tone: 'support' | 'friendly' | 'crisis';
}

export function ruleReply(v: string, s: AppState): CompanionReply {
  const cr = detectCrisis(v);
  if (cr) return { messages: [crisisMessage(cr)], tone: 'crisis' };

  const c: ContextTag[] = [];
  const l: string[] = [];
  let lw = 0;
  if (/مالي خلق|تعبان|مرهق|منهك|تعبانة/.test(v)) { lw = 1; l.push('طاقتك قليلة'); }
  if (/متأخر|سهران|ما نمت|سهرت/.test(v)) { c.push('sleep'); l.push('نمت متأخر'); }
  if (/دوام|شغل|محاضر|جامعة/.test(v)) { c.push('work'); l.push('عندك دوام أو دراسة'); }
  if (/عزيمة|عرس|زواج|جمعة|مناسبة/.test(v)) { c.push('event'); l.push('عندك مناسبة'); }

  if (l.length) {
    return {
      tone: 'support',
      messages: [`يا بعدي، شكل يومك مليان. اللي فهمته من كلامك: ${l.join('، ')}. أسجّلها عشان أرتب لك مهمة اليوم؟ وهذا من كلامك أنت، ما أخمّن شي فوقه.`],
      pending: { ctx: c, low: lw, card: 'تبي أخفف مهمة اليوم؟' },
    };
  }
  if (/نتيج|تقدم|أدائي|إنجاز|كيف سويت/.test(v)) {
    const H = s.hist.filter((h) => h.mid);
    if (!H.length) return { tone: 'friendly', messages: ['ما عندي سجل لسا. أول ما تخلص مهمة أقدر أحكي لك عن نتائجك الفعلية.'] };
    const d = H.filter((h) => h.status === 'COMPLETED').length;
    const a = H.filter((h) => h.acc != null);
    const avg = a.length ? `، ومتوسط الدقة ${Math.round(a.reduce((n, h) => n + (h.acc as number), 0) / a.length)}%` : '';
    return { tone: 'friendly', messages: [`في سجلك ${H.length} محاولات، أكملت منها ${d}${avg}. هذا بس للمتابعة الشخصية، وما يقيس حالتك الصحية.`] };
  }
  if (/وش علومك|كيف حالك|هلا/.test(v)) return { tone: 'friendly', messages: ['هلا والله! طيب الحمدلله. وأنت؟ كيف نومك ويومك؟'] };
  if (/شكرا|مشكور|يعطيك/.test(v)) return { tone: 'friendly', messages: ['الله يعافيك! أنا هنا لو احتجت، ولا تنسى جلستك مع أهلك وناسك.'] };
  return { tone: 'friendly', messages: ['سمعتك. تبي تحكي لي أكثر عن يومك؟ ولو تبي نجرب شي خفيف، ابدأ مهمة اليوم من الرئيسية.'] };
}
