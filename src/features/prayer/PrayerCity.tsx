import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLang } from '../../i18n';
import { CITY_IDS, formatPrayerTime, nextPrayer, PRAYERS, prayerTimes } from './times';

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

export function NextPrayerLine({ city }: { city: string }) {
  const { t } = useTranslation();
  const now = useMinute();
  const next = nextPrayer(city, now);
  if (!next) return null;
  return <b>{t('common.prayer.next', { prayer: t(`common.prayer.names.${next.id}`), time: formatPrayerTime(next.at, currentLang()) })}</b>;
}

/** Today's five prayers, with the next one marked. */
export function TodayPrayers({ city }: { city: string }) {
  const { t } = useTranslation();
  const now = useMinute();
  const times = prayerTimes(city, now);
  const next = nextPrayer(city, now);
  if (!times) return null;
  return (
    <ul className="prayers" aria-label={t('common.prayer.today', { city: t(`common.cities.${city}`) })}>
      {PRAYERS.map((p) => (
        <li key={p} className={next?.at.getTime() === times[p].getTime() ? 'on' : ''}>
          <span>{t(`common.prayer.names.${p}`)}</span>
          <b>{formatPrayerTime(times[p], currentLang())}</b>
        </li>
      ))}
    </ul>
  );
}
