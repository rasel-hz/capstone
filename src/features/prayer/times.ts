import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';

// Prayer times are calculated on the device from the chosen city, with the Umm al-Qura method used in
// Saudi Arabia. No location is read and nothing is sent anywhere. Times can differ from a local mosque
// by a minute or two, and the screens say so.

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

// Saudi Arabia is UTC+3 all year, with no daylight saving.
const TZ = 'Asia/Riyadh';
const OFFSET_MS = 3 * 3600_000;
const MIN = 60_000;

/** The calendar day in Saudi Arabia, as a local date for adhan, which reads its year, month and day. */
function saudiDay(now: Date, addDays = 0): Date {
  const d = new Date(now.getTime() + OFFSET_MS);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + addDays);
}

/** True in Ramadan on the Umm al-Qura calendar. False if the device can't tell. */
export function isRamadan(now: Date): boolean {
  try {
    const m = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', timeZone: TZ }).formatToParts(now).find((p) => p.type === 'month');
    return m?.value === '9';
  } catch {
    return false;
  }
}

export function prayerTimes(city: string, now = new Date(), addDays = 0): Record<PrayerId, Date> | null {
  if (!Object.hasOwn(CITIES, city)) return null;
  const c = CITIES[city];
  const params = CalculationMethod.UmmAlQura();
  // Umm al-Qura sets Isha 90 minutes after Maghrib, and 120 minutes in Ramadan.
  if (isRamadan(now)) params.ishaInterval = 120;
  const p = new PrayerTimes(new Coordinates(c[0], c[1]), saudiDay(now, addDays), params);
  return { fajr: p.fajr, dhuhr: p.dhuhr, asr: p.asr, maghrib: p.maghrib, isha: p.isha };
}

/** The next prayer from now, moving to tomorrow's Fajr after Isha. */
export function nextPrayer(city: string, now = new Date()): { id: PrayerId; at: Date } | null {
  const today = prayerTimes(city, now);
  if (!today) return null;
  const id = PRAYERS.find((p) => today[p].getTime() > now.getTime());
  if (id) return { id, at: today[id] };
  return { id: 'fajr', at: prayerTimes(city, now, 1)!.fajr };
}

/** From two minutes before each call to prayer until the protected minutes after it end. */
export function inCalculatedWindow(city: string, mins: number, now = new Date()): boolean {
  const times = prayerTimes(city, now);
  if (!times || !mins) return false;
  return PRAYERS.some((p) => {
    const x = now.getTime() - times[p].getTime();
    return x >= -2 * MIN && x < mins * MIN;
  });
}

/** Saudi time in Western digits, matching the rest of the app. */
export const formatPrayerTime = (d: Date, lang: string) =>
  new Intl.DateTimeFormat(`${lang}-u-nu-latn`, { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(d);
