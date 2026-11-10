import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatList, tr } from '../../../i18n';
import type { ChallengeId, GameResult, Seed } from '../../../types';
import type { CrisisLevel } from '../../companion/crisis';
import type { GameProps } from '../types';
import { AskNext, CrisisStop, crisisIn, HeavySupport } from './parts';

export const FEELINGS: [string, string][] = [
  ['calm', '#8DBFA3'], ['happy', '#FFD36E'], ['excited', '#FFC6A8'], ['proud', '#F6B26B'], ['grateful', '#B5D99C'],
  ['tired', '#B9AFA3'], ['tense', '#FF8E83'], ['anxious', '#F4A3B4'], ['upset', '#A78BFA'], ['sad', '#8FA8D8'],
  ['lonely', '#9DB4C0'], ['lost', '#8BCDF1'], ['unsure', '#E9DFFF'],
];
// Feelings that, when strong, get clearer support before anything else.
const HARD = new Set(['tense', 'anxious', 'upset', 'sad', 'lonely', 'lost', 'tired']);
const HELPS = ['walk', 'talk', 'break', 'small', 'breath', 'unsure'];
// Where each answer to "what might help?" leads. Talking, or not knowing, opens the chat with Zaho.
const ROUTES: Record<string, { id: ChallengeId; seed?: Seed } | 'chat'> = {
  walk: { id: 'calm_landscape', seed: { option: 'move', from: 'emotion_map' } },
  break: { id: 'calm_landscape', seed: { from: 'emotion_map' } },
  small: { id: 'micro_start', seed: { from: 'emotion_map' } },
  breath: { id: 'calm', seed: { from: 'emotion_map' } },
  talk: 'chat',
  unsure: 'chat',
};
const LEVELS = [1, 2, 3, 4, 5];
const OWN_LEN = 40;

// Self-report only. Nothing here is inferred, it stays on the device, and it earns no XP (reference 14.2).
export function EmotionMapGame({ env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [feel, setFeel] = useState<string[]>([]);
  const [own, setOwn] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [help, setHelp] = useState<string[]>([]);
  const [crisis, setCrisis] = useState<CrisisLevel>(0);
  const [held, setHeld] = useState<GameResult | null>(null);
  const heavy = (level ?? 0) >= 4 && feel.some((k) => HARD.has(k));

  useEffect(() => {
    env.round(step, 3, 'games.common.step');
    if (step === 1) env.say('listening', 'games.emotion.intro');
    if (step === 3 && heavy) env.say('concerned', 'games.emotion.heavySay');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggle = (v: string, set: React.Dispatch<React.SetStateAction<string[]>>) => set((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));

  function result(go?: 'chat'): GameResult {
    const chosen = feel;
    const mine = own.trim();
    return {
      acc: null,
      retries: 0,
      mood: 'calm',
      say: () => tr('games.emotion.said', { feelings: formatList([...chosen.map((k) => tr(`games.emotion.feelings.${k}`)), ...(mine ? [mine] : [])]) }),
      note: 'games.emotion.note',
      data: { feelings: feel, own: mine || undefined, intensity: level, help },
      ...(go ? { go } : {}),
    };
  }

  function finish() {
    env.sfx('ok');
    const r = result();
    // The first thing they picked as helpful can start now, if they want.
    if (help.length) setHeld(r);
    else onDone(r);
  }

  if (crisis) return <CrisisStop level={crisis} onBack={() => setCrisis(0)} />;

  if (held) {
    const k = help[0];
    const route = ROUTES[k];
    return (
      <AskNext
        q={t(route === 'chat' ? 'games.emotion.chatQ' : 'games.emotion.tryQ', { help: t(`games.emotion.helps.${k}`) })}
        yes={t('games.emotion.tryYes')}
        no={t('games.emotion.tryNo')}
        onYes={() => onDone(route === 'chat' ? result('chat') : { ...held, then: route })}
        onNo={() => onDone(held)}
      />
    );
  }

  if (step === 1) {
    return (
      <div className="scene form">
        <h2 className="q__t">{t('games.emotion.feelQ')}</h2>
        <div className="feel">
          {FEELINGS.map(([k, c]) => (
            <button key={k} type="button" className={`feel__b ${feel.includes(k) ? 'on' : ''}`} aria-pressed={feel.includes(k)} onClick={() => toggle(k, setFeel)}>
              <i style={{ background: c }} aria-hidden="true" />{t(`games.emotion.feelings.${k}`)}
            </button>
          ))}
        </div>
        <input dir="auto" aria-label={t('games.emotion.ownLabel')} maxLength={OWN_LEN} placeholder={t('games.emotion.ownPh')} value={own} onChange={(e) => setOwn(e.target.value)} />
        <div className="row row--c">
          <button type="button" className="btn" disabled={!feel.length && !own.trim()} onClick={() => { const lv = crisisIn(own); if (lv) setCrisis(lv); else setStep(2); }}>{t('common.next')}</button>
        </div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="scene form">
        <h2 className="q__t">{t('games.emotion.strengthQ')}</h2>
        <div className="scale" role="group" aria-label={t('games.emotion.strength')}>
          {LEVELS.map((n) => (
            <button key={n} type="button" className={`scale__b ${level === n ? 'on' : ''}`} aria-pressed={level === n} onClick={() => setLevel(n)}>
              <i style={{ height: 2 + n * 8 }} aria-hidden="true" />{t(`games.emotion.levels.${n}`)}
            </button>
          ))}
        </div>
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => setStep(1)}>{t('common.back')}</button>
          <button type="button" className="btn" onClick={() => setStep(3)}>{t(level ? 'common.next' : 'common.skip')}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="scene form">
      {heavy && <HeavySupport text={t('games.emotion.heavy')} onChat={() => { env.sfx('ok'); onDone(result('chat')); }} />}
      <h2 className="q__t">{t('games.emotion.helpQ')}</h2>
      <div className="tags tags--c">
        {HELPS.map((k) => <button key={k} type="button" className={`tag tag--btn ${help.includes(k) ? 'on' : ''}`} aria-pressed={help.includes(k)} onClick={() => toggle(k, setHelp)}>{t(`games.emotion.helps.${k}`)}</button>)}
      </div>
      <div className="row row--c">
        <button type="button" className="btn alt" onClick={() => setStep(2)}>{t('common.back')}</button>
        <button type="button" className="btn" onClick={finish}>{t('games.emotion.finish')}</button>
      </div>
    </div>
  );
}
