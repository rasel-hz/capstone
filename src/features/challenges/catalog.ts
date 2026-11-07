import type { Challenge, ChallengeCategory, ChallengeId, Journey } from '../../types/index.ts';

export const CHALLENGES: Record<ChallengeId, Challenge> = {
  video: { t: 'ركز معي شوي', cat: 'تركيز', min: 1, xp: 30, k: 'v', hasEasy: true, scored: true, desc: 'مشهد واحة قصير، وبعده أسئلة عن اللي شفته.', purpose: 'تمرين انتباه قصير يناسب وقت فراغ بسيط.' },
  mem: { t: 'وش تتذكر؟', cat: 'ذاكرة', min: 2, xp: 25, k: 'm', hasEasy: true, scored: true, desc: 'احفظ الأشكال وألوانها، وقلّي وش اختفى.', purpose: 'جولات ذاكرة بصرية تصعب شوي شوي.' },
  seq: { t: 'رتبها يا وحش', cat: 'تخطيط', min: 2, xp: 25, k: 's', hasEasy: true, scored: true, desc: 'رتّب خطوات يوم حقيقي بالسحب أو الضغط.', purpose: 'تمرين على ترتيب الخطوات قبل ما تبدأها.' },
  time: { t: 'وين راح الوقت؟', cat: 'وعي بالوقت', min: 1, xp: 20, k: 't', hasEasy: false, scored: false, desc: 'توقّع المدة، وقارن توقعك بالوقت الفعلي.', purpose: 'تشوف الفرق بين إحساسك بالوقت والوقت الفعلي.' },
  calm: { t: 'على هونك', cat: 'استرخاء', min: 2, xp: 15, k: 'c', hasEasy: false, scored: false, desc: 'تنفس هادي بسرعة تناسبك، أو بريك بدون تنفس.', purpose: 'وقفة هادية في يومك، وتقدر تتخطاها.' },
  start2: { t: 'دقيقتين ونبدأ', cat: 'مهمة حقيقية', min: 2, xp: 25, k: 'd', hasEasy: false, scored: false, desc: 'اختر مهمة مؤجلة وابدأ أصغر خطوة فيها.', purpose: 'يساعد على بداية المهام المؤجلة بخطوة صغيرة.' },
  attention_scene: { t: 'وش اللي تغيّر؟', cat: 'تركيز', min: 2, xp: 25, k: 'a', hasEasy: true, scored: true, desc: 'قارن مشهدين وحدد الفروق بينهم.', purpose: 'تمرين انتباه للتفاصيل، بدون عجلة.' },
  priority_board: { t: 'وش أول شيء؟', cat: 'تخطيط', min: 2, xp: 20, k: 'p', hasEasy: true, scored: false, desc: 'وزّع مهامك على الحين، بعدين، ومو اليوم.', purpose: 'يخفف زحمة المهام لما تحس كل شي مهم.' },
  breakdown: { t: 'فكّكها', cat: 'مهمة حقيقية', min: 3, xp: 25, k: 'b', hasEasy: true, scored: false, desc: 'قسّم مهمة كبيرة لخطوات صغيرة، وحط لها خطة.', purpose: 'يحوّل مهمة كبيرة لخطوة أولى واضحة.' },
  study_sprint: { t: 'مذاكرة على قدك', cat: 'مهمة حقيقية', min: 5, xp: 30, k: 'y', hasEasy: false, scored: false, desc: 'جلسة مذاكرة قصيرة، مع مكان تركن فيه المشتتات.', purpose: 'جلسة تركيز قصيرة لجدول الدراسة أو الشغل.' },
  emotion_map: { t: 'وش جوّك؟', cat: 'استرخاء', min: 1, xp: 0, k: 'e', hasEasy: false, scored: false, selfReport: true, desc: 'اختر وش تحس، ووش ممكن يفيدك. هذا كلامك أنت.', purpose: 'وقفة اختيارية تسجل فيها جوّك بكلامك أنت.' },
  calm_landscape: { t: 'خذ لك بريك', cat: 'استرخاء', min: 1, xp: 10, k: 'l', hasEasy: false, scored: false, desc: 'واحة هادية تتفاعل معها على راحتك.', purpose: 'بريك بصري قصير بين الشغلات.' },
};

export const CATEGORIES: ChallengeCategory[] = ['تركيز', 'ذاكرة', 'تخطيط', 'وعي بالوقت', 'استرخاء', 'مهمة حقيقية'];

export const INSTRUCTIONS: Record<ChallengeId, string> = {
  video: 'بتشوف مشهد قصير من الواحة، ٢٤ ثانية. انتبه لتفاصيله، وبعدها أسألك.',
  mem: 'احفظ الأشكال وألوانها، وبعدها قلّي وش اختفى.',
  seq: 'رتّب الخطوات بالترتيب اللي تشوفه منطقي. اسحبها أو اضغط عليها.',
  time: 'قدّر كم ثانية بتاخذ منك مهمة بسيطة، وبعدها نقارن.',
  calm: 'تنفّس معي على هونك، أو خذ بريك بدون تنفس. القرار لك.',
  start2: 'نختار مهمة مؤجلة ونبدأها بخطوة صغيرة.',
  attention_scene: 'قدامك مشهدين. اضغط في المشهد الثاني على الأشياء اللي تغيرت.',
  priority_board: 'وزّع المهام على ثلاث قوائم، وبعدها اختر أول شي. ما فيه إجابة غلط.',
  breakdown: 'اكتب مهمة كبيرة، قسّمها لخطوات صغيرة، وحط لها خطة بسيطة.',
  study_sprint: 'اختر مدة تناسبك وابدأ. وأي شي يشتتك اكتبه بجنب وارجع.',
  emotion_map: 'اختر وش تحس فيه الحين، إذا تبي. أنا ما أخمّن مشاعرك، وهذي إجابتك أنت.',
  calm_landscape: 'واحة هادية. اضغط على الفوانيس والماء والنخل، أو بس خلك تشوفها.',
};

export const JOURNEYS: Journey[] = [
  { id: 'adhd', n: 'التركيز والتنظيم', a: ['video', 'attention_scene', 'priority_board', 'seq', 'breakdown', 'time', 'mem', 'start2', 'study_sprint'], d: 'بدء المهام، ترتيب الأولويات، وتقدير الوقت', g: '#E9DFFF,#c9b8ff' },
  { id: 'anx', n: 'الهدوء والقلق', a: ['calm', 'calm_landscape', 'emotion_map', 'video', 'mem'], d: 'وقفات هادية واختيارات لطيفة، وتقدر تتخطاها', g: '#d9f0e0,#bfe4ff' },
  { id: 'ocd', n: 'التعامل مع عدم اليقين', a: ['calm', 'time'], d: 'محتوى تثقيفي فقط، وأي برنامج علاجي يكون مع مختص', g: '#cdeaf2,#e3f3ee' },
  { id: 'mood', n: 'المزاج والحماس', a: ['start2', 'emotion_map', 'breakdown', 'calm', 'seq'], d: 'خطوات صغيرة تقدر عليها، بدون ضغط', g: '#ffe6d1,#fff1b8' },
  { id: 'sleep', n: 'النوم والروتين', a: ['calm', 'calm_landscape', 'seq', 'time'], d: 'تهدئة في آخر اليوم وترتيب روتينك', g: '#b9b4e8,#E9DFFF' },
  { id: 'soc', n: 'الثقة الاجتماعية', a: ['seq', 'mem'], d: 'تجهيز للمناسبات. تحديات الحوار لسا ما انبنت', g: '#ffd9c2,#E9DFFF' },
  { id: 'aut', n: 'روتين واضح وهادئ', a: ['seq', 'time', 'calm', 'calm_landscape'], d: 'جدول واضح، وحركة وصوت على اختيارك', g: '#dff2e8,#e9e5f7' },
  { id: 'gen', n: 'عافية عامة', a: ['video', 'attention_scene', 'mem', 'calm', 'time', 'calm_landscape', 'emotion_map'], d: 'شوية من كل شي', g: '#fff1b8,#8DBFA3' },
];

export const SHAPES: Record<string, string> = {
  circle: '<circle cx="12" cy="12" r="9"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="4"/>',
  tri: '<path d="M12 3l10 18H2z" stroke-linejoin="round"/>',
  star: '<path d="M12 2l3 7 7 .8-5.3 4.8L18.2 22 12 18l-6.2 4 1.5-7.4L2 9.8 9 9z"/>',
  heart: '<path d="M12 21C4 14 2 10 2 7a5 5 0 0110-1 5 5 0 0110 1c0 3-2 7-10 14z"/>',
  moon: '<path d="M20 14A9 9 0 1110 4a7 7 0 0010 10z"/>',
  drop: '<path d="M12 2s7 7 7 12a7 7 0 01-14 0c0-5 7-12 7-12z"/>',
  leaf: '<path d="M4 20C4 9 10 4 21 3c0 11-5 17-15 17z"/>',
};
export const SHAPE_NAMES: Record<string, string> = { circle: 'دائرة', square: 'مربع', tri: 'مثلث', star: 'نجمة', heart: 'قلب', moon: 'هلال', drop: 'قطرة', leaf: 'ورقة' };
export const COLORS = ['#FF8E83', '#FFD36E', '#8BCDF1', '#A78BFA', '#28785B', '#FFC6A8'];
export const COLOR_NAMES = ['مرجاني', 'أصفر', 'سماوي', 'بنفسجي', 'أخضر', 'خوخي'];
