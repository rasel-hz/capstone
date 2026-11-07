import { CalculationMethod, Coordinates, Madhab, PrayerTimes, type CalculationParameters } from 'adhan';

// Prayer times are calculated on the device with the MIT-licensed adhan library. Saudi Arabia defaults
// to the Umm al-Qura method. Nothing is sent anywhere: no prayer API, no coordinates leave the phone.
// Times can differ from a local mosque by a minute or two, and the screens say so.

export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYERS: PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// Names live in the locale files, under common.cities.<id>.
export const CITIES: Record<string, [lat: number, lng: number]> = {
  riyadh: [24.7136, 46.6753],
  jeddah: [21.4858, 39.1925],
  makkah: [21.3891, 39.8579],
  madinah: [24.5247, 39.5692],
  dammam: [26.4207, 50.0888],
  khobar: [26.2172, 50.1971],
  jubail: [27.0046, 49.646],
  ahsa: [25.3833, 49.5833],
  taif: [21.2703, 40.4158],
  buraidah: [26.326, 43.975],
  hail: [27.5114, 41.7208],
  tabuk: [28.3835, 36.5662],
  abha: [18.2164, 42.5053],
  khamis: [18.3, 42.7333],
  jazan: [16.8892, 42.5511],
  najran: [17.565, 44.2289],
  baha: [20.0129, 41.4677],
  yanbu: [24.0895, 38.0618],
  sakaka: [29.9697, 40.2064],
  arar: [30.9753, 41.0381],
};
export const CITY_IDS = Object.keys(CITIES);

export const SAUDI_TZ = 'Asia/Riyadh';
const MIN = 60_000;

/** Supported calculation conventions. Umm al-Qura is the Saudi default, not the only valid one. */
export const METHODS = ['umm_al_qura', 'mwl', 'egyptian', 'karachi', 'isna', 'dubai', 'qatar', 'kuwait', 'turkey'] as const;
export type MethodId = (typeof METHODS)[number];
/** Asr: 0 is the standard (earlier) time, 1 is the Hanafi (later) time. */
export type AsrSchool = 0 | 1;

/** Where times are calculated for. Coordinates are rounded to about 1 km before they are kept. */
export interface PrayerPlace {
  lat: number;
  lng: number;
  tz: string;
}

export interface PrayerSettings {
  method: MethodId;
  asr: AsrSchool;
}
export const DEFAULT_SETTINGS: PrayerSettings = { method: 'umm_al_qura', asr: 0 };

export const roundCoord = (v: number) => Math.round(v * 100) / 100;
export const isMethod = (v: unknown): v is MethodId => typeof v === 'string' && (METHODS as readonly string[]).includes(v);

export function validTz(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const cityPlace = (city: string): PrayerPlace | null =>
  Object.hasOwn(CITIES, city) ? { lat: CITIES[city][0], lng: CITIES[city][1], tz: SAUDI_TZ } : null;

/** The nearest listed city within 40 km, so a detected location can be shown by name. */
export function nearestCity(lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestKm = 40;
  for (const id of CITY_IDS) {
    const [a, b] = CITIES[id];
    const km = Math.hypot((a - lat) * 111, (b - lng) * 111 * Math.cos((lat * Math.PI) / 180));
    if (km < bestKm) { best = id; bestKm = km; }
  }
  return best;
}

/** Year, month and day in a time zone, so "today" follows the place, not the device. */
function partsIn(now: Date, tz: string) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}
/** The local calendar day at the place, as a date adhan reads the year, month and day from. */
function localDay(now: Date, tz: string, addDays = 0): Date {
  const { y, m, d } = partsIn(now, tz);
  return new Date(y, m - 1, d + addDays);
}
/** The place's date as YYYY-MM-DD, used to key a prayer window. */
export function localDate(now: Date, tz: string, addDays = 0): string {
  const x = localDay(now, tz, addDays);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/** True in Ramadan on the Umm al-Qura calendar. False if the device can't tell. */
export function isRamadan(now: Date, tz = SAUDI_TZ): boolean {
  try {
    const m = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', timeZone: tz }).formatToParts(now).find((p) => p.type === 'month');
    return m?.value === '9';
  } catch {
    return false;
  }
}

function params(set: PrayerSettings, now: Date, tz: string): CalculationParameters {
  const make: Record<MethodId, () => CalculationParameters> = {
    umm_al_qura: CalculationMethod.UmmAlQura,
    mwl: CalculationMethod.MuslimWorldLeague,
    egyptian: CalculationMethod.Egyptian,
    karachi: CalculationMethod.Karachi,
    isna: CalculationMethod.NorthAmerica,
    dubai: CalculationMethod.Dubai,
    qatar: CalculationMethod.Qatar,
    kuwait: CalculationMethod.Kuwait,
    turkey: CalculationMethod.Turkey,
  };
  const p = make[set.method]();
  p.madhab = set.asr === 1 ? Madhab.Hanafi : Madhab.Shafi;
  // Umm al-Qura sets Isha 90 minutes after Maghrib, and 120 minutes in Ramadan.
  if (set.method === 'umm_al_qura' && isRamadan(now, tz)) p.ishaInterval = 120;
  return p;
}

/** The five prayer times at a place on its local date. Sunrise is separate and is not a prayer. */
export function placeTimes(place: PrayerPlace, now = new Date(), addDays = 0, set: PrayerSettings = DEFAULT_SETTINGS): (Record<PrayerId, Date> & { sunrise: Date }) | null {
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng) || Math.abs(place.lat) > 90 || Math.abs(place.lng) > 180 || !validTz(place.tz)) return null;
  try {
    const p = new PrayerTimes(new Coordinates(place.lat, place.lng), localDay(now, place.tz, addDays), params(set, now, place.tz));
    const out = { fajr: p.fajr, sunrise: p.sunrise, dhuhr: p.dhuhr, asr: p.asr, maghrib: p.maghrib, isha: p.isha };
    // Very high latitudes can make some times impossible. Never show a broken time.
    return Object.values(out).every((d) => d instanceof Date && Number.isFinite(d.getTime())) ? out : null;
  } catch {
    return null;
  }
}

export function placeNext(place: PrayerPlace, now = new Date(), set: PrayerSettings = DEFAULT_SETTINGS): { id: PrayerId; at: Date } | null {
  const today = placeTimes(place, now, 0, set);
  if (!today) return null;
  const id = PRAYERS.find((p) => today[p].getTime() > now.getTime());
  if (id) return { id, at: today[id] };
  const tomorrow = placeTimes(place, now, 1, set);
  return tomorrow ? { id: 'fajr', at: tomorrow.fajr } : null;
}

export interface PrayerWindow {
  id: PrayerId;
  at: Date;
  end: Date;
  /** The place's date and the prayer, so an answer covers only this window. */
  key: string;
  /** From a time the user typed, so which prayer it is isn't known and no name is shown. */
  manual?: boolean;
}

/**
 * The protected window we're in, if any: from two minutes before a call to prayer until the protected
 * minutes after it end. Yesterday's Isha is checked too, because its window can cross midnight.
 */
export function placeWindow(place: PrayerPlace, mins: number, now = new Date(), set: PrayerSettings = DEFAULT_SETTINGS): PrayerWindow | null {
  if (!mins) return null;
  for (const addDays of [0, -1]) {
    const times = placeTimes(place, now, addDays, set);
    if (!times) continue;
    for (const id of addDays === 0 ? PRAYERS : (['isha'] as PrayerId[])) {
      const x = now.getTime() - times[id].getTime();
      if (x >= -2 * MIN && x < mins * MIN) return { id, at: times[id], end: new Date(times[id].getTime() + mins * MIN), key: `${localDate(now, place.tz, addDays)}:${id}` };
    }
  }
  return null;
}

// City-based helpers, kept for existing screens and tests. They use the Saudi defaults.
export const prayerTimes = (city: string, now = new Date(), addDays = 0) => {
  const p = cityPlace(city);
  const t = p ? placeTimes(p, now, addDays) : null;
  return t ? { fajr: t.fajr, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha } : null;
};
export const nextPrayer = (city: string, now = new Date()) => {
  const p = cityPlace(city);
  return p ? placeNext(p, now) : null;
};
export const inCalculatedWindow = (city: string, mins: number, now = new Date()) => {
  const p = cityPlace(city);
  return !!p && !!placeWindow(p, mins, now);
};

/** Time at the place in Western digits, matching the rest of the app. */
export const formatPrayerTime = (d: Date, lang: string, tz = SAUDI_TZ) =>
  new Intl.DateTimeFormat(`${lang}-u-nu-latn`, { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(d);
