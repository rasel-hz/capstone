import { Bell, Clock, Pause, Play, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../../components/mascot/Mascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { hasOpenMission } from '../mission/engine';
import { clock } from '../../utils';
import { Ring } from '../challenges/games/parts';
import { BREAK_CHOICES, breakLeft, endBreak, pauseBreak, resumeBreak, setBreakLength, startBreak } from './gate';
import type { PrayerWindow } from './times';

/** Re-renders every second while a reminder runs. */
function useSecond(on: boolean) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [on]);
}

/** Lets the user pick a length: the suggested ones or their own, 1 to 120 minutes. */
function Lengths({ onPick }: { onPick(m: number): void }) {
  const { t } = useTranslation();
  const [custom, setCustom] = useState('');
  const n = Number(custom);
  return (
    <div className="pbk__len">
      <div className="tags tags--c" role="group" aria-label={t('prayer.break.lengthLabel')}>
        {BREAK_CHOICES.map((m) => <button key={m} type="button" className="tag tag--btn" onClick={() => onPick(m)}>{t('common.minutes', { count: m })}</button>)}
      </div>
      <form className="pbk__custom" onSubmit={(e) => { e.preventDefault(); if (n >= 1 && n <= 120) onPick(n); }}>
        <label htmlFor="pbk-min" className="note">{t('prayer.break.custom')}</label>
        <input id="pbk-min" type="number" inputMode="numeric" min={1} max={120} value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button type="submit" className="btn sm alt" disabled={!(n >= 1 && n <= 120)}>{t('common.ok')}</button>
      </form>
    </div>
  );
}

/**
 * The optional prayer break. A personal reminder only: it never decides that anyone prayed, the mission
 * stays saved, and the user can leave the app and come back. Saved in state, so closing the app,
 * reloading or switching language keeps the same reminder.
 */
export function PrayerBreakView({ window: w, onClose, onContinue }: { window: PrayerWindow | null; onClose(): void; onContinue(): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const b = s.prayerBreak;
  const [changing, setChanging] = useState(false);
  const [back, setBack] = useState(false);
  const left = b ? breakLeft(b) : 0;
  const running = !!b && b.pausedLeft == null && left > 0;
  useSecond(running);
  const saved = hasOpenMission(s);
  const prayer = b ? b.prayer : w && !w.manual ? w.id : null;

  // A gentle reminder when the time is up. A system notification only if the user already allowed them.
  useEffect(() => {
    if (!b || left > 0 || b.pausedLeft != null) return;
    try {
      if (s.notif && document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification(t('prayer.break.upTitle'), { body: t('prayer.break.upText') });
    } catch {
      // Notifications are optional.
    }
    // Runs once when the reminder reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b?.start, left === 0]);

  // Welcome back: after "I'm back", or when the reminder is up.
  if (back || (b && left === 0 && b.pausedLeft == null)) {
    return (
      <div className="pbk" role="group" aria-labelledby="pbk-t">
        <Mascot state="happy" size={84} />
        <h2 id="pbk-t">{t('prayer.break.welcome')}</h2>
        {!back && <p className="note">{t('prayer.break.upText')}</p>}
        {saved && <p className="note">{t('prayer.break.saved')}</p>}
        {changing ? <Lengths onPick={(m) => { store.update((d) => setBreakLength(d, m)); setChanging(false); setBack(false); }} /> : (
          <div className="row row--c">
            <button type="button" className="btn" onClick={() => { store.update((d) => endBreak(d)); onContinue(); }}><Play size={16} aria-hidden="true" /> {t(saved ? 'prayer.break.continue' : 'prayer.break.toActivities')}</button>
            {!back && <button type="button" className="btn alt" onClick={() => setChanging(true)}>{t('prayer.break.more')}</button>}
            <button type="button" className="btn alt" onClick={() => { store.update((d) => endBreak(d)); onClose(); }}>{t('prayer.break.inABit')}</button>
          </div>
        )}
      </div>
    );
  }

  // Choose a length. Nothing starts until the user does.
  if (!b) {
    return (
      <div className="pbk" role="group" aria-labelledby="pbk-t">
        <Mascot state="calm" size={84} />
        <h2 id="pbk-t">{t('prayer.break.title')}</h2>
        <p>{t('prayer.break.text')}</p>
        <p className="note">{t('prayer.break.lengthQ')}</p>
        <Lengths onPick={(m) => store.update((d) => startBreak(d, w, m))} />
        <div className="row row--c"><button type="button" className="btn-link" onClick={onClose}>{t('prayer.break.dashboard')}</button></div>
      </div>
    );
  }

  return (
    <div className="pbk pbk--run" role="group" aria-labelledby="pbk-t">
      <p className="eyebrow">{prayer ? t('prayer.break.forPrayer', { prayer: t(`common.prayer.names.${prayer}`) }) : t('prayer.break.title')}</p>
      <Ring value={left / (b.mins * 60_000)} size={170}>
        <span className="timer-big" role="timer" aria-label={t('prayer.break.leftLabel', { time: clock(Math.ceil(left / 1000)) })}>{clock(Math.ceil(left / 1000))}</span>
      </Ring>
      <h2 id="pbk-t">{t(saved ? 'prayer.break.saved' : 'prayer.break.takeTime')}</h2>
      <p className="note">{t('prayer.break.reminderOnly')}</p>
      {changing ? <Lengths onPick={(m) => { store.update((d) => setBreakLength(d, m)); setChanging(false); }} /> : (
        <>
          <div className="row row--c">
            <button type="button" className="btn" onClick={() => setBack(true)}>{t('prayer.break.back')}</button>
            {b.pausedLeft == null
              ? <button type="button" className="btn alt" onClick={() => store.update((d) => pauseBreak(d))}><Pause size={15} aria-hidden="true" /> {t('prayer.break.pause')}</button>
              : <button type="button" className="btn alt" onClick={() => store.update((d) => resumeBreak(d))}><Timer size={15} aria-hidden="true" /> {t('prayer.break.resume')}</button>}
          </div>
          <div className="row row--c">
            <button type="button" className="btn-link" onClick={() => setChanging(true)}><Clock size={14} aria-hidden="true" /> {t('prayer.break.change')}</button>
            <button type="button" className="btn-link" onClick={() => { store.update((d) => { d.prayerBreak = null; }); onClose(); }}>{t('prayer.break.cancel')}</button>
            <button type="button" className="btn-link" onClick={onClose}>{t('prayer.break.dashboard')}</button>
          </div>
        </>
      )}
      {!!s.notif && <p className="note"><Bell size={13} aria-hidden="true" /> {t('prayer.break.notifNote')}</p>}
    </div>
  );
}

/** The check-in: three calm answers, none required, none rewarded. */
export function PrayerCheckIn({ window: w, onPrayed, onNotYet, onNotNow, compact }: { window: PrayerWindow; onPrayed(): void; onNotYet(): void; onNotNow(): void; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className={`pci ${compact ? 'pci--compact' : ''}`} role="group" aria-labelledby="pci-t">
      {!compact && <Mascot state="calm" size={72} />}
      <div className="grow">
        <h2 id="pci-t">{t('prayer.check.title')}{w.manual ? '' : ` · ${t(`common.prayer.names.${w.id}`)}`}</h2>
        <p className="note flush">{t('prayer.check.text')}</p>
        <div className="pci__act">
          <button type="button" className="btn sm" onClick={onPrayed}>{t('prayer.check.prayed')}</button>
          <button type="button" className="btn sm alt" onClick={onNotYet}>{t('prayer.check.notYet')}</button>
          <button type="button" className="btn sm alt" onClick={onNotNow}>{t('prayer.check.notNow')}</button>
        </div>
      </div>
    </div>
  );
}
