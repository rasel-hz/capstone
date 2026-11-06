import type { MascotState } from './manifest';

// The prototype's drawn mascot, kept only as a fallback if the artwork files fail to load.
const eye = (x: number, y: number, r = 6.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#263D37"/><circle cx="${x + 2}" cy="${y - 2}" r="2.2" fill="#fff"/>`;
const up = '<path d="M38 57q7-10 14 0M68 57q7-10 14 0" stroke="#263D37" stroke-width="4" fill="none" stroke-linecap="round"/>';
const down = '<path d="M38 54q7 8 14 0M68 54q7 8 14 0" stroke="#263D37" stroke-width="4" fill="none" stroke-linecap="round"/>';
const brows = (a: string, b: string) => `<path d="M${a}" stroke="#263D37" stroke-width="3" stroke-linecap="round"/><path d="M${b}" stroke="#263D37" stroke-width="3" stroke-linecap="round"/>`;

const EYES: Record<MascotState, string> = {
  idle: eye(45, 57) + eye(75, 57),
  greeting: up,
  listening: eye(45, 57, 8) + eye(75, 57, 8) + brows('36 42q9-6 18 0', '66 42q9-6 18 0'),
  thinking: eye(48, 52) + eye(78, 52),
  happy: up,
  encouraging: up,
  celebrating: up + '<text x="90" y="30" font-size="16">✨</text><text x="14" y="34" font-size="14">✨</text>',
  curious: eye(45, 57) + eye(75, 57) + brows('36 40q9-8 18-2', '66 44h18'),
  calm: down,
  resting: down + '<text x="88" y="28" font-size="14" fill="#8BCDF1">z</text>',
  concerned: eye(45, 58) + eye(75, 58) + brows('36 44l16-5', '84 44l-16-5'),
};
const MOUTH: Record<MascotState, string> = {
  idle: 'M52 74q8 6 16 0', greeting: 'M50 72q10 13 20 0', listening: 'M56 76q4 4 8 0', thinking: 'M54 77h12',
  happy: 'M50 72q10 13 20 0', encouraging: 'M50 72q10 10 20 0', celebrating: 'M50 71q10 16 20 0z', curious: 'M54 76q6 3 12-1',
  calm: 'M54 74q6 4 12 0', resting: 'M55 75q5 3 10 0', concerned: 'M52 79q8-8 16 0',
};

export function legacySvg(s: MascotState, hat: boolean, id: string): string {
  return `<defs><radialGradient id="${id}" cx=".4" cy=".3"><stop offset="0" stop-color="#d6f1e1"/><stop offset="1" stop-color="#8DBFA3"/></radialGradient></defs><ellipse cx="60" cy="108" rx="28" ry="5" fill="rgba(38,61,55,.12)"/><path d="M60 28q-14-24 8-26 4 16-8 26" fill="#A78BFA"/><circle cx="66" cy="12" r="7" fill="#FFD36E"/><ellipse cx="60" cy="68" rx="46" ry="40" fill="url(#${id})"/><ellipse cx="60" cy="80" rx="28" ry="18" fill="#eafaf0" opacity=".7"/><circle cx="30" cy="68" r="7" fill="#FFC6A8"/><circle cx="90" cy="68" r="7" fill="#FFC6A8"/><circle cx="26" cy="38" r="9" fill="#E9DFFF"/><circle cx="94" cy="38" r="9" fill="#E9DFFF"/>${EYES[s]}<path d="${MOUTH[s]}" stroke="#263D37" stroke-width="4" fill="${s === 'celebrating' ? '#FF8E83' : 'none'}" stroke-linecap="round"/>${hat ? '<path d="M38 34l22-18 22 18z" fill="#FF8E83"/>' : ''}`;
}
