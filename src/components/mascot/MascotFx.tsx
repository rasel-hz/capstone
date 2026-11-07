import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { MascotState } from './manifest';

const star = (x: number, y: number, r: number, fill: string) => (
  <path key={`${x}-${y}`} className="fx-pop" d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z`} fill={fill} />
);
const heart = (x: number, y: number, s: number, fill: string) => (
  <path key={`h${x}`} className="fx-float" transform={`translate(${x} ${y}) scale(${s})`} d="M0 3C-5-2-9 1-6 5L0 11L6 5C9 1 5-2 0 3z" fill={fill} />
);
const INK = '#263D37';

// Small effects drawn around the character, so moods read differently while the artwork stays one flat image.
// They sit beside the mascot and never touch the approved art. A state with its own clip doesn't use them.
// A component, because FX is built once and this has to follow the language.
function QuestionMark() {
  const { t } = useTranslation();
  return <>{t('common.questionMark')}</>;
}

const FX: Partial<Record<MascotState, ReactNode>> = {
  greeting: (
    <g className="fx-pop" fill="none" stroke="#FFD36E" strokeWidth="3" strokeLinecap="round">
      <path d="M12 44l-7-5M10 56H2M13 68l-7 4" />
    </g>
  ),
  listening: (
    <g className="fx-pulse" fill="none" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round">
      <path d="M86 42q6 8 0 16" />
      <path d="M93 37q10 13 0 26" />
    </g>
  ),
  thinking: (
    <g fill="#A78BFA">
      <circle className="fx-dot" cx="80" cy="30" r="2.5" />
      <circle className="fx-dot fx-d2" cx="87" cy="22" r="3.5" />
      <circle className="fx-dot fx-d3" cx="95" cy="12" r="5" />
    </g>
  ),
  happy: <>{star(14, 28, 6, '#FFD36E')}{star(88, 22, 5, '#FF8E83')}</>,
  celebrating: <>{star(10, 22, 8, '#FFD36E')}{star(90, 16, 7, '#FF8E83')}{star(6, 56, 5, '#8BCDF1')}{star(94, 52, 6, '#A78BFA')}{star(24, 8, 4, '#A78BFA')}</>,
  encouraging: <>{heart(88, 26, 1, '#FF8E83')}{star(12, 32, 5, '#FFD36E')}</>,
  curious: <text className="fx-pop" x="82" y="30" fontSize="26" fontWeight="700" fill="#A78BFA" fontFamily="inherit"><QuestionMark /></text>,
  calm: (
    <g className="fx-ring" fill="none" stroke="#8BCDF1" strokeWidth="2">
      <circle cx="50" cy="52" r="46" />
    </g>
  ),
  resting: (
    <g fontWeight="700" fill="#8BCDF1" fontFamily="inherit">
      <text className="fx-dot" x="78" y="30" fontSize="12">z</text>
      <text className="fx-dot fx-d2" x="85" y="21" fontSize="16">z</text>
      <text className="fx-dot fx-d3" x="93" y="10" fontSize="20">z</text>
    </g>
  ),
  concerned: <>{heart(12, 30, 1, '#FFC6A8')}<path d="M86 30q5 8 0 11q-5-3 0-11z" fill="#8BCDF1" stroke={INK} strokeOpacity=".15" /></>,
};

export const MascotFx = ({ state }: { state: MascotState }) => {
  const fx = FX[state];
  if (!fx) return null;
  return <svg key={state} className="mascot__fx" viewBox="0 0 100 100" aria-hidden="true">{fx}</svg>;
};
