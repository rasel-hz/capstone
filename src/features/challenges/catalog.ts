import type { Challenge, ChallengeId, Journey } from '../../types';

export const CHALLENGES: Record<ChallengeId, Challenge> = {
  video: { t: 'ركز معي شوي', cat: 'تركيز', min: 1, xp: 30, k: 'v' },
  mem: { t: 'وش تتذكر؟', cat: 'ذاكرة', min: 2, xp: 25, k: 'm' },
  seq: { t: 'رتبها يا وحش', cat: 'تخطيط', min: 2, xp: 25, k: 's' },
  time: { t: 'وين راح الوقت؟', cat: 'وعي بالوقت', min: 1, xp: 20, k: 't' },
  calm: { t: 'على هونك', cat: 'استرخاء', min: 2, xp: 15, k: 'c' },
  start2: { t: 'دقيقتين ونبدأ', cat: 'مهمة حقيقية', min: 2, xp: 25, k: 'd' },
};

export const INSTRUCTIONS: Record<ChallengeId, string> = {
  video: 'بتشوف مقطع قصير من الواحة. انتبه لتفاصيله، وبعدها أسألك.',
  mem: 'احفظ الأشكال وألوانها، وبعدها قلّي وش اختفى.',
  seq: 'رتّب الخطوات بالترتيب المنطقي. اسحبها أو اضغط عليها.',
  time: 'قدّر كم ثانية بتاخذ منك مهمة بسيطة، وبعدها نشوف.',
  calm: 'تنفّس معي على هونك.',
  start2: 'نختار مهمة مؤجلة ونبدأها بخطوة صغيرة.',
};

export const JOURNEYS: Journey[] = [
  { id: 'adhd', n: 'التركيز والتنظيم', a: ['video', 'seq', 'time', 'mem', 'start2'], d: 'مكعبات عايمة وألغاز هادية', g: '#E9DFFF,#c9b8ff' },
  { id: 'anx', n: 'الهدوء والقلق', a: ['calm', 'video', 'mem'], d: 'ممرات جبلية وضوء ناعم', g: '#d9f0e0,#bfe4ff' },
  { id: 'ocd', n: 'التعامل مع عدم اليقين', a: ['calm', 'time'], d: 'أحجار عبور وماء جاري. محتوى تثقيفي فقط، وأي برنامج علاجي يكون مع مختص', g: '#cdeaf2,#e3f3ee' },
  { id: 'mood', n: 'المزاج والحماس', a: ['start2', 'calm', 'seq'], d: 'حديقة صغيرة تكبر شوي شوي', g: '#ffe6d1,#fff1b8' },
  { id: 'sleep', n: 'النوم والروتين', a: ['calm', 'seq', 'time'], d: 'ضوء قمر ونجوم', g: '#b9b4e8,#E9DFFF' },
  { id: 'soc', n: 'الثقة الاجتماعية', a: ['seq', 'mem'], d: 'حي ودود ومجالس', g: '#ffd9c2,#E9DFFF' },
  { id: 'aut', n: 'روتين واضح وهادئ', a: ['seq', 'time', 'calm'], d: 'مساحات مريحة للحواس وجدول مرئي', g: '#dff2e8,#e9e5f7' },
  { id: 'gen', n: 'عافية عامة', a: ['video', 'mem', 'calm', 'time'], d: 'شوية من كل شي', g: '#fff1b8,#8DBFA3' },
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
export const COLORS = ['#FF8E83', '#FFD36E', '#8BCDF1', '#A78BFA', '#28785B', '#FFC6A8'];
export const COLOR_NAMES = ['مرجاني', 'أصفر', 'سماوي', 'بنفسجي', 'أخضر', 'خوخي'];

export const SCENES: Record<string, string> = {
  adhd: '<rect x="40" y="40" width="34" height="34" rx="6" fill="#A78BFA" transform="rotate(-12 57 57)"/><rect x="85" y="20" width="30" height="30" rx="6" fill="#c9b8ff" transform="rotate(10 100 35)"/><rect x="120" y="48" width="38" height="38" rx="6" fill="#8e6df0"/><path d="M165 20v34" stroke="#28785B" stroke-width="3"/><path d="M165 20l20 7-20 7z" fill="#FF8E83"/>',
  anx: '<path d="M0 90L50 30l40 60z" fill="#8DBFA3"/><path d="M70 90l50-55 50 55z" fill="#28785B"/><path d="M100 90q30-20 10-40" stroke="#FFD36E" stroke-width="4" fill="none"/><circle cx="165" cy="22" r="12" fill="#FFD36E"/>',
  ocd: '<path d="M0 55q50-12 100 0t100 0v35H0z" fill="#8BCDF1"/><ellipse cx="45" cy="70" rx="24" ry="9" fill="#e9eef0"/><ellipse cx="100" cy="58" rx="22" ry="8" fill="#e9eef0"/><ellipse cx="150" cy="72" rx="24" ry="9" fill="#e9eef0"/>',
  mood: '<rect y="68" width="200" height="22" fill="#8DBFA3"/><path d="M100 70V42" stroke="#28785B" stroke-width="4"/><path d="M100 50q-26-4-30-24 24 0 30 24zM100 44q26-4 30-24-24 0-30 24z" fill="#3a9a76"/><circle cx="160" cy="20" r="10" fill="#FFD36E"/>',
  sleep: '<path d="M60 60A26 26 0 1137 24a20 20 0 0023 36z" fill="#FFD36E"/><circle cx="110" cy="22" r="3" fill="#fff"/><circle cx="150" cy="40" r="2.5" fill="#fff"/><circle cx="175" cy="18" r="3" fill="#fff"/><circle cx="130" cy="60" r="2" fill="#fff"/><rect y="74" width="200" height="16" fill="#6c63b8"/>',
  soc: '<rect x="20" y="42" width="44" height="44" fill="#FFC6A8"/><path d="M14 44l28-24 28 24z" fill="#FF8E83"/><rect x="84" y="30" width="50" height="56" fill="#FFF1B8"/><path d="M78 32l31-26 31 26z" fill="#A78BFA"/><rect x="150" y="48" width="38" height="38" fill="#bfe4ff"/>',
  aut: '<circle cx="50" cy="48" r="26" fill="#bfe4ff"/><circle cx="110" cy="40" r="22" fill="#E9DFFF"/><circle cx="160" cy="55" r="24" fill="#dff2e8"/><path d="M10 82h180" stroke="#8DBFA3" stroke-dasharray="4 8" stroke-width="3"/>',
  gen: '<circle cx="150" cy="24" r="14" fill="#FFD36E"/><path d="M0 90q60-40 120 0z" fill="#28785B"/><path d="M60 62V34" stroke="#8a5a3a" stroke-width="4"/><path d="M60 34q-20-2-26 10M60 34q20-2 26 10M60 34q0-18 12-20" stroke="#3a9a76" stroke-width="4" fill="none"/>',
};
