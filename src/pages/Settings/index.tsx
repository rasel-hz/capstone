import { Flame, Palette, ShieldCheck, Trash2, UserRound, Accessibility, MapPin, Languages } from 'lucide-react';
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
  const [ask, setAsk] = useState<'wipe' | null>(null);
  const [saved, setSaved] = useState<Msg>('');
  const place = placeOf(s);
  const set = (fn: Parameters<typeof store.update>[0]) => store.update(fn);

  function flash(key: string) {
    setSaved(key);
    setTimeout(() => setSaved(''), 2500);
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

      <Group id="journey" title={t('path.settings.title')} icon={Flame}>
        <SettingRow title={t('path.settings.answers')} note={t('path.settings.answersNote')}><button type="button" className="btn sm alt" onClick={() => onNavigate('path')}>{t('path.settings.open')}</button></SettingRow>
        <SettingRow title={t('path.settings.streak')} note={t('path.settings.streakNote')}><Toggle label={t('path.settings.streak')} on={!!s.streakOn} onChange={(v) => set((d) => { d.streakOn = v ? 1 : 0; })} /></SettingRow>
        <SettingRow title={t('path.settings.grace')} note={t('path.settings.graceNote')}><Toggle label={t('path.settings.grace')} on={!!s.streakGrace} onChange={(v) => set((d) => { d.streakGrace = v ? 1 : 0; })} /></SettingRow>
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
          </>
        )}
      </Group>

      <Group id="privacy" title={t('settings.privacy')} icon={ShieldCheck}>
        <div className="row">
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
    </>
  );
}
