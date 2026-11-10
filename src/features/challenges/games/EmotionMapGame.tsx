import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatList, tr } from '../../../i18n';
import type { GameProps } from '../types';

export const FEELINGS: [string, string][] = [
  ['calm', '#8DBFA3'], ['happy', '#FFD36E'], ['excited', '#FFC6A8'], ['tired', '#B9AFA3'],
  ['tense', '#FF8E83'], ['upset', '#A78BFA'], ['lost', '#8BCDF1'], ['unsure', '#E9DFFF'],
];
const HELPS = ['walk', 'talk', 'break', 'small', 'breath', 'unsure'];
const LEVELS = [1, 2, 3, 4, 5];

// Self-report only. Nothing here is inferred, it stays on the device, and it earns no XP (reference 14.2).
export function EmotionMapGame({ env, onDone }: GameProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [feel, setFeel] = useState<string[]>([]);
  const [level, setLevel] = useState<number | null>(null);
  const [help, setHelp] = useState<string[]>([]);

  useEffect(() => {
    env.round(step, 3, 'games.common.step');
    if (step === 1) env.say('listening', 'games.emotion.intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggle = (v: string, set: React.Dispatch<React.SetStateAction<string[]>>) => set((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));

  function finish() {
    env.sfx('ok');
    const chosen = feel;
    onDone({
      acc: null,
      retries: 0,
      mood: 'calm',
      say: () => tr('games.emotion.said', { feelings: formatList(chosen.map((k) => tr(`games.emotion.feelings.${k}`))) }),
      note: 'games.emotion.note',
      data: { feelings: feel, intensity: level, help },
    });
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
        <div className="row row--c"><button type="button" className="btn" disabled={!feel.length} onClick={() => setStep(2)}>{t('common.next')}</button></div>
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
