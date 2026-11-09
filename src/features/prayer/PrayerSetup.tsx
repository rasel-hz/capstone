import { LocateFixed, MapPin, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CITY_IDS, nearestCity, roundCoord, validTz, type PrayerPlace } from './times';

export interface PlaceChoice {
  city: string;
  loc: PrayerPlace | null;
}

type Status = 'idle' | 'explain' | 'locating' | 'denied' | 'timeout' | 'unavailable' | 'insecure' | 'unsupported';

/**
 * Optional prayer-time location: the device's location once, or a city from the list. Location is
 * asked for only after explaining why, used to calculate times on the device, rounded to about 1 km,
 * and never sent anywhere. Every failure leaves the city list working.
 */
export function PrayerSetup({ value, onChange, onSkip }: { value: PlaceChoice; onChange(v: PlaceChoice): void; onSkip?(): void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('idle');
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');

  function locate() {
    if (!('geolocation' in navigator)) return setStatus('unsupported');
    if (!window.isSecureContext) return setStatus('insecure');
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // The device's own time zone is the zone of where it is now, which is what prayer times need.
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!validTz(tz)) return setStatus('unavailable');
        onChange({ city: '', loc: { lat: roundCoord(pos.coords.latitude), lng: roundCoord(pos.coords.longitude), tz } });
        setStatus('idle');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60_000 },
    );
  }

  const near = value.loc ? nearestCity(value.loc.lat, value.loc.lng) : null;
  const current = value.loc
    ? near ? t('prayer.setup.nearCity', { city: t(`common.cities.${near}`) }) : t('prayer.setup.yourLocation')
    : value.city ? t(`common.cities.${value.city}`) : null;
  const term = q.trim().toLowerCase();
  const cities = CITY_IDS.filter((c) => !term || t(`common.cities.${c}`).toLowerCase().includes(term) || c.includes(term));

  return (
    <div className="psu">
      {current ? (
        <div className="psu__current">
          {value.loc ? <LocateFixed size={18} aria-hidden="true" /> : <MapPin size={18} aria-hidden="true" />}
          <span className="grow"><b>{current}</b>{value.loc && <span className="note"> · {value.loc.tz}</span>}</span>
          <button type="button" className="btn sm alt" onClick={() => { onChange({ city: '', loc: null }); setStatus('idle'); }}>
            <Trash2 size={14} aria-hidden="true" /> {t(value.loc ? 'prayer.setup.removeLoc' : 'prayer.setup.clearCity')}
          </button>
        </div>
      ) : (
        <div className="psu__intro">
          <b>{t('prayer.setup.title')}</b>
        </div>
      )}

      {status === 'explain' ? (
        <div className="psu__explain" role="group" aria-label={t('prayer.setup.useLoc')}>
          <p>{t('prayer.setup.why')}</p>
          <div className="row">
            <button type="button" className="btn sm" onClick={locate}>{t('prayer.setup.allow')}</button>
            <button type="button" className="btn sm alt" onClick={() => setStatus('idle')}>{t('common.cancel')}</button>
          </div>
        </div>
      ) : (
        <div className="row">
          <button type="button" className="btn sm" disabled={status === 'locating'} onClick={() => setStatus('explain')}><LocateFixed size={15} aria-hidden="true" /> {t(status === 'locating' ? 'prayer.setup.locating' : 'prayer.setup.useLoc')}</button>
          <button type="button" className="btn sm alt" aria-expanded={picking} onClick={() => setPicking(!picking)}><MapPin size={15} aria-hidden="true" /> {t('prayer.setup.chooseCity')}</button>
          {onSkip && <button type="button" className="btn-link" onClick={onSkip}>{t('prayer.setup.skip')}</button>}
        </div>
      )}
      {['denied', 'timeout', 'unavailable', 'insecure', 'unsupported'].includes(status) && <p className="hint" role="alert">{t(`prayer.setup.err.${status}`)}</p>}

      {picking && (
        <div className="psu__pick">
          <label className="psu__search">
            <Search size={15} aria-hidden="true" />
            <input type="search" dir="auto" aria-label={t('prayer.setup.search')} placeholder={t('prayer.setup.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="tags" role="listbox" aria-label={t('prayer.setup.chooseCity')}>
            {cities.map((c) => (
              <button key={c} type="button" role="option" aria-selected={value.city === c} className={`tag tag--btn ${value.city === c ? 'on' : ''}`} onClick={() => { onChange({ city: c, loc: null }); setPicking(false); setQ(''); setStatus('idle'); }}>
                {t(`common.cities.${c}`)}
              </button>
            ))}
            {!cities.length && <span className="note">{t('prayer.setup.noMatch')}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
