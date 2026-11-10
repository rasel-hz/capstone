import type { ReactNode } from 'react';
import type { ChallengeId, JourneyId } from '../../types';

// Original flat vector art. Everything is drawn from the brand palette, so it stays one family.
const C = { sage: '#8DBFA3', em: '#28785B', lav: '#A78BFA', lil: '#E9DFFF', cor: '#FF8E83', sun: '#FFD36E', sky: '#8BCDF1', pe: '#FFC6A8', iv: '#FFFDF8', cr: '#F8F5EF', ink: '#263D37', sand: '#F3D3A4', deep: '#1F5E48', dusk: '#6C63B8' };

export function Palm({ x, y, s = 1, sway = 0 }: { x: number; y: number; s?: number; sway?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-3 0q-1-22 5-44l5 1q-5 22-3 43z" fill="#A8794F" />
      <g transform={`rotate(${sway} 4 -44)`}>
        <path d="M4-44q-20-10-34 4 18-6 34-4zM4-44q-16-20-34-16 20 2 34 16zM4-44q20-10 34 4-18-6-34-4zM4-44q16-20 34-16-20 2-34 16zM4-44q-2-20 12-28-6 14-12 28z" fill={C.em} />
      </g>
    </g>
  );
}

const Frame = ({ bg, children, label }: { bg: string; children: ReactNode; label?: string }) => (
  <svg className="art" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <rect width="160" height="100" fill={bg} />
    {children}
  </svg>
);

const ART: Record<ChallengeId, ReactNode> = {
  video: (
    <Frame bg="#CFE9FF">
      <circle cx="128" cy="24" r="12" fill={C.sun} />
      <path d="M0 74q40-22 80-6t80-6v38H0z" fill={C.sand} />
      <ellipse cx="50" cy="84" rx="30" ry="6" fill={C.sky} />
      <Palm x={26} y={78} s={0.8} />
      <ellipse cx="88" cy="36" rx="10" ry="12" fill={C.cor} /><path d="M88 48v12" stroke={C.ink} strokeWidth="1" />
      <ellipse cx="112" cy="52" rx="8" ry="10" fill={C.lav} /><path d="M112 62v10" stroke={C.ink} strokeWidth="1" />
      <path d="M52 22q5-7 10 0q5-7 10 0" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Frame>
  ),
  mem: (
    <Frame bg={C.lil}>
      <rect x="22" y="14" width="116" height="72" rx="14" fill={C.iv} />
      <circle cx="48" cy="36" r="11" fill={C.cor} />
      <rect x="69" y="25" width="22" height="22" rx="6" fill={C.sky} />
      <path d="M112 24l12 22h-24z" fill={C.sun} />
      <path d="M48 56c8 6 9 10 0 20c-9-10-8-14 0-20z" fill={C.em} />
      <rect x="69" y="55" width="22" height="22" rx="6" fill="none" stroke={C.lav} strokeWidth="2.5" strokeDasharray="4 4" />
      <path d="M112 54l3.2 7 7.8.8-5.8 5 1.7 7.6-6.9-4-6.9 4 1.7-7.6-5.8-5 7.8-.8z" fill={C.lav} />
    </Frame>
  ),
  seq: (
    <Frame bg="#FFE9D9">
      <rect x="20" y="12" width="120" height="76" rx="12" fill={C.iv} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="124" cy={28 + i * 22} r="8" fill={[C.em, C.sage, C.lil][i]} />
          <rect x="34" y={20 + i * 22} width={[74, 60, 68][i]} height="16" rx="6" fill={[C.pe, C.sun, C.sky][i]} />
        </g>
      ))}
      <path d="M124 36v6M124 58v6" stroke={C.ink} strokeOpacity=".3" strokeWidth="2" />
      <rect x="8" y="56" width="42" height="18" rx="6" fill={C.lav} transform="rotate(-8 29 65)" />
    </Frame>
  ),
  time: (
    <Frame bg="#DDF1FB">
      <circle cx="80" cy="50" r="36" fill={C.iv} />
      <path d="M80 50V14a36 36 0 0 1 31 54z" fill={C.sky} />
      <circle cx="80" cy="50" r="36" fill="none" stroke={C.em} strokeWidth="4" />
      <path d="M80 50V26M80 50l15 9" stroke={C.ink} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="80" cy="50" r="3.5" fill={C.ink} />
      <circle cx="136" cy="22" r="5" fill={C.sun} /><circle cx="22" cy="78" r="7" fill={C.lav} /><circle cx="24" cy="24" r="3.5" fill={C.cor} />
    </Frame>
  ),
  calm: (
    <Frame bg="#DDF1EA">
      <circle cx="80" cy="44" r="34" fill={C.sky} opacity=".28" />
      <circle cx="80" cy="44" r="24" fill={C.sky} opacity=".5" />
      <circle cx="80" cy="44" r="13" fill={C.iv} />
      <path d="M0 82q40-12 80-4t80-4v26H0z" fill={C.sage} />
      <path d="M0 90q40-8 80-2t80-2v14H0z" fill={C.em} opacity=".55" />
    </Frame>
  ),
  start2: (
    <Frame bg="#FFF2CF">
      <circle cx="104" cy="50" r="28" fill={C.iv} />
      <path d="M104 22a28 28 0 1 1-28 28" fill="none" stroke={C.em} strokeWidth="6" strokeLinecap="round" />
      <path d="M95 38l20 12-20 12z" fill={C.em} />
      <rect x="18" y="26" width="42" height="50" rx="8" fill={C.iv} />
      <path d="M27 40h24M27 51h24M27 62h14" stroke={C.ink} strokeOpacity=".3" strokeWidth="3" strokeLinecap="round" />
      <circle cx="58" cy="28" r="9" fill={C.cor} />
      <path d="M54 28l3 3 5-6" stroke={C.iv} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </Frame>
  ),
  attention_scene: (
    <Frame bg="#EDE7FF">
      {[12, 84].map((x, i) => (
        <g key={x}>
          <rect x={x} y="18" width="64" height="64" rx="10" fill={C.iv} />
          <circle cx={x + 46} cy="34" r="8" fill={i ? C.cor : C.sun} />
          <path d={`M${x} 70q32-16 64 0v2a10 10 0 0 1-10 10h-44a10 10 0 0 1-10-10z`} fill={C.sage} />
          <path d={`M${x + 18} 66l10-22 10 22z`} fill={i ? C.lav : C.em} />
        </g>
      ))}
      <circle cx="130" cy="34" r="14" fill="none" stroke={C.ink} strokeWidth="2" strokeDasharray="4 3" />
    </Frame>
  ),
  priority_board: (
    <Frame bg="#E5F3EC">
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={14 + i * 46} y="14" width="40" height="72" rx="9" fill={C.iv} />
          <rect x={20 + i * 46} y="20" width="28" height="6" rx="3" fill={[C.em, C.lav, C.pe][i]} />
        </g>
      ))}
      <rect x="20" y="33" width="28" height="15" rx="5" fill={C.sun} /><rect x="20" y="52" width="28" height="15" rx="5" fill={C.cor} />
      <rect x="66" y="33" width="28" height="15" rx="5" fill={C.sky} />
      <rect x="112" y="33" width="28" height="15" rx="5" fill={C.lil} />
    </Frame>
  ),
  breakdown: (
    <Frame bg="#FFE7E3">
      <rect x="16" y="24" width="52" height="52" rx="12" fill={C.cor} />
      <path d="M72 50h14m-5-5l5 5-5 5" stroke={C.ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={i % 2 ? 118 : 94} y={i < 2 ? 26 : 52} width="20" height="20" rx="6" fill={[C.sun, C.sky, C.lav, C.sage][i]} />)}
    </Frame>
  ),
  study_sprint: (
    <Frame bg="#E6E0FB">
      <path d="M26 70V30q22-8 54 2v42q-30-10-54-4z" fill={C.iv} />
      <path d="M134 70V30q-22-8-54 2v42q30-10 54-4z" fill="#F3EEFF" />
      <path d="M38 42q16-4 30 0M38 52q16-4 30 0M92 42q16-4 30 0" stroke={C.ink} strokeOpacity=".3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="108" cy="58" r="13" fill={C.em} />
      <path d="M108 50v8l5 3" stroke={C.iv} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </Frame>
  ),
  emotion_map: (
    <Frame bg="#FFEFE3">
      <circle cx="50" cy="40" r="20" fill={C.pe} /><circle cx="84" cy="30" r="14" fill={C.lav} opacity=".85" />
      <circle cx="112" cy="50" r="22" fill={C.sky} opacity=".85" /><circle cx="70" cy="66" r="15" fill={C.sun} /><circle cx="38" cy="70" r="9" fill={C.sage} />
      <path d="M20 88h120" stroke={C.ink} strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" /><circle cx="94" cy="88" r="5" fill={C.em} />
    </Frame>
  ),
  eye_rest: (
    <Frame bg="#DDEFFB">
      <path d="M0 58h160" stroke={C.sky} strokeWidth="3" />
      <path d="M0 58q40-10 80-4t80 0v42H0z" fill={C.sand} />
      <circle cx="132" cy="26" r="10" fill={C.sun} />
      <path d="M44 40q36-26 72 0q-36 26-72 0z" fill={C.iv} stroke={C.ink} strokeOpacity=".3" strokeWidth="2" />
      <circle cx="80" cy="40" r="10" fill={C.em} /><circle cx="80" cy="40" r="4" fill={C.ink} /><circle cx="83" cy="37" r="2" fill={C.iv} />
    </Frame>
  ),
  grounding: (
    <Frame bg="#E8F3EC">
      <path d="M0 80q40-10 80-4t80-4v28H0z" fill={C.sage} />
      <circle cx="28" cy="46" r="11" fill={C.em} /><circle cx="58" cy="46" r="10" fill={C.sky} /><circle cx="86" cy="46" r="9" fill={C.lav} />
      <circle cx="111" cy="46" r="8" fill={C.pe} /><circle cx="133" cy="46" r="7" fill={C.sun} />
    </Frame>
  ),
  calm_landscape: (
    <Frame bg="#C9B8F2">
      <circle cx="118" cy="34" r="15" fill={C.sun} />
      <path d="M0 62q40-20 80-6t80-8v52H0z" fill={C.pe} />
      <path d="M0 76q50-14 160 0v24H0z" fill={C.sky} />
      <Palm x={34} y={76} s={0.85} />
      <path d="M92 86q10-4 20 0M104 92q8-3 16 0" stroke={C.iv} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Frame>
  ),
  // Steps getting smaller, ending in one small block with a play mark.
  micro_start: (
    <Frame bg="#FFF2CF">
      {[0, 1, 2, 3].map((i) => <rect key={i} x={18 + i * 26} y={22 + i * 9} width={52 - i * 11} height={56 - i * 18} rx="8" fill={[C.pe, C.sun, C.sage, C.em][i]} opacity={i === 3 ? 1 : 0.85} />)}
      <circle cx="128" cy="50" r="17" fill={C.iv} />
      <path d="M123 41l13 9-13 9z" fill={C.em} />
    </Frame>
  ),
  // Three trays: one with a check, one with a cloud, one with a calendar mark.
  thought_sort: (
    <Frame bg="#E9F2FB">
      {[0, 1, 2].map((i) => <rect key={i} x={14 + i * 46} y="40" width="40" height="44" rx="9" fill={C.iv} />)}
      <path d="M26 62l6 6 10-12" stroke={C.em} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 66a7 7 0 0 1 2-13 9 9 0 0 1 17 2 6 6 0 0 1 1 11z" fill={C.lil} />
      <rect x="114" y="52" width="24" height="20" rx="4" fill={C.pe} /><path d="M114 58h24" stroke={C.iv} strokeWidth="2" />
      <circle cx="56" cy="22" r="9" fill={C.sun} /><circle cx="80" cy="16" r="6" fill={C.sky} /><circle cx="100" cy="24" r="7" fill={C.cor} opacity=".85" />
    </Frame>
  ),
  // Dhikr: quiet scenes for the time of day, no figures and no script.
  // Sunrise over the dunes.
  dhikr_morning: (
    <Frame bg="#FFF0D2">
      <circle cx="80" cy="64" r="22" fill={C.sun} />
      {[-60, -30, 0, 30, 60].map((a) => <path key={a} d="M80 32v-10" stroke={C.sun} strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} 80 64)`} />)}
      <path d="M0 70q40-14 80-4t80-6v40H0z" fill={C.sand} />
      <path d="M0 84q60-10 160 0v16H0z" fill={C.pe} />
    </Frame>
  ),
  // Dusk: the sun low, the first star.
  dhikr_evening: (
    <Frame bg="#C9B8F2">
      <circle cx="104" cy="70" r="18" fill={C.cor} opacity=".9" />
      <path d="M0 72q40-12 80-4t80-8v40H0z" fill={C.dusk} opacity=".55" />
      <path d="M0 86q70-10 160 0v14H0z" fill={C.dusk} />
      <circle cx="40" cy="24" r="2.4" fill={C.iv} /><circle cx="128" cy="18" r="1.8" fill={C.iv} />
    </Frame>
  ),
  // A heart held in two cupped hands of light.
  dhikr_calm_heart: (
    <Frame bg="#E9F5EE">
      <circle cx="80" cy="50" r="34" fill={C.iv} />
      <path d="M80 70c-16-11-24-19-24-28a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 9-8 17-24 28z" fill={C.sage} />
      <path d="M40 74q40 22 80 0" stroke={C.em} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".5" />
    </Frame>
  ),
  // A single leaf on still water.
  dhikr_moment: (
    <Frame bg="#E7F4FB">
      <ellipse cx="80" cy="72" rx="56" ry="10" fill={C.sky} opacity=".6" />
      <path d="M58 64C58 40 80 28 108 26c0 26-16 40-50 38z" fill={C.sage} />
      <path d="M60 62q20-14 44-32" stroke={C.em} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Frame>
  ),
  // An eye resting, looking out of a window at the far horizon.
  eye_break: (
    <Frame bg="#E3F1FB">
      <rect x="92" y="18" width="52" height="56" rx="6" fill={C.iv} />
      <path d="M92 58q26-14 52 0v16H92z" fill={C.sage} />
      <circle cx="128" cy="34" r="6" fill={C.sun} />
      <path d="M22 54q22-22 44 0q-22 22-44 0z" fill={C.iv} />
      <circle cx="44" cy="54" r="8" fill={C.em} />
      <circle cx="47" cy="51" r="2.4" fill={C.iv} />
    </Frame>
  ),
  // Five small marks for the senses around a leaf.
  // A crescent and a few stars over a calm night.
  dhikr_sleep: (
    <Frame bg="#26264A">
      <path d="M96 22a24 24 0 1 0 22 34 19 19 0 1 1-22-34z" fill={C.sun} opacity=".9" />
      {[[30, 24], [52, 40], [130, 74], [24, 70], [140, 30]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" fill={C.iv} opacity=".8" />)}
      <path d="M0 86q80-10 160 0v14H0z" fill={C.dusk} opacity=".6" />
    </Frame>
  ),
};

export const ChallengeArt = ({ id }: { id: ChallengeId }) => <>{ART[id]}</>;

// Wide illustrated headers. Each journey is its own place, within the same art style.
const Wide = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <svg className="art" viewBox="0 0 320 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="130" fill={bg} />
    {children}
  </svg>
);

const JOURNEY_ART: Record<JourneyId, ReactNode> = {
  adhd: (
    <Wide bg="#E5DCFF">
      <circle cx="270" cy="30" r="16" fill={C.sun} />
      <rect x="30" y="66" width="50" height="50" rx="10" fill={C.lav} transform="rotate(-10 55 91)" />
      <rect x="100" y="40" width="44" height="44" rx="10" fill="#C9B8FF" transform="rotate(8 122 62)" />
      <rect x="164" y="72" width="54" height="54" rx="10" fill={C.em} />
      <path d="M46 40q70-40 150 8" stroke={C.ink} strokeOpacity=".35" strokeWidth="3" strokeDasharray="3 8" fill="none" strokeLinecap="round" />
      <path d="M250 124V64" stroke={C.ink} strokeWidth="3" /><path d="M250 64l26 9-26 9z" fill={C.cor} />
    </Wide>
  ),
  anx: (
    <Wide bg="#D8EEF0">
      <circle cx="248" cy="34" r="17" fill={C.sun} opacity=".85" />
      <path d="M0 110L70 40l60 70z" fill={C.sage} /><path d="M90 110l80-74 90 74z" fill={C.em} />
      <path d="M190 110l60-46 70 46z" fill={C.sage} opacity=".8" />
      <path d="M0 106q80-16 160 0t160 0v24H0z" fill="#EAF6F0" />
      <path d="M150 130q-20-14 10-28" stroke={C.sun} strokeWidth="4" fill="none" strokeLinecap="round" />
    </Wide>
  ),
  ocd: (
    <Wide bg="#D9EEF5">
      <path d="M0 62q80-22 160 0t160 0v68H0z" fill={C.sky} />
      <path d="M0 86q80-14 160 0t160 0" stroke={C.iv} strokeOpacity=".7" strokeWidth="3" fill="none" />
      {[[50, 104], [116, 88], [186, 104], [256, 88]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="27" ry="11" fill="#EDF1F2" />)}
    </Wide>
  ),
  mood: (
    <Wide bg="#FFEFCF">
      <circle cx="262" cy="38" r="22" fill={C.sun} />
      <rect y="102" width="320" height="28" fill={C.sage} />
      {[[70, 54], [150, 72], [226, 46]].map(([x, h], i) => (
        <g key={x}>
          <path d={`M${x} 104V${104 - h}`} stroke={C.em} strokeWidth="4" />
          <path d={`M${x} ${124 - h}q-22-3-28-22 22 0 28 22zM${x} ${116 - h}q22-3 28-22-22 0-28 22z`} fill={C.em} />
          <circle cx={x} cy={102 - h} r="7" fill={[C.cor, C.lav, C.pe][i]} />
        </g>
      ))}
    </Wide>
  ),
  sleep: (
    <Wide bg="#4F4A8C">
      <path d="M96 76A36 36 0 1 1 62 22a29 29 0 0 0 34 54z" fill={C.sun} />
      {[[150, 28, 3], [204, 54, 2.5], [252, 22, 3.5], [292, 62, 2], [128, 72, 2]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill={C.iv} />)}
      <path d="M0 110q80-18 160-6t160-6v32H0z" fill={C.dusk} />
    </Wide>
  ),
  soc: (
    <Wide bg="#FFE3D1">
      <rect x="28" y="62" width="70" height="68" fill={C.pe} /><path d="M18 64l45-36 45 36z" fill={C.cor} />
      <rect x="122" y="46" width="78" height="84" fill="#FFF1C4" /><path d="M112 48l49-38 49 38z" fill={C.lav} />
      <rect x="150" y="96" width="22" height="34" rx="11" fill={C.em} />
      <rect x="224" y="72" width="66" height="58" fill={C.sky} /><path d="M216 74l41-32 41 32z" fill={C.em} />
    </Wide>
  ),
  aut: (
    <Wide bg="#E7F3ED">
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={26 + i * 72} y="30" width="56" height="56" rx="14" fill={[C.sky, C.lil, C.sage, C.sun][i]} opacity=".9" />
          <circle cx={54 + i * 72} cy="58" r="11" fill={C.iv} />
        </g>
      ))}
      <path d="M26 108h268" stroke={C.em} strokeOpacity=".55" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" />
    </Wide>
  ),
  gen: (
    <Wide bg="#FFF3CC">
      <circle cx="252" cy="36" r="20" fill={C.sun} />
      <path d="M0 130q90-70 190-26t130-14v40z" fill={C.sage} />
      <path d="M0 130q80-30 180-10t140 10z" fill={C.em} />
      <Palm x={84} y={106} s={1.1} />
    </Wide>
  ),
};

export const JourneyArt = ({ id }: { id: JourneyId }) => <>{JOURNEY_ART[id]}</>;

// The full-width oasis used behind calm moments, completion and the landing hero.
export function OasisBackdrop({ dusk = false, className = '' }: { dusk?: boolean; className?: string }) {
  return (
    <svg className={`oasis ${className}`} viewBox="0 0 800 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="800" height="300" fill={dusk ? '#C9B8F2' : '#D6ECFB'} />
      <circle cx="640" cy="90" r="44" fill={C.sun} />
      <path d="M0 170q200-70 400-20t400-30v180H0z" fill={dusk ? '#E9C3B4' : '#F7DDB6'} />
      <path d="M0 216q200-40 400-14t400-16v114H0z" fill={C.sand} />
      <ellipse cx="400" cy="262" rx="210" ry="26" fill={C.sky} />
      <Palm x={120} y={250} s={1.8} />
      <Palm x={700} y={246} s={1.5} />
    </svg>
  );
}
