import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AppShell } from './components/layout/AppShell';
import { preloadClips } from './components/mascot/manifest';
import { listenForBack } from './services/native';
import { useAppSelector, useStore } from './context/AppStateContext';
import { MissionProvider } from './features/mission/MissionProvider';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
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
      {!started ? (
        <Landing />
      ) : !done ? (
        <Onboarding />
      ) : (
        <MissionProvider onNavigate={navigate}>
          <AppShell onNavigate={navigate} />
        </MissionProvider>
      )}
    </MotionConfig>
  );
}
