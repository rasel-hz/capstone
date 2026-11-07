import { ArrowRight, Check, Lock, Volume2, VolumeX, Zap, ZapOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fireConfetti } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import type { MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { Segmented } from '../../components/ui/kit';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useStore } from '../../context/AppStateContext';
import { JourneyArt } from '../../features/challenges/ChallengeArt';
import { JOURNEYS } from '../../features/challenges/catalog';
import { PrayerSetup } from '../../features/prayer/PrayerSetup';
import type { PrayerPlace } from '../../features/prayer/times';
import { iso, tr } from '../../i18n';
import { useBackHandler } from '../../services/native';
import type { Gender, JourneyId } from '../../types';

interface Draft {
  name: string;
  g: Gender;
  needs: JourneyId[];
  sched: string;
  pat: string;
  sleep: string;
  pp: number;
  city: string;
  loc: PrayerPlace | null;
  snd: number;
  rm: number;
}

const MOODS: MascotState[] = ['idle', 'listening', 'curious', 'calm', 'idle'];
const STEP_NAMES = ['about', 'journeys', 'day', 'prayer', 'comfort'];
// These steps are optional, so they can be skipped outright.
const OPTIONAL = [false, true, true, true, true];

export function Onboarding() {
  const { t } = useTranslation();
  const store = useStore();
  const [step, setStep] = useState(0);
  const [tm, setTm] = useState<Draft>({ name: store.getState().name, g: 'm', needs: [], sched: 'work', pat: '', sleep: '', pp: 30, city: '', loc: null, snd: 1, rm: 0 });
  const mascot = useMascot(MOODS[step]);
  const up = (p: Partial<Draft>) => setTm({ ...tm, ...p });
  // Android back goes to the previous step instead of closing the app.
  useBackHandler(() => setStep((s) => s - 1), step > 0);

  useEffect(() => {
    mascot.play('greeting');
  }, [mascot.play]);

  function next() {
    const name = step === 0 ? tm.name.trim() || tr('onboarding.defaultName', { context: tm.g }) : tm.name;
    if (step < 4) {
      up({ name });
      setStep(step + 1);
      mascot.play('encouraging');
      return;
    }
    fireConfetti(!!tm.rm);
    store.update((d) => {
      Object.assign(d, tm, { name, needs: tm.needs.length ? tm.needs : ['gen'], done: 1, view: 'home' });
      d.chat = [{ b: 1, t: tr('onboarding.firstMessage', { name: iso(name) }) }];
    });
  }

  const steps = [
    <>
      <h1>{t('onboarding.helloTitle')}</h1>
      <p>{t('onboarding.helloText')}</p>
      <label className="sr-only" htmlFor="ob-name">{t('onboarding.namePh')}</label>
      <input id="ob-name" dir="auto" value={tm.name} maxLength={40} placeholder={t('onboarding.namePh')} className="name-input" onChange={(e) => up({ name: e.target.value })} />
      <p>{t('onboarding.address')}</p>
      <Segmented<Gender> className="seg--c" label={t('settings.address')} value={tm.g} options={[{ value: 'm', label: t('common.masculine') }, { value: 'f', label: t('common.feminine') }]} onChange={(g) => up({ g })} />
      <p className="note ob-priv"><Lock size={13} aria-hidden="true" /> {t('onboarding.privacy')}</p>
    </>,
    <>
      <h2>{t('onboarding.journeysQ')}</h2>
      <p className="note">{t('onboarding.journeysNote')}</p>
      <div className="ob-j">
        {JOURNEYS.map((j) => {
          const on = tm.needs.includes(j.id);
          return (
            <button key={j.id} type="button" className={`ob-j__b ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => up({ needs: on ? tm.needs.filter((x) => x !== j.id) : [...tm.needs, j.id] })}>
              <span className="ob-j__a"><JourneyArt id={j.id} /></span>
              <span className="ob-j__t">{t(`journeys.items.${j.id}.name`)}</span>
              {on && <span className="ob-j__c" aria-hidden="true"><Check size={14} /></span>}
            </button>
          );
        })}
      </div>
    </>,
    <>
      <h2>{t('onboarding.dayQ')}</h2>
      <Segmented<string> className="seg--c" label={t('settings.schedule')} value={tm.sched} options={['work', 'study', 'flex'].map((v) => ({ value: v, label: t(`common.sched.${v}`) }))} onChange={(sched) => up({ sched })} />
      <p>{t('settings.active')}</p>
      <Segmented<string> className="seg--c" label={t('settings.active')} value={tm.pat || null} options={[{ value: 'am', label: t('common.morning') }, { value: 'pm', label: t('common.evening') }]} onChange={(pat) => up({ pat })} />
      <p>{t('onboarding.sleep')}</p>
      <Segmented<string> className="seg--c" label={t('onboarding.sleep')} value={tm.sleep || null} options={['early', 'late', 'skip'].map((v) => ({ value: v, label: t(`onboarding.sleepOptions.${v}`) }))} onChange={(sleep) => up({ sleep })} />
    </>,
    <>
      <h2>{t('onboarding.prayerTitle')}</h2>
      <p>{t('onboarding.prayerQ')}</p>
      <Segmented<number> className="seg--c" label={t('settings.protectLabel')} value={tm.pp} options={[0, 20, 30, 45].map((v) => ({ value: v, label: v ? t('common.minutes', { count: v }) : t('onboarding.prayerNone') }))} onChange={(pp) => up({ pp })} />
      <PrayerSetup value={{ city: tm.city, loc: tm.loc }} onChange={(v) => up({ city: v.city, loc: v.loc })} />
      <p className="note">{t(tm.city || tm.loc ? 'common.prayer.calcNote' : 'onboarding.prayerNote')}</p>
    </>,
    <>
      <h2>{t('onboarding.comfortTitle')}</h2>
      <p>{t('settings.sound')}</p>
      <Segmented<number> className="seg--c" label={t('settings.sound')} value={tm.snd} options={[{ value: 1, label: t('onboarding.soundOn'), icon: Volume2 }, { value: 0, label: t('onboarding.soundOff'), icon: VolumeX }]} onChange={(snd) => up({ snd })} />
      <p>{t('onboarding.motion')}</p>
      <Segmented<number> className="seg--c" label={t('onboarding.motion')} value={tm.rm} options={[{ value: 0, label: t('onboarding.motionNormal'), icon: Zap }, { value: 1, label: t('settings.motion'), icon: ZapOff }]} onChange={(rm) => up({ rm })} />
      <p className="note">{t('onboarding.notifications')}</p>
    </>,
  ];

  return (
    <div id="app" className="ob-wrap">
      <main className="onboard">
        <div className="ob-top"><LanguageSwitcher /></div>
        <ol className="stepper" aria-label={t('onboarding.stepOf', { n: step + 1, total: steps.length })}>
          {STEP_NAMES.map((n, i) => (
            <li key={n} className={i < step ? 'is-done' : i === step ? 'is-cur' : ''} aria-current={i === step ? 'step' : undefined}>
              <span aria-hidden="true">{i < step ? <Check size={13} /> : i + 1}</span><em>{t(`onboarding.steps.${n}`)}</em>
            </li>
          ))}
        </ol>
        <div className="ob-card">
          <Mascot state={mascot.state} size={step === 0 ? 130 : 88} label={t('common.brand')} />
          <div className="scene" key={step}>{steps[step]}</div>
          <div className="ob-act">
            {step > 0 && <button type="button" className="btn alt" onClick={() => setStep(step - 1)}><ArrowRight size={16} className="flip" aria-hidden="true" /> {t('common.back')}</button>}
            {OPTIONAL[step] && step < 4 && <button type="button" className="btn-link" onClick={next}>{t('common.skip')}</button>}
            <button type="button" className="btn" onClick={next}>{t(step === 4 ? 'onboarding.finish' : 'common.next')}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
