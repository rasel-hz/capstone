import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../../components/mascot/Mascot';
import { Overlay } from '../../components/ui/Overlay';
import { useStore } from '../../context/AppStateContext';
import type { PlannedItem, ViewId } from '../../types';
import { advance, createMission, currentItem, hasOpenMission, isPastEnd, skipItem } from './engine';
import { MissionPlayer, type PlayerStart } from './MissionPlayer';
import { generateMission, inPrayerWindow } from './planner';

export type ResumeChoice = 'continue' | 'restart' | 'easier' | 'skip';

interface MissionApi {
  start(items?: PlannedItem[]): void;
  resume(c: ResumeChoice): void;
}

const Ctx = createContext<MissionApi | null>(null);
export const useMissions = () => {
  const m = useContext(Ctx);
  if (!m) throw new Error('useMissions needs MissionProvider');
  return m;
};

type Blocker = 'driving' | 'prayer' | { conflict: PlannedItem[] } | null;

export function MissionProvider({ children, onNavigate }: { children: ReactNode; onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const store = useStore();
  const [player, setPlayer] = useState<{ start: PlayerStart; key: number } | null>(null);
  const [blocker, setBlocker] = useState<Blocker>(null);

  // While the player or a dialog is open, the app behind it can't be reached by keyboard or screen reader.
  const covered = !!player || !!blocker;
  useEffect(() => {
    const app = document.getElementById('app');
    if (app) app.inert = covered;
    return () => { if (app) app.inert = false; };
  }, [covered]);

  const open = useCallback((st: PlayerStart) => setPlayer((p) => ({ start: st, key: (p?.key ?? 0) + 1 })), []);

  // Driving and prayer windows block every interactive challenge before it can start.
  const guard = useCallback(() => {
    const s = store.getState();
    if (s.driving) {
      setBlocker('driving');
      return true;
    }
    if (inPrayerWindow(s)) {
      setBlocker('prayer');
      return true;
    }
    return false;
  }, [store]);

  const resume = useCallback((c: ResumeChoice) => {
    if (guard()) return;
    store.update((d) => {
      const it = currentItem(d)!;
      if (c === 'restart') it.retries = 0;
      if (c === 'easier') it.diff = 'easy';
      if (c === 'skip') {
        skipItem(d);
        advance(d);
      }
    });
    open(isPastEnd(store.getState()) ? 'finish' : 'run');
  }, [store, guard, open]);

  const begin = useCallback((items?: PlannedItem[]) => {
    store.update((d) => createMission(d, items || generateMission(d), !!items));
    open('intro');
  }, [store, open]);

  const start = useCallback((items?: PlannedItem[]) => {
    if (guard()) return;
    const s = store.getState();
    if (hasOpenMission(s)) {
      if (!items) return resume('continue');
      setBlocker({ conflict: items });
      return;
    }
    begin(items);
  }, [store, guard, resume, begin]);

  const api = useMemo(() => ({ start, resume }), [start, resume]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {player && <MissionPlayer key={player.key} start={player.start} onClose={() => setPlayer(null)} onNavigate={onNavigate} />}
      {blocker === 'driving' && (
        <Overlay label={t('player.block.drivingLabel')}>
          <Mascot state="concerned" size={90} />
          <h2>{t('player.block.drivingTitle')}</h2>
          <p>{t('player.block.drivingText')}</p>
          <button type="button" className="btn" onClick={() => setBlocker(null)}>{t('common.ok')}</button>
        </Overlay>
      )}
      {blocker === 'prayer' && (
        <Overlay label={t('player.block.prayerTitle')}>
          <Mascot state="calm" size={90} />
          <h2>{t('player.block.prayerTitle')}</h2>
          <p>{t('player.block.prayerText')}</p>
          <button type="button" className="btn" onClick={() => setBlocker(null)}>{t('common.ok')}</button>
        </Overlay>
      )}
      {blocker && typeof blocker === 'object' && (
        <Overlay label={t('player.block.conflictTitle')}>
          <h2>{t('player.block.conflictTitle')}</h2>
          <p>{t('player.block.conflictText')}</p>
          <div className="row row--c">
            <button type="button" className="btn" onClick={() => { setBlocker(null); resume('continue'); }}>{t('player.block.finishIt')}</button>
            <button type="button" className="btn alt" onClick={() => { const { conflict } = blocker; setBlocker(null); begin(conflict); }}>{t('player.block.startNew')}</button>
          </div>
        </Overlay>
      )}
    </Ctx.Provider>
  );
}
