import { Award, Check, Crown, Footprints, Layers, Lock, Palette, RefreshCw, Shapes, Sunrise, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, ProgressBar } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { ChallengeArt } from '../../features/challenges/ChallengeArt';
import { CHALLENGES } from '../../features/challenges/catalog';
import { achievements, UNLOCKS, type AchievementArt } from '../../features/rewards/achievements';
import { useCountUp } from '../../hooks/useCountUp';
import type { ChallengeId } from '../../types';
import { level } from '../../utils';

const MEDAL: Record<AchievementArt, { icon: LucideIcon; c: string }> = {
  step: { icon: Footprints, c: '#8DBFA3' }, five: { icon: Layers, c: '#FFD36E' }, level: { icon: Award, c: '#A78BFA' },
  variety: { icon: Shapes, c: '#8BCDF1' }, retry: { icon: RefreshCw, c: '#FFC6A8' }, return: { icon: Sunrise, c: '#FF8E83' },
};

// A medal drawn around the icon, so earned and locked look clearly different without relying on color.
function Medal({ art, earned }: { art: AchievementArt; earned: boolean }) {
  const { icon: Icon, c } = MEDAL[art];
  return (
    <span className={`medal ${earned ? 'is-on' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 64"><path d="M32 3l8 5 9-1 5 8 8 5-1 9 3 8-6 7-1 9-9 3-6 7-9-3-9 3-6-7-9-3-1-9-6-7 3-8-1-9 8-5 5-8 9 1z" fill={earned ? c : '#EEEAE2'} /></svg>
      <span className="medal__i">{earned ? <Icon size={24} /> : <Lock size={20} />}</span>
    </span>
  );
}

const STICKERS = (Object.keys(CHALLENGES) as ChallengeId[]).filter((id) => !CHALLENGES[id].selfReport);

export function Rewards() {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const lvl = level(s);
  const list = achievements(s);
  const earned = list.filter((a) => a.earned).length;
  const mascot = useMascot('idle');
  const xp = useCountUp(s.xp);
  const done = new Set(s.hist.filter((h) => h.status === 'COMPLETED').map((h) => h.id));
  const stickers = STICKERS.filter((id) => done.has(id)).length;

  // Only real results trigger a reaction, so nothing celebrates unearned points.
  useEffect(() => {
    if (lvl >= 3) mascot.play('celebrating');
    else if (earned) mascot.play('happy');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader title={t('rewards.title')} sub={t('rewards.sub')} />

      <section className="rew-hero">
        <Mascot state={mascot.state} size={116} label={t('common.brand')} interactive />
        <div className="grow">
          <p className="eyebrow">{t('common.levelN', { n: lvl })}</p>
          <p className="rew-hero__xp"><b>{xp}</b> {t('common.pointsWord')}</p>
          <ProgressBar value={s.xp % 100} label={t('common.toNextLevel')} />
          <p className="note">{t('rewards.toNext', { left: 100 - (s.xp % 100), next: lvl + 1 })} {t('common.xpDisclaimer')}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__h"><h2>{t('rewards.achievements')}</h2><span className="note">{t('rewards.ofTotal', { n: earned, total: list.length })}</span></div>
        <ul className="medals">
          {list.map((a) => (
            <li key={a.art} className={a.earned ? 'chip--earned' : ''}>
              <Medal art={a.art} earned={a.earned} />
              <b>{t(`rewards.items.${a.art}.label`)}</b>
              <span className="note">{a.earned ? t('rewards.earned') : t(`rewards.items.${a.art}.hint`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>{t('rewards.unlocks')}</h2>
        <div className="unlocks">
          {UNLOCKS.map((u) => {
            const open = lvl >= u.level;
            const active = !!u.theme && s.theme === u.theme;
            return (
              <div key={u.id} className={`unlock ${open ? 'is-open' : ''}`}>
                <span className={`unlock__art ${u.theme ? 'unlock__art--theme' : 'unlock__art--hat'}`} aria-hidden="true">{u.theme ? <Palette size={26} /> : <Crown size={26} />}</span>
                <div className="grow">
                  <b>{t(`rewards.unlockItems.${u.id}.name`)}</b>
                  <p className="note flush">{open ? t(`rewards.unlockItems.${u.id}.open`) : t('rewards.unlocksAt', { n: u.level })}</p>
                </div>
                {open && u.theme ? (
                  <button type="button" className="btn sm alt" aria-pressed={active} onClick={() => store.update((d) => { d.theme = d.theme ? '' : u.theme; })}>{t(active ? 'rewards.turnOff' : 'rewards.turnOn')}</button>
                ) : open ? <Check size={18} aria-label={t('rewards.unlocked')} /> : <Lock size={18} aria-label={t('rewards.locked')} />}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel__h"><h2>{t('rewards.collection')}</h2><span className="note">{t('rewards.ofTotal', { n: stickers, total: STICKERS.length })}</span></div>
        <p className="note">{t('rewards.collectionNote')}</p>
        <ul className="stickers">
          {STICKERS.map((id) => (
            <li key={id} className={done.has(id) ? 'is-on' : ''}>
              <div className="sticker__art"><ChallengeArt id={id} /></div>
              <span>{done.has(id) ? t(`challenges.items.${id}.name`) : t('rewards.notYet')}</span>
              <span className="sr-only">{done.has(id) ? '' : t(`challenges.items.${id}.name`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="note center">{t('rewards.noPartners')}</p>
    </>
  );
}
