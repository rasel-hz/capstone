// Keeps only tasks the user actually mentioned. A task survives if one of its distinctive words
// appears in what the user wrote, so the model can't add "check lecture schedule" to someone who
// never mentioned university. Generic words like "study" or "continue" don't count on their own.

const GENERIC = new Set([
  'the', 'and', 'for', 'with', 'about', 'more', 'some', 'into', 'from', 'that', 'this', 'other', 'others', 'lot', 'lots',
  'study', 'studying', 'learn', 'learning', 'continue', 'continuing', 'work', 'working', 'play', 'playing', 'practice',
  'practise', 'finish', 'finishing', 'start', 'read', 'reading', 'make', 'time', 'task', 'tasks', 'project', 'projects',
  'personal', 'thing', 'things', 'stuff', 'course', 'courses', 'session', 'evening', 'tonight', 'today', 'daily', 'plan',
  'have', 'want', 'like', 'need', 'really', 'check', 'take', 'keep', 'get', 'going', 'home', 'back', 'come', 'day', 'long',
  'hour', 'hours', 'one', 'two', 'next', 'also', 'very', 'much', 'still', 'which', 'what', 'when', 'would', 'could', 'should',
  'will', 'just', 'them', 'they', 'their', 'your', 'mine', 'are', 'was', 'did', 'does', 'can', 'all', 'any', 'new', 'more',
  'interest', 'interests', 'interested', 'help', 'better', 'organize', 'organise', 'appropriately', 'difficult', 'hard',
  'أبي', 'ابي', 'أسوي', 'اسوي', 'وقت', 'شغل', 'أشياء', 'اشياء', 'شي', 'شيء', 'مشروع', 'مشاريع', 'أكمل', 'اكمل', 'أتعلم',
  'اتعلم', 'أذاكر', 'اذاكر', 'الليلة', 'اليوم', 'بعد', 'قبل', 'عشان', 'كثير', 'واجد',
]);

const words = (s: string) =>
  s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length >= 3);

export function groundedTasks(tasks: unknown, said: string): string[] {
  if (!Array.isArray(tasks)) return [];
  const pool = new Set(words(said));
  const out: string[] = [];
  for (const t of tasks) {
    if (typeof t !== 'string') continue;
    const text = t.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!text) continue;
    const distinctive = words(text).filter((w) => !GENERIC.has(w));
    // Accepts an exact word, or a plural or prefixed form, such as "chess" and "chesss" typos aside.
    const found = distinctive.some((w) => pool.has(w) || [...pool].some((p) => p.length >= 4 && (p.startsWith(w) || w.startsWith(p))));
    if (found && !out.some((o) => o.toLowerCase() === text.toLowerCase())) out.push(text);
    if (out.length >= 6) break;
  }
  return out;
}
