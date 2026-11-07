import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useBackHandler } from '../../services/native';
import { Mascot } from '../../components/mascot/Mascot';
import { Overlay } from '../../components/ui/Overlay';
import { useStore } from '../../context/AppStateContext';
import type { PlannedItem, ViewId } from '../../types';
import { acknowledge, needsCheckIn } from '../prayer/gate';
import { PrayerBreakView, PrayerCheckIn } from '../prayer/PrayerBreak';
import type { PrayerWindow } from '../prayer/times';
import { advance, createMission, currentItem, hasOpenMission, isPastEnd, skipItem } from './engine';
import { MissionPlayer, type PlayerStart } from './MissionPlayer';
import { generateMission } from './planner';

export type ResumeChoice = 'continue' | 'restart' | 'easier' | 'skip';

interface MissionApi {
  start(items?: PlannedItem[]): void;
  resume(c: ResumeChoice): void;
  /** Opens the optional prayer break, for this window if there is one. */
  openBreak(w: PrayerWindow | null): void;
}

const Ctx = createContext<MissionApi | null>(null);
export const useMissions = () => {
  const m = useContext(Ctx);
  if (!m) throw new Error('useMissions needs MissionProvider');
  return m;
};

type Blocker = 'driving' | { checkIn: PrayerWindow; then(): void } | { conflict: PlannedItem[] } | null;

export function MissionProvider({ children, onNavigate }: { children: ReactNode; onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const store = useStore();
  const [player, setPlayer] = useState<{ start: PlayerStart; key: number } | null>(null);
  const [blocker, setBlocker] = useState<Blocker>(null);
  const [breakFor, setBreakFor] = useState<{ w: PrayerWindow | null } | null>(null);

  // While the player or a dialog is open, the app behind it can't be reached by keyboard or screen reader.
  const covered = !!player || !!blocker || !!breakFor;
  useEffect(() => {
    const app = document.getElementById('app');
    if (app) app.inert = covered;
    return () => { if (app) app.inert = false; };
  }, [covered]);

  const open = useCallback((st: PlayerStart) => setPlayer((p) => ({ start: st, key: (p?.key ?? 0) + 1 })), []);

  // Driving still blocks every interactive challenge. A prayer window only asks, once, and the user decides.
  const guarded = useCallback((then: () => void) => {
    const s = store.getState();
    if (s.driving) return setBlocker('driving');
    const w = needsCheckIn(s);
    if (w) return setBlocker({ checkIn: w, then });
    then();
  }, [store]);

  const resumeNow = useCallback((c: ResumeChoice) => {
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
  }, [store, open]);

  const resume = useCallback((c: ResumeChoice) => guarded(() => resumeNow(c)), [guarded, resumeNow]);

  const begin = useCallback((items?: PlannedItem[]) => {
    store.update((d) => createMission(d, items || generateMission(d), !!items));
    open('intro');
  }, [store, open]);

  const start = useCallback((items?: PlannedItem[]) => guarded(() => {
    const s = store.getState();
    if (hasOpenMission(s)) {
      // An open mission is always resumed, never replaced silently.
      if (!items) return resumeNow('continue');
      setBlocker({ conflict: items });
      return;
    }
    begin(items);
  }), [store, guarded, resumeNow, begin]);

  const openBreak = useCallback((w: PrayerWindow | null) => setBreakFor({ w }), []);

  // Continue after a break: the saved mission if there is one, otherwise back to Home.
  const continueAfterBreak = useCallback(() => {
    setBreakFor(null);
    if (hasOpenMission(store.getState())) resumeNow('continue');
    else onNavigate('home');
  }, [store, resumeNow, onNavigate]);

  useBackHandler(() => { setBlocker(null); setBreakFor(null); }, !!blocker || !!breakFor);

  const api = useMemo(() => ({ start, resume, openBreak }), [start, resume, openBreak]);

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
      {blocker && typeof blocker === 'object' && 'checkIn' in blocker && (
        <Overlay label={t('prayer.check.title')}>
          <PrayerCheckIn
            window={blocker.checkIn}
            onPrayed={() => { const { checkIn, then } = blocker; store.update((d) => acknowledge(d, checkIn, 'prayed')); setBlocker(null); then(); }}
            onNotYet={() => { const { checkIn } = blocker; setBlocker(null); setBreakFor({ w: checkIn }); }}
            onNotNow={() => { const { checkIn, then } = blocker; store.update((d) => acknowledge(d, checkIn, 'later')); setBlocker(null); then(); }}
          />
          <button type="button" className="btn-link" onClick={() => { setBlocker(null); onNavigate('set'); }}>{t('prayer.check.settings')}</button>
        </Overlay>
      )}
      {blocker && typeof blocker === 'object' && 'conflict' in blocker && (
        <Overlay label={t('player.block.conflictTitle')}>
          <h2>{t('player.block.conflictTitle')}</h2>
          <p>{t('player.block.conflictText')}</p>
          <div className="row row--c">
            <button type="button" className="btn" onClick={() => { setBlocker(null); resumeNow('continue'); }}>{t('player.block.finishIt')}</button>
            <button type="button" className="btn alt" onClick={() => { const { conflict } = blocker; setBlocker(null); begin(conflict); }}>{t('player.block.startNew')}</button>
          </div>
        </Overlay>
      )}
      {breakFor && (
        <Overlay label={t('prayer.break.title')}>
          <PrayerBreakView window={breakFor.w} onClose={() => setBreakFor(null)} onContinue={continueAfterBreak} />
        </Overlay>
      )}
    </Ctx.Provider>
  );
}
