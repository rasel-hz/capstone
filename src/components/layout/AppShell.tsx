import { useAppSelector } from '../../context/AppStateContext';
import { Challenges } from '../../pages/Challenges';
import { Companion } from '../../pages/Companion';
import { Home } from '../../pages/Home';
import { Journeys } from '../../pages/Journeys';
import { Progress } from '../../pages/Progress';
import { Rewards } from '../../pages/Rewards';
import { Settings } from '../../pages/Settings';
import type { ViewId } from '../../types';
import { Mascot } from '../mascot/Mascot';
import { NavBar } from '../navigation/NavBar';

const PAGES: Record<ViewId, () => React.JSX.Element> = {
  home: Home, journeys: Journeys, chal: Challenges, chat: Companion, prog: Progress, rew: Rewards, set: Settings,
};

export function AppShell({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const view = useAppSelector((s) => s.view) as ViewId;
  const Page = PAGES[view] || Home;
  return (
    <div id="app">
      <NavBar view={view} onNavigate={onNavigate} />
      {/* The new page appears straight away and fades in, so a tap is never held up by an exit animation. */}
      <main key={view} className="page">
        <Page />
      </main>
      {view !== 'chat' && (
        <button type="button" className="fab" aria-label="افتح خويّك" onClick={() => onNavigate('chat')}>
          <Mascot state="idle" size={56} still />
        </button>
      )}
    </div>
  );
}
