import { ArrowRight, Check, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fireConfetti } from '../../animations/effects';
import { Mascot } from '../../components/mascot/Mascot';
import type { MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { Segmented } from '../../components/ui/kit';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useStore } from '../../context/AppStateContext';
import { buildPlan } from '../../features/path/planner';
import { ProfileQuestions } from '../../features/profile/ProfileQuestions';
import { toLegacy, type LifeProfile } from '../../features/profile/questions';
import { iso, tr } from '../../i18n';
import { isAiAvailable } from '../../services/companion';
import { useBackHandler } from '../../services/native';
import type { Gender } from '../../types';
import { useAuth } from '../../features/auth/AuthProvider';
import { AccountStep } from '../../features/auth/AuthViews';

const MOODS: MascotState[] = ['idle', 'happy', 'listening', 'curious', 'calm', 'idle'];
const STEP_NAMES = ['about', 'account', 'day', 'goals', 'time', 'help'];
// The account tab. Nothing after it can be reached without an account.
export const ACCOUNT_STEP = 1;
const QUESTIONS = ACCOUNT_STEP + 1;

export function Onboarding({ initialStep = 0 }: { initialStep?: number }) {
  const { t } = useTranslation();
  const store = useStore();
  const auth = useAuth();
  const [step, setStep] = useState(Math.min(initialStep, QUESTIONS));
  const [group, setGroup] = useState(0);
  const [name, setName] = useState(store.getState().name);
  const [g, setG] = useState<Gender>(store.getState().g);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  // Answers wait here while the AI question is on screen, so nothing is saved until it's answered.
  const [answers, setAnswers] = useState<LifeProfile | null>(null);
  const signedIn = auth.status === 'signedIn';
  // The AI question is only a step when the AI can actually be used.
  const names = aiReady ? [...STEP_NAMES, 'ai'] : STEP_NAMES;
  const shown = answers ? names.length - 1 : step < QUESTIONS ? step : QUESTIONS + group;
  const mascot = useMascot(MOODS[shown] ?? 'idle');
  // From the first step, back returns to the landing page.
  const canLeave = step === 0 && !signedIn;
  const toLanding = () => store.update((d) => { d.started = 0; });
  // Android back goes to the previous step, or the landing page, instead of closing the app.
  useBackHandler(() => (answers ? setAnswers(null) : canLeave ? toLanding() : setStep((s) => s - 1)), !!answers || step > 0 || canLeave);

  useEffect(() => {
    void isAiAvailable().then(setAiReady);
  }, []);

  useEffect(() => {
    mascot.play('greeting');
  }, [mascot.play]);

  useEffect(() => {
    if (step >= QUESTIONS && group > 0) mascot.play('encouraging');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  const finalName = () => name.trim() || tr('onboarding.defaultName', { context: g });

  function nextFromAbout() {
    setName(finalName());
    setStep(ACCOUNT_STEP);
    mascot.play('encouraging');
  }

  function questionsDone(p: LifeProfile) {
    if (aiReady && store.getState().aiConsent == null) setAnswers(p);
    else void finish(p);
  }

  async function finish(p: LifeProfile, aiConsent?: 0 | 1) {
    // Onboarding counts as finished only once the account says so, so another device skips it too.
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    const firstName = finalName();
    try {
      await auth.finishOnboarding({ firstName, addressForm: g });
    } catch {
      setSaveError(true);
      setSaving(false);
      return;
    }
    fireConfetti(!!store.getState().rm);
    store.update((d) => {
      Object.assign(d, toLegacy(p), { name: firstName, g, prof: p, path: buildPlan(p), done: 1, view: 'path' });
      if (aiConsent !== undefined) d.aiConsent = aiConsent;
      d.chat = [{ b: 1, t: tr('onboarding.firstMessage', { name: iso(firstName) }) }];
    });
  }

  return (
    <div id="app" className="ob-wrap">
      <main className="onboard">
        <div className="ob-top"><LanguageSwitcher /></div>
        <ol className="stepper" aria-label={t('onboarding.stepOf', { n: shown + 1, total: names.length })}>
          {names.map((n, i) => (
            <li key={n} className={i < shown ? 'is-done' : i === shown ? 'is-cur' : ''} aria-current={i === shown ? 'step' : undefined}>
              <span aria-hidden="true">{i < shown ? <Check size={13} /> : i + 1}</span><em>{t(`onboarding.steps.${n}`)}</em>
            </li>
          ))}
        </ol>
        <div className="ob-card">
          <Mascot state={mascot.state} size={step === 0 ? 130 : 84} label={t('common.brand')} />
          {step === 0 && (
            <>
              <div className="scene">
                <h1>{t('onboarding.helloTitle')}</h1>
                <p>{t('onboarding.helloText')}</p>
                <label className="sr-only" htmlFor="ob-name">{t('onboarding.namePh')}</label>
                <input id="ob-name" dir="auto" value={name} maxLength={40} placeholder={t('onboarding.namePh')} className="name-input" onChange={(e) => setName(e.target.value)} />
                <p>{t('onboarding.address')}</p>
                <Segmented<Gender> className="seg--c" label={t('settings.address')} value={g} options={[{ value: 'm', label: t('common.masculine') }, { value: 'f', label: t('common.feminine') }]} onChange={setG} />
                <p className="note ob-priv"><Lock size={13} aria-hidden="true" /> {t('onboarding.privacy')}</p>
              </div>
              <div className="ob-act">
                {canLeave && <button type="button" className="btn alt" onClick={toLanding}><ArrowRight size={16} className="flip" aria-hidden="true" /> {t('common.back')}</button>}
                <button type="button" className="btn" onClick={nextFromAbout}>{t('common.next')}</button>
              </div>
            </>
          )}
          {step === ACCOUNT_STEP && (
            <>
              <div className="scene">
                <AccountStep
                  firstName={name}
                  addressForm={g}
                  onCelebrate={() => { fireConfetti(!!store.getState().rm); mascot.play('celebrating'); }}
                  onCreated={() => setStep(QUESTIONS)}
                />
              </div>
              <div className="ob-act">
                <button type="button" className="btn alt" onClick={() => setStep(0)}><ArrowRight size={16} className="flip" aria-hidden="true" /> {t('common.back')}</button>
                {/* The account tab has its own button. Next appears here only once the account exists. */}
                {signedIn && <button type="button" className="btn" onClick={() => setStep(QUESTIONS)}>{t('common.next')}</button>}
              </div>
            </>
          )}
          {/* Kept mounted behind the AI question, so going back returns to the answers. */}
          {step >= QUESTIONS && <div hidden={!!answers}><ProfileQuestions busy={saving} onBack={() => setStep(ACCOUNT_STEP)} onGroup={setGroup} onDone={questionsDone} /></div>}
          {answers && (
            <>
              <div className="scene">
                <h1>{t('companion.consent.title')}</h1>
                <p>{t('companion.consent.text')}</p>
                <p className="note">{t('companion.consent.note')}</p>
                <p className="note">{t('onboarding.aiNoNote')}</p>
              </div>
              <div className="ob-act">
                <button type="button" className="btn alt" disabled={saving} onClick={() => setAnswers(null)}><ArrowRight size={16} className="flip" aria-hidden="true" /> {t('common.back')}</button>
                <button type="button" className="btn alt" disabled={saving} onClick={() => void finish(answers, 0)}>{t('onboarding.aiNo')}</button>
                <button type="button" className="btn" disabled={saving} onClick={() => void finish(answers, 1)}>{t('companion.consent.yes')}</button>
              </div>
            </>
          )}
          {saveError && <p className="hint auth-err" role="alert">{t('auth.errors.saveFailed')}</p>}
        </div>
      </main>
    </div>
  );
}
