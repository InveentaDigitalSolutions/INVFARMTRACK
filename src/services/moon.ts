/**
 * The moon over the nursery: its phase, how lit it is, and when it is up.
 *
 * Open-Meteo does return moon phase, and it is used here as a check — but not
 * as the source. Two reasons. The player blocks outbound requests, so anything
 * on the network has to go through a flow; and the feed only covers the
 * forecast window, while planting by the moon means looking at a whole season,
 * forwards and backwards. The moon is arithmetic, so it is computed.
 *
 * Accurate to about a hundredth of a day in phase, which is far finer than any
 * decision taken from it.
 */

import { SITE_LAT, SITE_LON, SITE_UTC_OFFSET_H } from "./site";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** The mean interval from one new moon to the next, in days. */
export const SYNODIC_MONTH = 29.530588853;

export type PhaseName =
  | "New moon" | "Waxing crescent" | "First quarter" | "Waxing gibbous"
  | "Full moon" | "Waning gibbous" | "Last quarter" | "Waning crescent";

export interface MoonPhase {
  /** Days since the last new moon, 0 to about 29.53. */
  age: number;
  /** Lit fraction of the disc, 0 at new and 1 at full. */
  illumination: number;
  /** 0 at new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
  fraction: number;
  name: PhaseName;
  /** True between new and full, when the lit part is growing. */
  waxing: boolean;
}

function julianDay(at: Date): number {
  return at.getTime() / 86_400_000 + 2440587.5;
}

/**
 * Phase from the elongation between sun and moon, rather than from a count of
 * days since some remembered new moon.
 *
 * The mean-interval shortcut drifts by up to half a day because the moon's
 * orbit is not circular; this follows the two bodies and stays right.
 */
export function moonPhase(at: Date): MoonPhase {
  const d = julianDay(at) - 2451545.0;

  // Sun's mean anomaly and geometric longitude.
  const sunM = (357.5291 + 0.98560028 * d) * RAD;
  const sunL = (280.459 + 0.98564736 * d) * RAD;
  const sunLon = sunL + (1.9146 * Math.sin(sunM) + 0.0200 * Math.sin(2 * sunM)) * RAD;

  // Moon's mean longitude, mean anomaly and mean elongation.
  const moonL = (218.316 + 13.176396 * d) * RAD;
  const moonM = (134.963 + 13.064993 * d) * RAD;
  const moonF = (93.272 + 13.229350 * d) * RAD;
  const moonLon =
    moonL +
    (6.289 * Math.sin(moonM) +
      1.274 * Math.sin(2 * (moonL - sunLon) - moonM) +
      0.658 * Math.sin(2 * (moonL - sunLon)) +
      0.214 * Math.sin(2 * moonM) -
      0.186 * Math.sin(sunM) -
      0.114 * Math.sin(2 * moonF)) * RAD;

  // Elongation: 0 at new moon, 180 degrees at full.
  let elongation = ((moonLon - sunLon) * DEG) % 360;
  if (elongation < 0) elongation += 360;

  const fraction = elongation / 360;
  const age = fraction * SYNODIC_MONTH;
  const illumination = (1 - Math.cos(elongation * RAD)) / 2;

  return {
    age,
    illumination,
    fraction,
    name: phaseName(fraction),
    waxing: elongation < 180,
  };
}

/**
 * The eight named phases.
 *
 * The four turning points — new, both quarters and full — are given a narrow
 * window rather than a single instant, because "first quarter" on a calendar
 * means that day, not that second.
 */
export function phaseName(fraction: number): PhaseName {
  const f = ((fraction % 1) + 1) % 1;
  const edge = 1 / 32;                      // just under a day either side
  if (f < edge || f >= 1 - edge) return "New moon";
  if (Math.abs(f - 0.25) < edge) return "First quarter";
  if (Math.abs(f - 0.5) < edge) return "Full moon";
  if (Math.abs(f - 0.75) < edge) return "Last quarter";
  if (f < 0.25) return "Waxing crescent";
  if (f < 0.5) return "Waxing gibbous";
  if (f < 0.75) return "Waning gibbous";
  return "Waning crescent";
}

export interface MoonPosition {
  altitude: number;
  azimuth: number;
}

/** Where the moon is in the sky, in the same terms as the sun. */
export function moonPosition(
  at: Date,
  latDeg: number = SITE_LAT,
  lonDeg: number = SITE_LON
): MoonPosition {
  const d = julianDay(at) - 2451545.0;

  const L = (218.316 + 13.176396 * d) * RAD;
  const M = (134.963 + 13.064993 * d) * RAD;
  const F = (93.272 + 13.229350 * d) * RAD;

  const lon = L + 6.289 * Math.sin(M) * RAD;
  const lat = 5.128 * Math.sin(F) * RAD;
  const obliquity = 23.4397 * RAD;

  const ra = Math.atan2(
    Math.sin(lon) * Math.cos(obliquity) - Math.tan(lat) * Math.sin(obliquity),
    Math.cos(lon)
  );
  const dec = Math.asin(
    Math.sin(lat) * Math.cos(obliquity) + Math.cos(lat) * Math.sin(obliquity) * Math.sin(lon)
  );

  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const lst = ((((gmst * 15 + lonDeg) % 360) + 360) % 360) * RAD;
  const H = lst - ra;
  const phi = latDeg * RAD;

  return {
    altitude: Math.asin(
      Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
    ) * DEG,
    azimuth: ((Math.atan2(
      -Math.sin(H),
      Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H)
    ) * DEG) % 360 + 360) % 360,
  };
}

/** Local time in Honduras for a decimal hour on a given date. */
function atLocal(dateISO: string, hours: number): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + (hours - SITE_UTC_OFFSET_H) * 3_600_000);
}

export interface MoonDay {
  phase: MoonPhase;
  /** Local decimal hours, or null — the moon does not rise every day. */
  rise: number | null;
  set: number | null;
}

/**
 * Rise and set for a local day, sampled a minute at a time.
 *
 * Either can genuinely be absent: the moon rises about fifty minutes later each
 * day, so roughly once a month a calendar day contains no rise at all. Null
 * says so rather than reporting midnight.
 */
export function moonDay(dateISO: string): MoonDay {
  let rise: number | null = null;
  let set: number | null = null;
  let wasUp = moonPosition(atLocal(dateISO, 0)).altitude > 0;

  for (let minute = 1; minute <= 1440; minute++) {
    const up = moonPosition(atLocal(dateISO, minute / 60)).altitude > 0;
    if (up && !wasUp && rise === null) rise = minute / 60;
    if (!up && wasUp && set === null) set = minute / 60;
    wasUp = up;
  }
  return { phase: moonPhase(atLocal(dateISO, 12)), rise, set };
}

/**
 * The next date on or after `fromISO` on which a given phase falls.
 * Used for "when is the next full moon", which is the question actually asked.
 */
export function nextPhase(fromISO: string, want: PhaseName, limitDays = 40): string | null {
  const start = Date.parse(`${fromISO}T12:00:00Z`);
  if (!Number.isFinite(start)) return null;
  for (let i = 0; i <= limitDays; i++) {
    const day = new Date(start + i * 86_400_000);
    if (moonPhase(day).name === want) return day.toISOString().slice(0, 10);
  }
  return null;
}
