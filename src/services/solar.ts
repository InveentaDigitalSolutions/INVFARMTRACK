/**
 * Where the sun is over the nursery, at any moment.
 *
 * Pure arithmetic — no API, no network. That is not only tidy: the Power Apps
 * player sets `connect-src 'none'`, so anything that had to ask a service for
 * the sun's position would fail there the way the CDN font did.
 *
 * The algorithm is the NOAA low-precision one, good to about a hundredth of a
 * degree over this century — far finer than anything else in the light model,
 * where a shade-cloth rating is known to maybe five per cent.
 *
 * At 14.98°N the site is inside the tropics, and two consequences drive
 * everything downstream:
 *
 * - The sun passes **north** of overhead from late April to mid-August and
 *   south of it the rest of the year, so shadows swing right through the
 *   compass twice a year rather than staying on one side.
 * - Day length barely moves — 11.1 h in December against 12.9 h in June — so
 *   the seasonal signal is almost entirely the sun's *angle*, not its hours.
 *   A growth model counting calendar days cannot see any of it.
 */

import { SITE_LAT, SITE_LON, SITE_UTC_OFFSET_H } from "./site";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface SunPosition {
  /** Degrees above the horizon. Negative when the sun is down. */
  altitude: number;
  /** Degrees clockwise from true north: 90 is due east, 270 due west. */
  azimuth: number;
}

/** Days since the J2000.0 epoch, the zero point the series below are built on. */
function julianDays(at: Date): number {
  return at.getTime() / 86_400_000 - 10_957.5;
}

/**
 * The sun's altitude and azimuth, seen from a given latitude and longitude.
 *
 * Defaults to the nursery, which is the only place it is used, but takes a
 * position so the arithmetic can be tested against published values for sites
 * where the answer is independently known.
 */
export function sunPosition(
  at: Date,
  latDeg: number = SITE_LAT,
  lonDeg: number = SITE_LON
): SunPosition {
  const d = julianDays(at);

  // Mean anomaly and ecliptic longitude of the sun.
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;

  // Obliquity, then right ascension and declination.
  const e = (23.439 - 3.6e-7 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));

  // Local sidereal time gives the hour angle: how far the sun is past due south.
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const lst = (((gmst * 15 + lonDeg) % 360) + 360) % 360 * RAD;
  const H = lst - ra;

  const lat = latDeg * RAD;
  const altitude = Math.asin(
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)
  );
  const azimuth = Math.atan2(
    -Math.sin(H),
    Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(H)
  );

  return {
    altitude: altitude * DEG,
    azimuth: ((azimuth * DEG) % 360 + 360) % 360,
  };
}

/**
 * A unit vector pointing at the sun, in the 3D model's own axes.
 *
 * The model has X to its right, Y up and Z along the beds. `modelNorthBearing`
 * is the real-world bearing that the model's -Z direction stands for, which is
 * why the beds being 17.75° off north matters here and nowhere else.
 *
 * Returns null when the sun is below the horizon: there is no direct light to
 * cast, and a vector pointing into the ground would silently light the beds
 * from underneath.
 */
export function sunVector(at: Date, modelNorthBearing: number): [number, number, number] | null {
  const { altitude, azimuth } = sunPosition(at);
  if (altitude <= 0) return null;

  const a = (azimuth - modelNorthBearing) * RAD;
  const alt = altitude * RAD;
  const horizontal = Math.cos(alt);
  // Model -Z is north, +X is east: the same handedness the compass uses.
  return [horizontal * Math.sin(a), Math.sin(alt), -horizontal * Math.cos(a)];
}

/** Local clock time at the nursery for a given instant. Honduras is UTC-6 all year. */
export function localHours(at: Date): number {
  return (((at.getUTCHours() + at.getUTCMinutes() / 60 + SITE_UTC_OFFSET_H) % 24) + 24) % 24;
}

/**
 * The instant of a given local clock time on a given local date.
 * Written this way rather than with a Date constructor because the machine
 * running this is not in Honduras — the browser's own zone must not leak in.
 */
export function atLocal(dateISO: string, hours: number): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + (hours - SITE_UTC_OFFSET_H) * 3_600_000);
}

export interface DayArc {
  /** Local decimal hours; null when the sun never rises or never sets. */
  sunrise: number | null;
  sunset: number | null;
  /** Hours between them. */
  daylight: number;
  /** The sun's highest altitude that day, and the bearing it reaches it on. */
  noonAltitude: number;
  noonAzimuth: number;
}

/**
 * The sun's arc over one local day, sampled a minute at a time.
 *
 * Sampling rather than solving: a minute is finer than any use here needs, it
 * costs nothing at this scale, and it cannot get the sign of a root wrong the
 * way a closed form can near the solstices.
 */
export function dayArc(dateISO: string): DayArc {
  let sunrise: number | null = null;
  let sunset: number | null = null;
  let noonAltitude = -90;
  let noonAzimuth = 0;
  let previousUp = false;

  for (let minute = 0; minute <= 1440; minute++) {
    const hours = minute / 60;
    const { altitude, azimuth } = sunPosition(atLocal(dateISO, hours));
    const up = altitude > 0;
    if (up && !previousUp && sunrise === null) sunrise = hours;
    if (!up && previousUp) sunset = hours;
    if (altitude > noonAltitude) { noonAltitude = altitude; noonAzimuth = azimuth; }
    previousUp = up;
  }

  return {
    sunrise, sunset,
    daylight: sunrise !== null && sunset !== null ? sunset - sunrise : 0,
    noonAltitude, noonAzimuth,
  };
}
