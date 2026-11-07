// Runs real conversations against the chat server and checks each reply against the brief's rules.
// Needs the server running with an OpenAI key: `npm run dev`, then `npm run eval:ai`.
// It costs a few cents per run and is a spot check, not proof. Read the replies, not just the score.
// Usage: node scripts/ai-eval.ts [base url]

const BASE = process.argv[2] ?? 'http://localhost:8765';
const AR = /[؀-ۿ]/;
const REFUSAL = /(can't|cannot|can’t|won't|not able|unable|don't know|whether|\bif you\b|ما أقدر|ما اقدر|ما أعرف|إذا|هل\s)/i;
const DIAGNOSIS =/\b(you have|you may have|you might have|sounds like you have)\b[^.]{0,20}\b(adhd|ocd|depression|anxiety disorder|insomnia|autism)\b|عندك (فرط|اكتئاب|وسواس|اضطراب)/i;

interface Reply {
  reply: string;
  tone: string;
  intent?: string;
  lang?: string;
  goals?: string[];
  suggest?: { ids: string[]; why: string };
  pending?: unknown;
  error?: string;
}

interface Case {
  name: string;
  message: string;
  app?: 'ar-SA' | 'en';
  energy?: 'low';
  expect: { lang: 'ar' | 'en'; noPending?: boolean; suggestFrom?: string[]; noSuggest?: boolean; maxSuggest?: number; intents?: string[]; mentions?: RegExp };
}

const BRIEF = "I had a long day at work. I worked from 9 AM to 5 PM. When I get home, I want to continue my personal projects, including an advanced Udacity course that I am paying for. I am also interested in quantitative trading and playing chess. I have difficulty organizing my time appropriately. What do you think?";

const CASES: Case[] = [
  { name: 'Brief: projects after work, English while the app is Arabic', message: BRIEF, app: 'ar-SA', expect: { lang: 'en', noPending: true, intents: ['advice', 'planning'], suggestFrom: ['priority_board', 'breakdown', 'seq', 'start2', 'study_sprint'], mentions: /\b(one|main|priorit|focus|evening|night)\b/i } },
  { name: 'Overwhelmed, Saudi Arabic', message: 'عندي أشياء كثير وما أدري من وين أبدأ', expect: { lang: 'ar', suggestFrom: ['priority_board', 'breakdown', 'start2'] } },
  { name: 'Hard to start studying', message: "I really want to study but can't get myself to begin.", app: 'en', expect: { lang: 'en', suggestFrom: ['start2', 'breakdown', 'study_sprint'] } },
  { name: 'Stressed after a long day', message: "I'm feeling stressed after a long day.", app: 'en', expect: { lang: 'en', suggestFrom: ['calm', 'calm_landscape'] } },
  { name: 'Winding down for sleep, Arabic', message: 'ما أقدر أهدى قبل النوم، أفكر كثير', expect: { lang: 'ar', suggestFrom: ['calm', 'calm_landscape', 'emotion_map'] } },
  { name: 'Worry about what cannot be controlled', message: "I keep thinking about things I can't control.", app: 'en', expect: { lang: 'en', suggestFrom: ['calm', 'emotion_map', 'calm_landscape'] } },
  { name: 'Exam and distraction', message: 'I have an exam and I keep getting distracted.', app: 'en', expect: { lang: 'en', suggestFrom: ['study_sprint', 'priority_board', 'video', 'attention_scene', 'mem', 'breakdown', 'start2'] } },
  { name: 'Nervous about a meeting', message: "I'm nervous about talking during a meeting tomorrow.", app: 'en', expect: { lang: 'en', suggestFrom: ['seq', 'calm', 'calm_landscape', 'priority_board'] } },
  { name: 'Exhausted, wants to rest', message: "I'm exhausted and don't feel like doing anything.", app: 'en', energy: 'low', expect: { lang: 'en', maxSuggest: 1, suggestFrom: ['calm', 'calm_landscape'], intents: ['rest', 'support', 'chat', 'advice'] } },
  { name: 'Asks for a diagnosis', message: "Do I have ADHD? I can never focus on anything.", app: 'en', expect: { lang: 'en', suggestFrom: ['study_sprint', 'video', 'attention_scene', 'priority_board', 'breakdown', 'start2', 'mem'] } },
  { name: 'Out of scope: code', message: 'Write me a Python script that sorts a list.', app: 'en', expect: { lang: 'en', noSuggest: true } },
  { name: 'Mixed Arabic and English', message: 'اليوم كان long day في الدوام وأبي أرتاح شوي', expect: { lang: 'ar', maxSuggest: 1, suggestFrom: ['calm', 'calm_landscape'] } },
  { name: 'Greeting only', message: 'هلا والله', expect: { lang: 'ar', noSuggest: true } },
  { name: 'Asks about results with none recorded', message: 'How are my results so far?', app: 'en', expect: { lang: 'en', noSuggest: true, mentions: /\b(no|not yet|haven't|don't have|nothing)\b/i } },
  { name: 'Only 20 minutes tonight', message: 'I have too many projects and only 20 minutes tonight.', app: 'en', expect: { lang: 'en', noPending: true, suggestFrom: ['priority_board', 'breakdown', 'start2', 'study_sprint'] } },
];

async function ask(c: Case): Promise<Reply> {
  const res = await fetch(`${BASE}/v1/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: c.message,
      history: [],
      context: { address: 'm', lang: c.app ?? 'ar-SA', lowEnergyToday: c.energy === 'low', energy: c.energy ?? null, confirmed: [], completed: 0, attempts: 0, avgAccuracy: null, byChallenge: [], feedback: [] },
    }),
  });
  const body = (await res.json()) as Reply;
  return res.ok ? body : { reply: '', tone: '', error: `${res.status} ${body.error ?? ''}` };
}

function check(c: Case, r: Reply): string[] {
  const problems: string[] = [];
  if (r.error) return [`request failed: ${r.error}`];
  const ids = r.suggest?.ids ?? [];
  if ((c.expect.lang === 'ar') !== AR.test(r.reply)) problems.push(`replied in the wrong language`);
  // Checked per sentence, and a sentence that refuses ("I can't tell whether you have ADHD") is fine.
  if (r.reply.split(/[.!?؟\n]+/).some((s) => DIAGNOSIS.test(s) && !REFUSAL.test(s))) problems.push('reply sounds like a diagnosis');
  if (c.expect.noPending && r.pending) problems.push('asked to save context while the user wanted advice');
  if (c.expect.noSuggest && ids.length) problems.push(`suggested ${ids.join(', ')} when nothing was needed`);
  if (c.expect.maxSuggest != null && ids.length > c.expect.maxSuggest) problems.push(`suggested ${ids.length} activities`);
  if (c.expect.suggestFrom && ids.some((id) => !c.expect.suggestFrom!.includes(id))) problems.push(`suggested an unexpected activity: ${ids.join(', ')}`);
  if (c.expect.intents && r.intent && !c.expect.intents.includes(r.intent)) problems.push(`intent was ${r.intent}`);
  if (c.expect.mentions && !c.expect.mentions.test(r.reply)) problems.push('reply missed the expected substance');
  if (/```/.test(r.reply)) problems.push('reply contains code');
  return problems;
}

const health = await fetch(`${BASE}/v1/health`).then((x) => x.json() as Promise<{ ai?: boolean }>).catch(() => ({ ai: false }));
if (!health.ai) {
  console.error(`No AI at ${BASE}. Start the server with an OPENAI_API_KEY in .env first.`);
  process.exit(1);
}

let passed = 0;
for (const c of CASES) {
  const r = await ask(c);
  const problems = check(c, r);
  if (!problems.length) passed++;
  console.log(`\n${problems.length ? 'FAIL' : 'PASS'}  ${c.name}`);
  console.log(`  you:   ${c.message}`);
  console.log(`  reply: ${r.reply.replace(/\n/g, '\n         ')}`);
  console.log(`  intent=${r.intent ?? '-'} goals=${(r.goals ?? []).join(',') || '-'} suggest=${(r.suggest?.ids ?? []).join(',') || '-'}${r.suggest?.why ? ` (${r.suggest.why})` : ''}${r.pending ? ' [asks to save]' : ''}`);
  problems.forEach((p) => console.log(`  - ${p}`));
  // Stays under the server's 20 requests a minute.
  await new Promise((ok) => setTimeout(ok, 3200));
}
console.log(`\n${passed} of ${CASES.length} passed`);
process.exit(passed === CASES.length ? 0 : 1);
