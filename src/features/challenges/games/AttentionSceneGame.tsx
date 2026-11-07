import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimers } from '../../../hooks/useTimers';
import { tr, type Msg } from '../../../i18n';
import { shuffled } from '../../../utils';
import { Palm } from '../ChallengeArt';
import type { GameProps } from '../types';
import { HintButton } from './parts';

// A difference is either a new color, a missing object or a moved one.
type Change = { kind: 'color'; color: string } | { kind: 'gone' } | { kind: 'move'; dx: number; dy: number };
interface Obj { id: string; x: number; y: number; w: number; h: number; color: string; draw(color: string): ReactNode; alt: Change }
interface SceneDef { id: string; bg: ReactNode; objects: Obj[] }

const OASIS: SceneDef = {
  id: 'oasis',
  bg: <><rect width="320" height="200" fill="#CFE9FF" /><path d="M0 130q80-30 160-8t160-12v90H0z" fill="#F7DDB6" /><ellipse cx="170" cy="172" rx="90" ry="14" fill="#8BCDF1" /></>,
  objects: [
    { id: 'sun', x: 262, y: 36, w: 44, h: 44, color: '#FFD36E', draw: (c) => <circle r="20" fill={c} />, alt: { kind: 'color', color: '#FF8E83' } },
    { id: 'cloud', x: 96, y: 40, w: 64, h: 30, color: '#FFFFFF', draw: (c) => <g fill={c}><ellipse cx="-12" rx="20" ry="9" /><ellipse cx="10" cy="-4" rx="18" ry="11" /></g>, alt: { kind: 'move', dx: 62, dy: 6 } },
    { id: 'palm', x: 46, y: 118, w: 64, h: 92, color: '', draw: () => <Palm x={0} y={40} s={1.1} />, alt: { kind: 'gone' } },
    { id: 'tent', x: 252, y: 132, w: 66, h: 50, color: '#A78BFA', draw: (c) => <path d="M-30 22L0-20l30 42z" fill={c} />, alt: { kind: 'color', color: '#28785B' } },
    { id: 'bird', x: 180, y: 70, w: 44, h: 26, color: '#263D37', draw: (c) => <path d="M-16 0q8-10 16 0q8-10 16 0" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />, alt: { kind: 'gone' } },
    { id: 'flower', x: 130, y: 142, w: 28, h: 28, color: '#FF8E83', draw: (c) => <g><path d="M0 12v-10" stroke="#28785B" strokeWidth="2.5" /><circle cy="-4" r="7" fill={c} /></g>, alt: { kind: 'color', color: '#FFD36E' } },
    { id: 'rock', x: 206, y: 150, w: 34, h: 22, color: '#B9AFA3', draw: (c) => <ellipse rx="15" ry="9" fill={c} />, alt: { kind: 'move', dx: -22, dy: 18 } },
  ],
};

const MAJLIS: SceneDef = {
  id: 'majlis',
  bg: <><rect width="320" height="200" fill="#FFF3E3" /><rect y="150" width="320" height="50" fill="#E9C9A3" /><rect x="118" y="24" width="84" height="66" rx="42" fill="#CFE9FF" /><path d="M160 24v66M118 62h84" stroke="#fff" strokeWidth="4" /></>,
  objects: [
    { id: 'dallah', x: 160, y: 142, w: 44, h: 50, color: '#FFD36E', draw: (c) => <g fill={c}><path d="M-11 22q-5-24 6-34h10q11 10 6 34z" /><path d="M-11-2l-11-9 3 13z" /><circle cy="-16" r="3.5" /></g>, alt: { kind: 'color', color: '#8BCDF1' } },
    { id: 'cup', x: 210, y: 158, w: 28, h: 22, color: '#FFFFFF', draw: (c) => <path d="M-11-7h22l-4 15h-14z" fill={c} stroke="#263D37" strokeOpacity=".3" />, alt: { kind: 'gone' } },
    { id: 'dates', x: 106, y: 162, w: 52, h: 24, color: '#A8794F', draw: (c) => <g><ellipse rx="23" ry="6" cy="5" fill="#fff" /><ellipse cx="-9" rx="6" ry="4" fill={c} /><ellipse cx="3" cy="-2" rx="6" ry="4" fill={c} /><ellipse cx="11" cy="2" rx="6" ry="4" fill={c} /></g>, alt: { kind: 'move', dx: -50, dy: 8 } },
    { id: 'lamp', x: 48, y: 40, w: 36, h: 56, color: '#FF8E83', draw: (c) => <g><path d="M0-30V-12" stroke="#263D37" strokeWidth="2" /><rect x="-12" y="-12" width="24" height="30" rx="7" fill={c} /></g>, alt: { kind: 'color', color: '#A78BFA' } },
    { id: 'cushion', x: 268, y: 130, w: 60, h: 42, color: '#28785B', draw: (c) => <rect x="-26" y="-17" width="52" height="34" rx="12" fill={c} />, alt: { kind: 'color', color: '#FFC6A8' } },
    { id: 'frame', x: 270, y: 52, w: 46, h: 40, color: '#A78BFA', draw: (c) => <g><rect x="-19" y="-16" width="38" height="32" rx="3" fill="#fff" stroke={c} strokeWidth="4" /><circle r="6" fill={c} /></g>, alt: { kind: 'gone' } },
    { id: 'plant', x: 36, y: 142, w: 40, h: 52, color: '#8DBFA3', draw: (c) => <g><rect x="-10" y="6" width="20" height="16" rx="3" fill="#FF8E83" /><path d="M0 6q-16-10-13-24 11 6 13 24zM0 6q16-10 13-24-11 6-13 24z" fill={c} /></g>, alt: { kind: 'move', dx: 30, dy: 0 } },
  ],
};

const name = (id: string) => tr(`games.attention.objects.${id}`);

const place = (o: Obj, changed: boolean) => {
  const c = changed && o.alt.kind === 'color' ? o.alt.color : o.color;
  const dx = changed && o.alt.kind === 'move' ? o.alt.dx : 0;
  const dy = changed && o.alt.kind === 'move' ? o.alt.dy : 0;
  if (changed && o.alt.kind === 'gone') return null;
  return <g key={o.id} transform={`translate(${o.x + dx} ${o.y + dy})`}>{o.draw(c)}</g>;
};

// A moved object can be tapped where it was or where it went, so its target covers both places.
// These positions follow the drawing, which isn't mirrored, so they stay physical in both languages.
function hitStyle(o: Obj, changed: boolean) {
  const dx = changed && o.alt.kind === 'move' ? o.alt.dx : 0;
  const dy = changed && o.alt.kind === 'move' ? o.alt.dy : 0;
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
  const count = diff === 'easy' ? 2 : 3;
  const rounds = diff === 'easy' ? [OASIS] : [OASIS, MAJLIS];
  const timers = useTimers(env.paused);
  const [idx, setIdx] = useState(0);
  const scene = rounds[idx];
  const diffs = useMemo(() => new Set(shuffled(scene.objects).slice(0, count).map((o) => o.id)), [scene, count]);
  const [found, setFound] = useState<string[]>([]);
  const [miss, setMiss] = useState<string | null>(null);
  const [hint, setHint] = useState<Msg | null>(null);
  const totals = useRef({ found: 0, misses: 0, hints: 0 });

  useEffect(() => {
    env.round(idx + 1, rounds.length, 'games.common.scene');
    env.say('curious', () => tr('games.attention.intro', { count }));
    setFound([]);
    setHint(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  function tap(o: Obj) {
    if (found.includes(o.id)) return;
    if (diffs.has(o.id)) {
      const next = [...found, o.id];
      setFound(next);
      setHint(null);
      setMiss(null);
      totals.current.found++;
      env.sfx('ok');
      if (next.length === count) {
        env.say('happy', 'games.attention.allFound');
        timers.after(() => {
          if (idx + 1 < rounds.length) {
            setIdx(idx + 1);
          } else {
            const c = totals.current;
            // Share of tries that were right. Hints count as a try, because they helped.
            const tries = c.found + c.misses + c.hints;
            onDone({ acc: Math.round((c.found / tries) * 100), retries: c.misses, note: () => tr('games.attention.note', { found: c.found, misses: c.misses }), data: { found: c.found, misses: c.misses, hints: c.hints } });
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
    const o = scene.objects.find((x) => diffs.has(x.id) && !found.includes(x.id));
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
          <svg viewBox="0 0 320 200" role="img" aria-label={`${t(`games.attention.scenes.${scene.id}`)}: ${scene.objects.map((o) => name(o.id)).join(t('common.listSep'))}`}>
            {scene.bg}
            {scene.objects.map((o) => place(o, false))}
          </svg>
        </figure>
        <figure>
          <figcaption>{t('games.attention.second')}</figcaption>
          <div className="ds__b">
            <svg viewBox="0 0 320 200" aria-hidden="true">
              {scene.bg}
              {scene.objects.map((o) => place(o, diffs.has(o.id)))}
            </svg>
            {scene.objects.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`hot ${found.includes(o.id) ? 'is-found' : ''} ${miss === o.id ? 'is-miss' : ''}`}
                style={hitStyle(o, diffs.has(o.id))}
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
      <p className="note center">{t('games.attention.explain')}</p>
    </div>
  );
}
