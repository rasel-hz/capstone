import { useCallback, useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { AppShell } from './components/layout/AppShell';
import { useAppSelector, useStore } from './context/AppStateContext';
import { MissionProvider } from './features/mission/MissionProvider';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import type { ViewId } from './types';

export default function App() {
  const store = useStore();
  const started = useAppSelector((s) => s.started);
  const done = useAppSelector((s) => s.done);
  const rm = useAppSelector((s) => s.rm);
  const theme = useAppSelector((s) => s.theme);
  const largeText = useAppSelector((s) => s.largeText);

  useEffect(() => {
    document.body.className = [done ? theme : '', rm ? 'rm' : '', largeText ? 'lg' : ''].filter(Boolean).join(' ');
  }, [rm, theme, done, largeText]);

  const navigate = useCallback((v: ViewId) => {
    store.update((d) => { d.view = v; });
    window.scrollTo(0, 0);
  }, [store]);

  return (
    <MotionConfig reducedMotion={rm ? 'always' : 'user'}>
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
