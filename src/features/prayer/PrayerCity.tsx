import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLang } from '../../i18n';
import { CITY_IDS, DEFAULT_SETTINGS, formatPrayerTime, placeNext, placeTimes, PRAYERS, type PrayerPlace, type PrayerSettings } from './times';

/** Empty value means the user enters the prayer time by hand. */
export function CitySelect({ id, value, onChange }: { id?: string; value: string; onChange(city: string): void }) {
  const { t } = useTranslation();
  return (
    <select id={id} className="city-select" aria-label={id ? undefined : t('common.prayer.city')} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t('common.prayer.manual')}</option>
      {CITY_IDS.map((c) => <option key={c} value={c}>{t(`common.cities.${c}`)}</option>)}
    </select>
  );
}

/** Re-renders every minute, so the next prayer moves on by itself. */
export function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Today's five prayers at the place, with the next one marked. Sunrise is shown apart: it isn't a prayer. */
export function TodayPrayers({ place, settings = DEFAULT_SETTINGS }: { place: PrayerPlace; settings?: PrayerSettings }) {
  const { t } = useTranslation();
  const now = useMinute();
  const times = placeTimes(place, now, 0, settings);
  const next = placeNext(place, now, settings);
  if (!times) return <p className="hint">{t('prayer.noTimes')}</p>;
  const fmt = (d: Date) => formatPrayerTime(d, currentLang(), place.tz);
  return (
    <>
      <ul className="prayers" aria-label={t('prayer.todayList')}>
        {PRAYERS.map((p) => (
          <li key={p} className={next?.at.getTime() === times[p].getTime() ? 'on' : ''}>
            <span>{t(`common.prayer.names.${p}`)}</span>
            <b>{fmt(times[p])}</b>
          </li>
        ))}
      </ul>
      <p className="note">{t('prayer.sunrise', { time: fmt(times.sunrise) })}</p>
    </>
  );
}
