import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimers } from '../../../hooks/useTimers';
import { tr, type Msg } from '../../../i18n';
import { useAppState } from '../../../context/AppStateContext';
import { lastAccuracy } from '../../mission/planner';
import { Palm } from '../ChallengeArt';
import type { GameProps } from '../types';
import { HintButton } from './parts';

// A difference is a new colour, a moved object, a missing one, or something new that wasn't there before.
// Which objects change, and how, is picked fresh each round, and every object sits a little differently each
// time, so the scene can't be learned by heart.
type Change = { kind: 'color'; color: string } | { kind: 'gone' } | { kind: 'move'; dx: number; dy: number } | { kind: 'add' };
interface Obj { id: string; x: number; y: number; w: number; h: number; color: string; draw(color: string): ReactNode }
interface SceneDef { id: string; bg: ReactNode; objects: Obj[]; /** Things that can appear only in the second picture. */ extras: Obj[] }

const PALETTE = ['#FF8E83', '#FFD36E', '#8BCDF1', '#A78BFA', '#28785B', '#FFC6A8', '#FFFFFF', '#E07A3B'];

const OASIS: SceneDef = {
  id: 'oasis',
  bg: <><rect width="320" height="200" fill="#CFE9FF" /><path d="M0 130q80-30 160-8t160-12v90H0z" fill="#F7DDB6" /><ellipse cx="170" cy="172" rx="90" ry="14" fill="#8BCDF1" /></>,
  objects: [
    { id: 'sun', x: 262, y: 36, w: 44, h: 44, color: '#FFD36E', draw: (c) => <circle r="20" fill={c} /> },
    { id: 'cloud', x: 96, y: 40, w: 64, h: 30, color: '#FFFFFF', draw: (c) => <g fill={c}><ellipse cx="-12" rx="20" ry="9" /><ellipse cx="10" cy="-4" rx="18" ry="11" /></g> },
    { id: 'palm', x: 46, y: 118, w: 64, h: 92, color: '', draw: () => <Palm x={0} y={40} s={1.1} /> },
    { id: 'tent', x: 252, y: 132, w: 66, h: 50, color: '#A78BFA', draw: (c) => <path d="M-30 22L0-20l30 42z" fill={c} /> },
    { id: 'bird', x: 180, y: 70, w: 44, h: 26, color: '#263D37', draw: (c) => <path d="M-16 0q8-10 16 0q8-10 16 0" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" /> },
    { id: 'flower', x: 130, y: 142, w: 28, h: 28, color: '#FF8E83', draw: (c) => <g><path d="M0 12v-10" stroke="#28785B" strokeWidth="2.5" /><circle cy="-4" r="7" fill={c} /></g> },
    { id: 'rock', x: 206, y: 150, w: 34, h: 22, color: '#B9AFA3', draw: (c) => <ellipse rx="15" ry="9" fill={c} /> },
  ],
  extras: [
    { id: 'camel', x: 300, y: 112, w: 40, h: 34, color: '#C69C6D', draw: (c) => <g fill={c} transform="scale(.6)"><ellipse rx="24" ry="12" /><ellipse cx="-2" cy="-11" rx="11" ry="8" /><path d="M-20-4q-11-9-13-24l6-2q4 11 13 18z" /><rect x="-18" y="8" width="4" height="18" /><rect x="14" y="8" width="4" height="18" /></g> },
  ],
};

const MAJLIS: SceneDef = {
  id: 'majlis',
  bg: <><rect width="320" height="200" fill="#FFF3E3" /><rect y="150" width="320" height="50" fill="#E9C9A3" /><rect x="118" y="24" width="84" height="66" rx="42" fill="#CFE9FF" /><path d="M160 24v66M118 62h84" stroke="#fff" strokeWidth="4" /></>,
  objects: [
    { id: 'dallah', x: 160, y: 142, w: 44, h: 50, color: '#FFD36E', draw: (c) => <g fill={c}><path d="M-11 22q-5-24 6-34h10q11 10 6 34z" /><path d="M-11-2l-11-9 3 13z" /><circle cy="-16" r="3.5" /></g> },
    { id: 'cup', x: 210, y: 158, w: 28, h: 22, color: '#FFFFFF', draw: (c) => <path d="M-11-7h22l-4 15h-14z" fill={c} stroke="#263D37" strokeOpacity=".3" /> },
    { id: 'dates', x: 106, y: 162, w: 52, h: 24, color: '#A8794F', draw: (c) => <g><ellipse rx="23" ry="6" cy="5" fill="#fff" /><ellipse cx="-9" rx="6" ry="4" fill={c} /><ellipse cx="3" cy="-2" rx="6" ry="4" fill={c} /><ellipse cx="11" cy="2" rx="6" ry="4" fill={c} /></g> },
    { id: 'lamp', x: 48, y: 40, w: 36, h: 56, color: '#FF8E83', draw: (c) => <g><path d="M0-30V-12" stroke="#263D37" strokeWidth="2" /><rect x="-12" y="-12" width="24" height="30" rx="7" fill={c} /></g> },
    { id: 'cushion', x: 268, y: 130, w: 60, h: 42, color: '#28785B', draw: (c) => <rect x="-26" y="-17" width="52" height="34" rx="12" fill={c} /> },
    { id: 'frame', x: 270, y: 52, w: 46, h: 40, color: '#A78BFA', draw: (c) => <g><rect x="-19" y="-16" width="38" height="32" rx="3" fill="#fff" stroke={c} strokeWidth="4" /><circle r="6" fill={c} /></g> },
    { id: 'plant', x: 36, y: 142, w: 40, h: 52, color: '#8DBFA3', draw: (c) => <g><rect x="-10" y="6" width="20" height="16" rx="3" fill="#FF8E83" /><path d="M0 6q-16-10-13-24 11 6 13 24zM0 6q16-10 13-24-11 6-13 24z" fill={c} /></g> },
  ],
  extras: [
    { id: 'incense', x: 236, y: 120, w: 26, h: 34, color: '#B5446E', draw: (c) => <g><path d="M-8 12h16l-3-14h-10z" fill={c} /><path d="M0-4q-6-8 0-14q6-6 0-12" stroke="#B9AFA3" strokeWidth="2" fill="none" /></g> },
  ],
};

const SOUQ: SceneDef = {
  id: 'souq',
  bg: <><rect width="320" height="200" fill="#FDE9D0" /><rect y="150" width="320" height="50" fill="#D9B48A" /><path d="M0 0h320v26l-20 12-20-12-20 12-20-12-20 12-20-12-20 12-20-12-20 12-20-12-20 12-20-12-20 12-20-12-20 12-20-12z" fill="#E07A3B" opacity=".55" /></>,
  objects: [
    { id: 'spice', x: 60, y: 146, w: 46, h: 40, color: '#E07A3B', draw: (c) => <g><rect x="-20" y="6" width="40" height="14" rx="3" fill="#A8794F" /><path d="M-16 6l16-24 16 24z" fill={c} /></g> },
    { id: 'jar', x: 118, y: 150, w: 34, h: 44, color: '#C98B5E', draw: (c) => <path d="M-8-20h16v6q10 6 8 20t-16 16q-14-2-16-16t8-20z" fill={c} /> },
    { id: 'carpet', x: 250, y: 92, w: 70, h: 60, color: '#B5446E', draw: (c) => <g><rect x="-30" y="-26" width="60" height="52" fill={c} /><rect x="-22" y="-18" width="44" height="36" fill="none" stroke="#FFD36E" strokeWidth="3" /></g> },
    { id: 'basket', x: 182, y: 160, w: 50, h: 28, color: '#C69C6D', draw: (c) => <g><ellipse rx="22" ry="10" fill={c} /><ellipse cy="-6" rx="16" ry="5" fill="#FF8E83" /></g> },
    { id: 'shoplamp', x: 150, y: 56, w: 30, h: 50, color: '#FFD36E', draw: (c) => <g><path d="M0-28V-12" stroke="#263D37" strokeWidth="2" /><path d="M-10-12h20l-4 26h-12z" fill={c} /></g> },
    { id: 'sign', x: 60, y: 70, w: 64, h: 30, color: '#28785B', draw: (c) => <g><rect x="-28" y="-12" width="56" height="24" rx="5" fill={c} /><path d="M-16 0h32" stroke="#fff" strokeWidth="3" /></g> },
    { id: 'bag', x: 290, y: 160, w: 34, h: 38, color: '#8BCDF1', draw: (c) => <g><path d="M-12-6h24l-3 22h-18z" fill={c} /><path d="M-6-6q6-12 12 0" stroke={c} strokeWidth="3" fill="none" /></g> },
  ],
  extras: [
    { id: 'cat', x: 230, y: 168, w: 34, h: 30, color: '#B9AFA3', draw: (c) => <g fill={c}><ellipse rx="12" ry="9" /><circle cx="-10" cy="-9" r="6" /><path d="M-15-14l2-6 3 5zM-8-15l3-5 1 6z" /><path d="M12 2q10-2 8-12" stroke={c} strokeWidth="3" fill="none" /></g> },
  ],
};

const NIGHT: SceneDef = {
  id: 'night',
  bg: <><rect width="320" height="200" fill="#2E2A5A" /><path d="M0 140q80-34 160-10t160-14v84H0z" fill="#5B4E8C" /><path d="M0 170q90-20 180-4t140-6v40H0z" fill="#4A3F78" /></>,
  objects: [
    { id: 'moon', x: 262, y: 40, w: 40, h: 40, color: '#FFD36E', draw: (c) => <path d="M10-16A18 18 0 1 0 10 16a14 14 0 0 1 0-32z" fill={c} /> },
    { id: 'star1', x: 60, y: 30, w: 26, h: 26, color: '#FFFDF8', draw: (c) => <path d="M0-9l2.6 6 6.4.6-4.8 4.4 1.4 6.4L0 5 -5.6 8.4 -4.2 2 -9-2.4l6.4-.6z" fill={c} /> },
    { id: 'star2', x: 170, y: 54, w: 26, h: 26, color: '#FFFDF8', draw: (c) => <path d="M0-9l2.6 6 6.4.6-4.8 4.4 1.4 6.4L0 5 -5.6 8.4 -4.2 2 -9-2.4l6.4-.6z" fill={c} /> },
    { id: 'fire', x: 150, y: 156, w: 40, h: 40, color: '#FF8E83', draw: (c) => <g><path d="M-14 14h28" stroke="#A8794F" strokeWidth="5" strokeLinecap="round" /><path d="M0 10q-12-6-6-20 2 8 6 6-2-10 6-16 0 10 6 14 4 10-12 16z" fill={c} /></g> },
    { id: 'nighttent', x: 64, y: 136, w: 66, h: 50, color: '#A78BFA', draw: (c) => <path d="M-30 22L0-20l30 42z" fill={c} /> },
    { id: 'lantern', x: 230, y: 150, w: 28, h: 40, color: '#FFD36E', draw: (c) => <g><rect x="-9" y="-12" width="18" height="24" rx="6" fill={c} /><path d="M0-20v8" stroke="#FFFDF8" strokeWidth="2" /></g> },
    { id: 'kettle', x: 190, y: 164, w: 30, h: 30, color: '#B9AFA3', draw: (c) => <g fill={c}><ellipse rx="11" ry="9" /><path d="M10-2l9-6-2 8z" /><rect x="-4" y="-14" width="8" height="5" rx="2" /></g> },
  ],
  extras: [
    { id: 'owl', x: 290, y: 120, w: 30, h: 34, color: '#C69C6D', draw: (c) => <g><ellipse rx="11" ry="14" fill={c} /><circle cx="-5" cy="-5" r="4" fill="#FFFDF8" /><circle cx="5" cy="-5" r="4" fill="#FFFDF8" /></g> },
  ],
};

const KITCHEN: SceneDef = {
  id: 'kitchen',
  bg: <><rect width="320" height="200" fill="#FFF7EC" /><rect y="132" width="320" height="68" fill="#E9C9A3" /><rect y="126" width="320" height="8" fill="#C69C6D" /><rect x="200" y="20" width="92" height="64" rx="6" fill="#CFE9FF" /><path d="M246 20v64" stroke="#fff" strokeWidth="4" /></>,
  objects: [
    { id: 'pot', x: 60, y: 108, w: 56, h: 40, color: '#FF8E83', draw: (c) => <g><rect x="-22" y="-12" width="44" height="26" rx="6" fill={c} /><path d="M-28-8h6M22-8h6" stroke={c} strokeWidth="4" strokeLinecap="round" /></g> },
    { id: 'mug', x: 140, y: 112, w: 32, h: 30, color: '#8BCDF1', draw: (c) => <g><rect x="-10" y="-11" width="20" height="22" rx="4" fill={c} /><path d="M10-5q8 0 8 6t-8 6" stroke={c} strokeWidth="3" fill="none" /></g> },
    { id: 'plate', x: 200, y: 160, w: 50, h: 20, color: '#FFFFFF', draw: (c) => <ellipse rx="22" ry="7" fill={c} stroke="#263D37" strokeOpacity=".25" /> },
    { id: 'clock', x: 100, y: 46, w: 40, h: 40, color: '#A78BFA', draw: (c) => <g><circle r="17" fill="#fff" stroke={c} strokeWidth="4" /><path d="M0 0V-10M0 0h7" stroke="#263D37" strokeWidth="2.5" strokeLinecap="round" /></g> },
    { id: 'fruit', x: 262, y: 112, w: 56, h: 30, color: '#FFD36E', draw: (c) => <g><path d="M-24 0h48q-4 14-24 14t-24-14z" fill="#C69C6D" /><circle cx="-9" cy="-4" r="7" fill={c} /><circle cx="5" cy="-6" r="7" fill="#FF8E83" /><circle cx="16" cy="-2" r="6" fill="#8DBFA3" /></g> },
    { id: 'towel', x: 34, y: 170, w: 34, h: 40, color: '#28785B', draw: (c) => <g><rect x="-12" y="-16" width="24" height="32" rx="3" fill={c} /><path d="M-12-6h24" stroke="#fff" strokeWidth="3" /></g> },
    { id: 'jarK', x: 300, y: 164, w: 26, h: 36, color: '#E07A3B', draw: (c) => <g><rect x="-10" y="-10" width="20" height="24" rx="4" fill={c} /><rect x="-11" y="-15" width="22" height="6" rx="2" fill="#A8794F" /></g> },
  ],
  extras: [
    { id: 'spoon', x: 168, y: 162, w: 34, h: 16, color: '#B9AFA3', draw: (c) => <g fill={c}><ellipse cx="-10" rx="7" ry="5" /><rect x="-4" y="-1.5" width="22" height="3" rx="1.5" /></g> },
  ],
};

const SCENES: SceneDef[] = [OASIS, MAJLIS, SOUQ, NIGHT, KITCHEN];
const LAST_KEY = 'kw-scene-last';

type Rand = () => number;
const between = (lo: number, hi: number, r: Rand) => lo + r() * (hi - lo);

interface Round { scene: SceneDef; objs: Obj[]; changes: Map<string, Change>; added: Obj | null }

/** A round: every object nudged a little, and `count` differences of random kinds. Pure, so it can be tested. */
export function makeRound(scene: SceneDef, count: number, r: Rand = Math.random): Round {
  const objs = scene.objects.map((o) => ({ ...o, x: o.x + between(-8, 8, r), y: o.y + between(-6, 6, r) }));
  const order = [...objs].sort(() => r() - 0.5);
  const changes = new Map<string, Change>();
  let added: Obj | null = null;
  for (const o of order) {
    if (changes.size + (added ? 1 : 0) >= count) break;
    const kinds: Change['kind'][] = ['move', 'gone', ...(o.color ? ['color' as const] : []), ...(!added && scene.extras.length ? ['add' as const] : [])];
    const kind = kinds[Math.floor(r() * kinds.length)];
    if (kind === 'add') {
      const e = scene.extras[Math.floor(r() * scene.extras.length)];
      added = { ...e, x: e.x + between(-6, 6, r), y: e.y + between(-4, 4, r) };
    } else if (kind === 'color') {
      const others = PALETTE.filter((c) => c.toLowerCase() !== o.color.toLowerCase());
      changes.set(o.id, { kind: 'color', color: others[Math.floor(r() * others.length)] });
    } else if (kind === 'move') {
      // Far enough to notice, and still inside the picture.
      const dx = (r() < 0.5 ? -1 : 1) * between(30, 55, r);
      const dy = between(-10, 10, r);
      const nx = Math.min(300, Math.max(20, o.x + dx));
      changes.set(o.id, { kind: 'move', dx: nx - o.x, dy });
    } else changes.set(o.id, { kind: 'gone' });
  }
  return { scene, objs, changes, added };
}

/** How many differences: easy is 2; otherwise 2 to 4, from how the last round went. */
export function diffCount(easy: boolean, lastAcc: number | null) {
  if (easy) return 2;
  if (lastAcc == null) return 3;
  return lastAcc >= 90 ? 4 : lastAcc >= 60 ? 3 : 2;
}

function pickScenes(n: number): SceneDef[] {
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_KEY);
  } catch {
    // A repeat is just less likely to be avoided.
  }
  const pool = [...SCENES].sort(() => Math.random() - 0.5);
  const first = pool.find((x) => x.id !== last) ?? pool[0];
  const picked = [first, ...pool.filter((x) => x !== first)].slice(0, n);
  try {
    localStorage.setItem(LAST_KEY, picked[picked.length - 1].id);
  } catch {
    // Optional.
  }
  return picked;
}

const name = (id: string) => tr(`games.attention.objects.${id}`);

const place = (o: Obj, ch: Change | undefined) => {
  if (ch?.kind === 'gone') return null;
  const c = ch?.kind === 'color' ? ch.color : o.color;
  const dx = ch?.kind === 'move' ? ch.dx : 0;
  const dy = ch?.kind === 'move' ? ch.dy : 0;
  return <g key={o.id} transform={`translate(${o.x + dx} ${o.y + dy})`}>{o.draw(c)}</g>;
};

// A moved object can be tapped where it was or where it went, so its target covers both places.
// These positions follow the drawing, which isn't mirrored, so they stay physical in both languages.
function hitStyle(o: Obj, ch: Change | undefined) {
  const dx = ch?.kind === 'move' ? ch.dx : 0;
  const dy = ch?.kind === 'move' ? ch.dy : 0;
  const left = Math.min(o.x, o.x + dx) - o.w / 2;
  const top = Math.min(o.y, o.y + dy) - o.h / 2;
  return {
    left: `${(left / 320) * 100}%`,
    top: `${(top / 200) * 100}%`,
    width: `${((o.w + Math.abs(dx)) / 320) * 100}%`,
    height: `${((o.h + Math.abs(dy)) / 200) * 100}%`,
  };
}

export function AttentionSceneGame({ diff, env, onDone }: GameProps) {
  const { t } = useTranslation();
  const s = useAppState();
  const easy = diff === 'easy';
  const [count] = useState(() => diffCount(easy, lastAccuracy(s, 'attention_scene')));
  const [scenes] = useState(() => pickScenes(easy ? 1 : 2));
  const timers = useTimers(env.paused);
  const [idx, setIdx] = useState(0);
  const round = useMemo(() => makeRound(scenes[idx], count), [scenes, idx, count]);
  const scene = round.scene;
  const isDiff = (id: string) => round.changes.has(id) || round.added?.id === id;
  const [found, setFound] = useState<string[]>([]);
  const [miss, setMiss] = useState<string | null>(null);
  const [hint, setHint] = useState<Msg | null>(null);
  const totals = useRef({ found: 0, misses: 0, hints: 0 });
  const targets = round.added ? [...round.objs, round.added] : round.objs;

  useEffect(() => {
    env.round(idx + 1, scenes.length, 'games.common.scene');
    env.say('curious', () => tr('games.attention.intro', { count }));
    setFound([]);
    setHint(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  function tap(o: Obj) {
    if (found.includes(o.id)) return;
    if (isDiff(o.id)) {
      const next = [...found, o.id];
      setFound(next);
      setHint(null);
      setMiss(null);
      totals.current.found++;
      env.sfx('ok');
      if (next.length === count) {
        env.say('happy', 'games.attention.allFound');
        timers.after(() => {
          if (idx + 1 < scenes.length) {
            setIdx(idx + 1);
          } else {
            const c = totals.current;
            // Share of tries that were right. Hints count as a try, because they helped.
            const tries = c.found + c.misses + c.hints;
            onDone({ acc: Math.round((c.found / tries) * 100), retries: c.misses, note: () => tr('games.attention.note', { found: c.found, misses: c.misses }), data: { found: c.found, misses: c.misses, hints: c.hints, count, scenes: scenes.map((x) => x.id) } });
          }
        }, 1100);
      } else {
        const remaining = count - next.length;
        env.say('happy', () => tr('games.attention.left', { count: remaining }));
      }
    } else {
      totals.current.misses++;
      setMiss(o.id);
      env.sfx('bad');
      env.say('encouraging', () => tr('games.attention.same', { item: name(o.id) }));
    }
  }

  function askHint() {
    const o = targets.find((x) => isDiff(x.id) && !found.includes(x.id));
    if (!o) return;
    totals.current.hints++;
    const side = o.x > 160 ? 'right' : 'left';
    const level = o.y > 100 ? 'bottom' : 'top';
    setHint(() => () => tr(`games.attention.hints.${side}_${level}`));
  }

  const hintText = typeof hint === 'function' ? hint() : '';
  return (
    <div className="scene ds">
      <div className="ds__pair">
        <figure>
          <figcaption>{t('games.attention.first')}</figcaption>
          <svg viewBox="0 0 320 200" role="img" aria-label={`${t(`games.attention.scenes.${scene.id}`)}: ${round.objs.map((o) => name(o.id)).join(t('common.listSep'))}`}>
            {scene.bg}
            {round.objs.map((o) => place(o, undefined))}
          </svg>
        </figure>
        <figure>
          <figcaption>{t('games.attention.second')}</figcaption>
          <div className="ds__b">
            <svg viewBox="0 0 320 200" aria-hidden="true">
              {scene.bg}
              {round.objs.map((o) => place(o, round.changes.get(o.id)))}
              {round.added && place(round.added, undefined)}
            </svg>
            {targets.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`hot ${found.includes(o.id) ? 'is-found' : ''} ${miss === o.id ? 'is-miss' : ''}`}
                style={hitStyle(o, round.changes.get(o.id))}
                aria-label={found.includes(o.id) ? t('games.attention.foundLabel', { item: name(o.id) }) : name(o.id)}
                aria-pressed={found.includes(o.id)}
                onClick={() => tap(o)}
              />
            ))}
          </div>
        </figure>
      </div>
      <p className="hint" role="status">{t('games.attention.progress', { found: found.length, total: count })}{hintText ? ` ${hintText}` : ''}</p>
      <div className="row row--c"><HintButton onClick={askHint} used={!!hint} /></div>
    </div>
  );
}
