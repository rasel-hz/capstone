import { memo } from 'react';
import { Palm } from '../../challenges/ChallengeArt';
import { WORLD_W, type BiomeId, type Chapter, type Decor, type World } from '../world';

// The world is one static drawing. It only redraws when a step is finished, so scrolling costs nothing.
// Colours come from the brand palette, with quieter tints for water and land.
const LOOK: Record<BiomeId, { water: string; deep: string; shore: string; shade: string; grass: string; lawn: string }> = {
  welcome: { water: '#A9E0DE', deep: '#93D3D3', shore: '#F6E2BC', shade: '#E2C794', grass: '#A8CFB3', lawn: '#BADBC3' },
  garden: { water: '#A2DCCF', deep: '#8BCDBF', shore: '#F1DDAE', shade: '#D9BE86', grass: '#8DBFA3', lawn: '#A3CDB3' },
  calm: { water: '#CFCBF2', deep: '#BDB7EA', shore: '#F4E8DA', shade: '#DCC9B6', grass: '#B6D6C4', lawn: '#C9E2D2' },
  hill: { water: '#ADDFEE', deep: '#8BCDF1', shore: '#FFD9BF', shade: '#EDB995', grass: '#BFD6A6', lawn: '#D1E2B9' },
};

function Item({ d }: { d: Decor }) {
  const at = `translate(${d.x} ${d.y}) scale(${d.flip ? -d.s : d.s} ${d.s})`;
  switch (d.t) {
    case 'palm': return <g transform={`translate(${d.x} ${d.y})`}><ellipse cy="1" rx="17" ry="5" fill="#263D37" opacity=".12" /><Palm x={0} y={0} s={d.s * 0.92} sway={d.flip ? 4 : -4} /></g>;
    case 'bush': return <g transform={at}><ellipse cy="9" rx="20" ry="5" fill="#263D37" opacity=".1" /><circle cx="-9" cy="1" r="9" fill="#5FA383" /><circle cx="8" cy="0" r="11" fill="#6BAF8E" /><circle cx="0" cy="-6" r="10" fill="#7EBD9C" /></g>;
    case 'rock': return <g transform={at}><ellipse cy="10" rx="19" ry="5" fill="#263D37" opacity=".1" /><path d="M-16 9c-3-9 3-17 11-19 9-3 18 3 20 11 1 5-2 9-6 9h-22c-1 0-2 0-3-1z" fill="#C9BFAE" /><path d="M-9-7c6-4 15-2 18 5-7-3-12-3-18-5z" fill="#E2DACB" /></g>;
    case 'flower': return <g transform={at}><path d="M-11 9q1-9 2-14M0 9V-9M11 9q-1-8-3-13" stroke="#28785B" strokeWidth="2.2" fill="none" strokeLinecap="round" /><circle cx="-9" cy="-7" r="4.4" fill="#FF8E83" /><circle cy="-12" r="4.8" fill="#FFD36E" /><circle cx="8" cy="-6" r="4.2" fill="#A78BFA" /></g>;
    case 'hedge': return <g transform={at}><ellipse cy="10" rx="24" ry="5" fill="#263D37" opacity=".1" /><rect x="-22" y="-7" width="44" height="17" rx="8" fill="#5FA383" /><circle cx="-10" cy="-3" r="2.3" fill="#FFC6A8" /><circle cx="4" cy="-1" r="2.3" fill="#FFD36E" /><circle cx="14" cy="-4" r="2.3" fill="#FFC6A8" /></g>;
    case 'reed': return <g transform={at}><path d="M-7 10q-2-14-5-23M0 10V-18M7 10q2-14 6-21" stroke="#5FA383" strokeWidth="2.6" fill="none" strokeLinecap="round" /><rect x="-15" y="-22" width="5" height="11" rx="2.5" fill="#A8794F" /><rect x="-2.5" y="-27" width="5" height="11" rx="2.5" fill="#A8794F" /><rect x="11" y="-24" width="5" height="11" rx="2.5" fill="#A8794F" /></g>;
    case 'lily': return <g transform={at}><path d="M-18 0a14 8 0 1 0 28-1l-13 1z" fill="#6BAF8E" /><path d="M6 8a10 6 0 1 0 20-1l-9 1z" fill="#7EBD9C" /><circle cx="-5" cy="-2" r="4.4" fill="#FFC6A8" /><circle cx="-5" cy="-2" r="1.9" fill="#FFD36E" /></g>;
    case 'ripple': return <g transform={at} fill="none" stroke="#FFFDF8" strokeOpacity=".62" strokeWidth="2.4" strokeLinecap="round"><g className="jw__rip"><path d="M-20-4q7-5 13 0t13 0" /><path d="M-6 7q6-4 12 0t12 0" /></g></g>;
    case 'stones': return <g transform={at}><ellipse cx="-13" cy="-5" rx="10" ry="6" fill="#E2DACB" /><ellipse cx="6" cy="2" rx="12" ry="7" fill="#D6CCBC" /><ellipse cx="-4" cy="14" rx="8" ry="5" fill="#E2DACB" /></g>;
    case 'islet': return <g transform={at}><ellipse rx="27" ry="12" cy="4" fill="#F1DDAE" /><ellipse rx="20" ry="8" cy="2" fill="#A3CDB3" /><Palm x={2} y={3} s={0.56} sway={-3} /></g>;
  }
}

function Scenery({ c }: { c: Chapter }) {
  const y = c.bannerY + 44;
  if (c.biome === 'hill') return <path d={`M0 ${y + 34}q55-66 112-22q56-68 128-10q66-54 150 26v22H0z`} fill="#E9DFFF" opacity=".85" />;
  if (c.biome === 'calm') return <g><circle cx="322" cy={y - 2} r="19" fill="#FFFDF8" opacity=".9" /><circle cx="330" cy={y - 7} r="16" fill={LOOK.calm.water} /><path d={`M18 ${y + 8}l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z`} fill="#FFFDF8" opacity=".85" /></g>;
  if (c.biome === 'garden') return <g><circle cx="58" cy={y + 2} r="22" fill="#FFD36E" opacity=".85" /><path d={`M250 ${y + 26}q44-34 88-8q30-14 52 6v20H250z`} fill="#8DBFA3" opacity=".55" /></g>;
  return <path d={`M0 ${y + 24}q66-38 118-6q60-30 110 2H0z`} fill="#F6E2BC" opacity=".9" />;
}

export const OasisWorld = memo(function OasisWorld({ world, doneKeys }: { world: World; doneKeys: string }) {
  const done = new Set(doneKeys.split('|'));
  return (
    <svg className="jw__art" viewBox={`0 0 ${WORLD_W} ${world.height}`} aria-hidden="true" focusable="false">
      {world.chapters.map((c, i) => {
        const L = LOOK[c.biome];
        const top = i === 0 ? 0 : c.top - 60;
        return (
          <g key={c.ch}>
            <rect x="0" y={top} width={WORLD_W} height={c.bottom - top + 2} fill={L.water} />
            {i > 0 && <path d={`M0 ${top}q48 18 98 0t98 0 98 0 96 0v-18H0z`} fill={LOOK[world.chapters[i - 1].biome].water} />}
            <Scenery c={c} />
            <path d={c.land} fill="none" stroke={L.deep} strokeWidth="196" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
            <path d={c.land} fill="none" stroke={L.shade} strokeWidth="174" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 6)" />
            <path d={c.land} fill="none" stroke={L.shore} strokeWidth="170" strokeLinecap="round" strokeLinejoin="round" />
            <path d={c.land} fill="none" stroke={L.grass} strokeWidth="140" strokeLinecap="round" strokeLinejoin="round" />
            <path d={c.land} fill="none" stroke={L.lawn} strokeWidth="96" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}

      {world.segments.filter((s) => s.bridge).map((s) => (
        <g key={s.from} fill="none">
          <path d={s.d} stroke="#A8794F" strokeWidth="34" strokeLinecap="round" />
          <path d={s.d} stroke="#E5C79B" strokeWidth="28" strokeDasharray="10 5" />
        </g>
      ))}
      {world.segments.filter((s) => !s.bridge).map((s) => <path key={s.from} d={s.d} fill="none" stroke="#FFF6E2" strokeWidth="24" strokeLinecap="round" />)}
      {world.segments.map((s) => (done.has(s.from)
        ? <path key={`d${s.from}`} d={s.d} fill="none" stroke="#28785B" strokeWidth="7" strokeLinecap="round" />
        : <path key={`u${s.from}`} d={s.d} fill="none" stroke="#C9B48C" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 15" />))}

      {world.chapters.flatMap((c) => c.decor.map((d, i) => <Item key={`${c.ch}-${i}`} d={d} />))}
    </svg>
  );
});
