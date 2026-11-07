import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AppShell } from './components/layout/AppShell';
import { preloadClips } from './components/mascot/manifest';
import { listenForBack } from './services/native';
import { useAppSelector, useStore } from './context/AppStateContext';
import { MissionProvider } from './features/mission/MissionProvider';
import { Landing } from './pages/Landing';
import { ACCOUNT_STEP, Onboarding } from './pages/Onboarding';
import { useAuth } from './features/auth/AuthProvider';
import { AuthLoading, WelcomeBack } from './features/auth/AuthViews';
import type { ViewId } from './types';

// Tells screen readers about a language change, in the new language.
function LanguageAnnouncer({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setText(t('common.languageChanged'));
  }, [lang, t]);
  return <p className="sr-only" role="status">{text}</p>;
}

export default function App() {
  const store = useStore();
  const started = useAppSelector((s) => s.started);
  const done = useAppSelector((s) => s.done);
  const rm = useAppSelector((s) => s.rm);
  const theme = useAppSelector((s) => s.theme);
  const largeText = useAppSelector((s) => s.largeText);
  const lang = useAppSelector((s) => s.lang);
  const auth = useAuth();

  useEffect(() => {
    document.body.className = [done ? theme : '', rm ? 'rm' : '', largeText ? 'lg' : ''].filter(Boolean).join(' ');
  }, [rm, theme, done, largeText]);

  useEffect(preloadClips, []);

  // Android back button: move to Home, or report nothing left to do so the app goes to the background.
  useEffect(() => listenForBack(() => {
    const st = store.getState();
    if (!st.done || st.view === 'home') return false;
    store.update((d) => { d.view = 'home'; });
    window.scrollTo(0, 0);
    return true;
  }), [store]);

  const navigate = useCallback((v: ViewId) => {
    store.update((d) => { d.view = v; });
    window.scrollTo(0, 0);
  }, [store]);

  return (
    <MotionConfig reducedMotion={rm ? 'always' : 'user'}>
      <LanguageAnnouncer lang={lang} />
      {auth.status === 'loading' ? (
        <AuthLoading />
      ) : auth.status === 'signedOut' && !started ? (
        <Landing />
      ) : auth.status === 'signedOut' || !done ? (
        // Signed out: onboarding up to the account tab. Saved answers from before accounts existed start
        // at the account tab. Signed in but unfinished: carry on after it. One element, so creating the
        // account in the middle of onboarding keeps its state.
        <Onboarding initialStep={auth.status === 'signedIn' ? ACCOUNT_STEP + 1 : done ? ACCOUNT_STEP : 0} />
      ) : (
        <MissionProvider onNavigate={navigate}>
          <AppShell onNavigate={navigate} />
          {auth.welcome && <WelcomeBack name={auth.welcome} onContinue={() => { auth.dismissWelcome(); navigate('home'); }} />}
        </MissionProvider>
      )}
    </MotionConfig>
  );
}
