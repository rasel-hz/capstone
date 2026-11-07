import { CalendarOff, CarFront, Download, Palette, ShieldCheck, Trash2, Type, UserRound, Accessibility, MapPin, Languages } from 'lucide-react';
import { LogoutButton } from '../../features/auth/AuthViews';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, IconBadge, PageHeader, Segmented, SettingRow, Toggle } from '../../components/ui/kit';
import { useAppState, useStore } from '../../context/AppStateContext';
import { JOURNEYS } from '../../features/challenges/catalog';
import { TodayPrayers } from '../../features/prayer/PrayerCity';
import { placeOf, settingsOf, turnOff } from '../../features/prayer/gate';
import { PrayerSetup } from '../../features/prayer/PrayerSetup';
import { METHODS, type MethodId } from '../../features/prayer/times';
import { clearTypedText, typedCount } from '../../features/plan/privacy';
import { formatList, type Lang, type Msg, msg } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { level, today } from '../../utils';
import type { Gender, ViewId } from '../../types';
import type { LucideIcon } from 'lucide-react';

const Group = ({ id, title, icon, children }: { id: string; title: string; icon: LucideIcon; children: React.ReactNode }) => (
  <section className="panel set-g" id={id} aria-labelledby={`${id}-t`}>
    <div className="sec-title"><IconBadge icon={icon} tone="lil" /><h2 id={`${id}-t`}>{title}</h2></div>
    {children}
  </section>
);


export function Settings({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const language = useLanguage();
  const [name, setName] = useState(s.name);
  const [prayer, setPrayer] = useState(s.prayer);
  const [ask, setAsk] = useState<'wipe' | 'typed' | null>(null);
  const [saved, setSaved] = useState<Msg>('');
  const typedN = typedCount(s);
  const place = placeOf(s);
  const set = (fn: Parameters<typeof store.update>[0]) => store.update(fn);

  function flash(key: string) {
    setSaved(key);
    setTimeout(() => setSaved(''), 2500);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(store.getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'khowayk-data.json';
    a.click();
    URL.revokeObjectURL(a.href);
    flash('settings.flashExport');
  }

  function clearTyped() {
    set(clearTypedText);
    setAsk(null);
    flash('settings.flashTyped');
  }

  function wipe() {
    store.reset();
    location.reload();
  }

  const journeyNames = formatList(JOURNEYS.filter((j) => s.needs.includes(j.id)).map((j) => t(`journeys.items.${j.id}.name`))) || t('settings.noJourneys');
  const genders: { value: Gender; label: string }[] = [{ value: 'm', label: t('common.masculine') }, { value: 'f', label: t('common.feminine') }];
  const langs: { value: Lang; label: string }[] = [{ value: 'ar-SA', label: 'العربية' }, { value: 'en', label: 'English' }];

  return (
    <>
      <PageHeader title={t('settings.title')} sub={t('settings.sub')} />
      <p className="sr-status" role="status">{msg(saved)}</p>

      <Group id="personal" title={t('settings.personal')} icon={UserRound}>
        <SettingRow title={t('settings.name')}>
          <div className="row">
            <input aria-label={t('settings.nameLabel')} dir="auto" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            <button type="button" className="btn sm alt" onClick={() => { set((d) => { d.name = name.trim() || d.name; }); flash('settings.flashName'); }}>{t('common.save')}</button>
          </div>
        </SettingRow>
        <SettingRow title={t('settings.address')} note={t('settings.addressNote')}><Segmented<Gender> label={t('settings.address')} value={s.g} options={genders} onChange={(g) => set((d) => { d.g = g; })} /></SettingRow>
        <SettingRow title={t('settings.journeys')} note={journeyNames}><button type="button" className="btn sm alt" onClick={() => onNavigate('journeys')}>{t('settings.edit')}</button></SettingRow>
        <SettingRow title={t('settings.missionLength')} note={t('settings.missionLengthNote')}>
          <Segmented<string> label={t('settings.missionLength')} value={s.pref === 'short' ? 'short' : 'normal'} options={[{ value: 'normal', label: t('settings.lengthNormal') }, { value: 'short', label: t('settings.lengthShort') }]} onChange={(v) => set((d) => { d.pref = v === 'short' ? 'short' : null; })} />
        </SettingRow>
        <SettingRow title={t('settings.active')}><Segmented<string> label={t('settings.active')} value={s.pat || null} options={[{ value: 'am', label: t('common.morning') }, { value: 'pm', label: t('common.evening') }]} onChange={(v) => set((d) => { d.pat = v; })} /></SettingRow>
      </Group>

      <Group id="language" title={t('settings.language')} icon={Languages}>
        <SettingRow title={t('settings.languageRow')} note={t('settings.languageNote')}>
          <Segmented<Lang> label={t('settings.languageRow')} value={language.lang} options={langs} onChange={language.change} />
        </SettingRow>
      </Group>

      <Group id="access" title={t('settings.access')} icon={Accessibility}>
        <SettingRow title={t('settings.motion')} note={t('settings.motionNote')}><Toggle label={t('settings.motion')} on={!!s.rm} onChange={(v) => set((d) => { d.rm = v ? 1 : 0; })} /></SettingRow>
        <SettingRow title={t('settings.sound')} note={t('settings.soundNote')}><Toggle label={t('settings.sound')} on={!!s.snd} onChange={(v) => set((d) => { d.snd = v ? 1 : 0; })} /></SettingRow>
        <SettingRow title={t('settings.largeText')}><Toggle label={t('settings.largeText')} on={!!s.largeText} onChange={(v) => set((d) => { d.largeText = v ? 1 : 0; })} /></SettingRow>
      </Group>

      <Group id="day" title={t('settings.day')} icon={MapPin}>
        <SettingRow title={t('settings.schedule')}><Segmented<string> label={t('settings.schedule')} value={s.sched} options={['work', 'study', 'flex'].map((v) => ({ value: v, label: t(`common.sched.${v}`) }))} onChange={(v) => set((d) => { d.sched = v; })} /></SettingRow>
        <SettingRow title={t('prayer.settings.on')} note={t('prayer.settings.onNote')}>
          <Toggle label={t('prayer.settings.on')} on={!!s.prayerOn} onChange={(v) => { set((d) => { if (v) d.prayerOn = 1; else turnOff(d); }); flash(v ? 'prayer.settings.flashOn' : 'prayer.settings.flashOff'); }} />
        </SettingRow>
        {!!s.prayerOn && (
          <>
            <PrayerSetup value={{ city: s.city, loc: s.loc }} onChange={(v) => { set((d) => { d.city = v.city; d.loc = v.loc; }); flash(v.loc || v.city ? 'settings.flashCity' : 'settings.flashManual'); }} />
            {place ? (
              <>
                <TodayPrayers place={place} settings={settingsOf(s)} />
                <p className="note">{t('prayer.settings.calcNote', { method: t(`prayer.methods.${s.prayerMethod}`) })}</p>
                <SettingRow title={t('prayer.settings.method')} note={t('prayer.settings.methodNote')}>
                  <select className="city-select" aria-label={t('prayer.settings.method')} value={s.prayerMethod} onChange={(e) => set((d) => { d.prayerMethod = e.target.value as MethodId; })}>
                    {METHODS.map((m) => <option key={m} value={m}>{t(`prayer.methods.${m}`)}</option>)}
                  </select>
                </SettingRow>
                <SettingRow title={t('prayer.settings.asr')}>
                  <Segmented<number> label={t('prayer.settings.asr')} value={s.prayerAsr} options={[0, 1].map((v) => ({ value: v, label: t(`prayer.settings.asrOpt.${v}`) }))} onChange={(v) => set((d) => { d.prayerAsr = v === 1 ? 1 : 0; })} />
                </SettingRow>
              </>
            ) : (
              <SettingRow title={t('settings.nextPrayer')} note={t('settings.nextPrayerNote')}>
                <div className="row">
                  <input type="time" aria-label={t('settings.prayerLabel')} value={prayer} onChange={(e) => setPrayer(e.target.value)} />
                  <button type="button" className="btn sm alt" onClick={() => { set((d) => { d.prayer = prayer; d.prayerDay = today(); }); flash('settings.flashPrayer'); }}>{t('common.save')}</button>
                </div>
              </SettingRow>
            )}
            <SettingRow title={t('settings.protect')} note={t('prayer.settings.protectNote')}><Segmented<number> label={t('settings.protectLabel')} value={s.pp} options={[0, 20, 30, 45].map((v) => ({ value: v, label: v ? t('common.minShort', { n: v }) : t('settings.none') }))} onChange={(v) => set((d) => { d.pp = v; })} /></SettingRow>
            <SettingRow title={t('prayer.settings.ask')} note={t('prayer.settings.askNote')}>
              <Toggle label={t('prayer.settings.ask')} on={!!s.prayerAsk} onChange={(v) => set((d) => { d.prayerAsk = v ? 1 : 0; })} />
            </SettingRow>
          </>
        )}
        <div className="set-note"><CarFront size={18} aria-hidden="true" /><div>
          <b>{t('settings.driving')}</b>
          <p className="note flush">{t('settings.drivingNote')}</p>
        </div></div>
        <SettingRow title={t('settings.drivingNow')} note={t('settings.drivingNowNote')}><Toggle label={t('settings.drivingNow')} on={!!s.driving} onChange={(v) => set((d) => { d.driving = v ? 1 : 0; })} /></SettingRow>
        <SettingRow title={t('settings.driveHours')} note={t('settings.driveHoursNote')}>
          <input type="number" min={0} max={12} className="num-input" aria-label={t('settings.driveHours')} value={s.drive} onChange={(e) => { const v = Math.max(0, Math.min(12, +e.target.value)); set((d) => { d.drive = v; }); }} />
        </SettingRow>
        {s.drive >= 2 && <p className="insight">{t('settings.driveBreak', { n: s.drive })}</p>}
        <div className="set-note"><CalendarOff size={18} aria-hidden="true" /><p className="note flush">{t('settings.notConnected')}</p></div>
      </Group>

      <Group id="privacy" title={t('settings.privacy')} icon={ShieldCheck}>
        <SettingRow title={t('settings.ai')} note={t('settings.aiNote')}>
          <Toggle label={t('settings.ai')} on={s.aiConsent === 1} onChange={(v) => set((d) => { d.aiConsent = v ? 1 : 0; })} />
        </SettingRow>
        <div className="set-sub">
          <b>{t('settings.stored')}</b>
          <ul className="plain">
            <li>{t('settings.storedAttempts', { n: s.hist.length, xp: s.xp, level: level(s) })}</li>
            <li>{t('settings.storedEnergy', { n: s.en.length, m: s.chat.filter((m) => !m.b).length })}</li>
            <li>{t('settings.storedTyped', { n: typedN })}</li>
          </ul>
        </div>
        <div className="set-sub">
          <b>{t('settings.approved')}</b>
          {s.ctx.length ? (
            <div className="tags">{s.ctx.map((c) => <button key={c} type="button" className="tag tag--btn" aria-label={t('settings.removeFact', { fact: t(`common.context.${c}`) })} onClick={() => set((d) => { d.ctx = d.ctx.filter((x) => x !== c); })}>{t(`common.context.${c}`)} <Trash2 size={13} aria-hidden="true" /></button>)}</div>
          ) : <p className="note flush">{t('settings.approvedEmpty')}</p>}
        </div>
        <div className="row">
          <button type="button" className="btn sm alt" onClick={exportData}><Download size={15} aria-hidden="true" /> {t('settings.export')}</button>
          <button type="button" className="btn sm alt" disabled={!typedN} onClick={() => setAsk('typed')}><Type size={15} aria-hidden="true" /> {t('settings.clearTyped')}</button>
          <button type="button" className="btn sm btn--danger" onClick={() => setAsk('wipe')}><Trash2 size={15} aria-hidden="true" /> {t('settings.wipe')}</button>
        </div>
      </Group>

      <Group id="app-pref" title={t('settings.app')} icon={Palette}>
        <SettingRow title={t('settings.theme')} note={t(level(s) >= 3 ? 'settings.themeOpen' : 'settings.themeLocked')}>
          {level(s) >= 3
            ? <Toggle label={t('settings.theme')} on={s.theme === 'lilac'} onChange={(v) => set((d) => { d.theme = v ? 'lilac' : ''; })} />
            : <span className="tag tag--soft">{t('settings.locked')}</span>}
        </SettingRow>
        <SettingRow title={t('settings.notifications')} note={t('settings.notificationsNote')}><span className="tag tag--soft">{t('settings.soon')}</span></SettingRow>
      </Group>

      {/* On phones the side bar's logout is hidden with the language switcher, so it appears here instead. */}
      <div className="logout-mobile"><LogoutButton /></div>

      {ask === 'wipe' && (
        <Dialog label={t('settings.wipeLabel')}>
          <h2>{t('settings.wipeQ')}</h2>
          <p>{t('settings.wipeText')}</p>
          <div className="row row--c">
            <button type="button" className="btn alt" onClick={() => setAsk(null)}>{t('common.back')}</button>
            <button type="button" className="btn btn--danger" onClick={wipe}>{t('settings.confirmDelete')}</button>
          </div>
        </Dialog>
      )}
      {ask === 'typed' && (
        <Dialog label={t('settings.typedLabel')}>
          <h2>{t('settings.typedQ')}</h2>
          <p>{t('settings.typedText')}</p>
          <div className="row row--c">
            <button type="button" className="btn alt" onClick={() => setAsk(null)}>{t('common.back')}</button>
            <button type="button" className="btn btn--danger" onClick={clearTyped}>{t('settings.confirmDelete')}</button>
          </div>
        </Dialog>
      )}
    </>
  );
}
