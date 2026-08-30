/**
 * How much light actually reaches a bed.
 *
 * Three things stand between the sun and a cutting: how high the sun gets,
 * how long it is up, and how many layers of cloth are strung over that bed.
 * The first two are astronomy and vary by date; the third is a property of the
 * bed and is the reason two beds twenty metres apart grow at different rates.
 *
 * **The cloth.** Broton Verde uses 65% shade netting. A layer passes 35% of
 * what falls on it, and a second layer only sees what the first let through —
 * so the layers multiply rather than add:
 *
 *   Single   0.35             35.00% through   (65.00% blocked)
 *   Double   0.35^2 = 0.1225  12.25% through   (87.75% blocked)
 *   Triple   0.35^3 = 0.0429   4.29% through   (95.71% blocked)
 *
 * That is a factor of **eight** between a single-shade bed and a triple-shade
 * one, which is far larger than any other term in this model — larger than the
 * seasonal swing, and much larger than the terrain.
 *
 * **Cloud.** The geometry above gives clear-sky light — what is available when
 * nothing is in the way but air and cloth. What actually lands is measured, and
 * the weather flow now returns it: Open-Meteo's daily shortwave radiation sum
 * for the last 92 days and the next 7. Over one recent stretch here it ran from
 * 11.4 to 26.4 MJ/m² — a factor of more than two between a dull day and a
 * bright one, which is far too large to model away.
 *
 * `measuredDayLight` uses it where it exists and says so; `dayLight` is the
 * clear-sky ceiling and remains the fallback for dates outside that window.
 */

import { sunPosition, atLocal, dayArc } from "./solar";
import type { ShadeLevel } from "./shadehouseLayout";

/** What one layer of the nursery's netting lets through. */
export const CLOTH_TRANSMISSION = 0.35;

/** Layers of cloth over a bed, by its recorded shade level. */
export const SHADE_LAYERS: Record<ShadeLevel, number> = {
  Single: 1,
  Double: 2,
  Triple: 3,
};

/**
 * The fraction of overhead light a bed receives through its cloth.
 * A bed with no shade recorded is treated as unshaded rather than guessed at.
 */
export function clothTransmission(shade: ShadeLevel | undefined): number {
  const layers = shade ? SHADE_LAYERS[shade] : 0;
  return CLOTH_TRANSMISSION ** layers;
}

/** Solar constant, W/m². */
const SOLAR_CONSTANT = 1361;

/**
 * Clear-sky irradiance on a horizontal surface, W/m², for a sun altitude.
 *
 * Direct beam follows Meinel's attenuation — the atmosphere takes a fixed
 * fraction per air mass, and air mass grows as the sun drops. Diffuse is the
 * conventional tenth of the beam: on a clear day some light still arrives from
 * the rest of the sky, and a bed under cloth receives that too.
 */
export function clearSkyIrradiance(altitudeDeg: number): number {
  if (altitudeDeg <= 0) return 0;
  const sinAlt = Math.sin((altitudeDeg * Math.PI) / 180);
  // Kasten-Young air mass: 1/sin overshoots badly near the horizon.
  const airMass = 1 / (sinAlt + 0.50572 * (altitudeDeg + 6.07995) ** -1.6364);
  const beam = SOLAR_CONSTANT * 0.7 ** airMass ** 0.678;
  return beam * sinAlt * 1.1;
}

/** Shortwave watts to PAR micromoles per second: 45% is PAR, at 4.57 µmol/J. */
const PAR_PER_WATT = 0.45 * 4.57;

export interface DayLight {
  /** Daily light integral in the open, mol/m²/day of PAR on a clear day. */
  openSky: number;
  /** The same after the bed's cloth. */
  atBed: number;
  /** What fraction of open sky that is. */
  transmission: number;
  /** Hours the sun is above the horizon. */
  daylightHours: number;
}

/**
 * The day's light integral for a bed, on a clear day.
 *
 * Sampled every ten minutes rather than integrated in closed form: the sun's
 * path is not symmetric about noon once the equation of time is in it, and ten
 * minutes is far finer than the cloth rating is known to.
 */
export function dayLight(dateISO: string, shade: ShadeLevel | undefined): DayLight {
  const STEP_MINUTES = 10;
  let joules = 0;
  for (let minute = 0; minute < 1440; minute += STEP_MINUTES) {
    const { altitude } = sunPosition(atLocal(dateISO, minute / 60));
    joules += clearSkyIrradiance(altitude) * STEP_MINUTES * 60;
  }
  // W·s/m² -> µmol/m² -> mol/m²
  const openSky = (joules * PAR_PER_WATT) / 1_000_000;
  const transmission = clothTransmission(shade);
  return {
    openSky,
    atBed: openSky * transmission,
    transmission,
    daylightHours: dayArc(dateISO).daylight,
  };
}

/**
 * Light accumulated between two dates, mol/m² — the figure a growth model
 * should count in rather than calendar days.
 *
 * A variety needing so many "days" needs that many days *of a certain light*.
 * The same cutting in a triple-shade bed is taking an eighth of the light, and
 * counting days cannot see that. Both dates are inclusive.
 */
export function accumulatedLight(
  fromISO: string,
  toISO: string,
  shade: ShadeLevel | undefined
): number {
  const from = Date.parse(`${fromISO}T00:00:00Z`);
  const to = Date.parse(`${toISO}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;

  let total = 0;
  for (let t = from; t <= to; t += 86_400_000) {
    total += dayLight(new Date(t).toISOString().slice(0, 10), shade).atBed;
  }
  return total;
}

/**
 * Shortwave radiation as Open-Meteo reports it, MJ/m² over a day, converted to
 * PAR in mol/m². The same 45% / 4.57 µmol/J the clear-sky path uses, so the two
 * are directly comparable.
 */
export function radiationToPar(megajoules: number): number {
  return (megajoules * 1_000_000 * PAR_PER_WATT) / 1_000_000;
}

/** A day's measured radiation, keyed by ISO date. */
export type RadiationByDay = Map<string, number>;

/**
 * Read the daily radiation series out of the weather payload.
 *
 * The flow merges Open-Meteo's `daily` radiation block into the weather object
 * under `radiation`. It is absent whenever the second request failed, which is
 * deliberate — the weather itself still answers, and the light model falls back
 * to clear sky rather than the whole call failing over a nicety.
 */
export function radiationSeries(weather: unknown): RadiationByDay {
  const out: RadiationByDay = new Map();
  const w = weather as {
    radiation?: { time?: unknown; shortwave_radiation_sum?: unknown };
    daily?: { time?: unknown; shortwave_radiation_sum?: unknown };
  } | null;
  // The flow merges the radiation block in under `radiation`. Running locally
  // the direct Open-Meteo call returns it as plain `daily`, so accept both
  // rather than making dev behave differently from the player.
  const daily = w?.radiation ?? (w?.daily?.shortwave_radiation_sum ? w.daily : undefined);
  const times = Array.isArray(daily?.time) ? daily.time : null;
  const sums = Array.isArray(daily?.shortwave_radiation_sum) ? daily.shortwave_radiation_sum : null;
  if (!times || !sums) return out;

  for (let i = 0; i < times.length; i++) {
    const date = String(times[i] ?? "").slice(0, 10);
    const raw = sums[i];
    // Open-Meteo leaves a null where a day has no reading. Number(null) is 0
    // and Number.isFinite(0) is true, so testing the converted value alone
    // records a missing day as one of total darkness — which then drags an
    // accumulated total down as if the sun had not risen.
    if (raw === null || raw === undefined || raw === "") continue;
    const mj = Number(raw);
    if (date.length === 10 && Number.isFinite(mj)) out.set(date, mj);
  }
  return out;
}

export interface MeasuredDayLight extends DayLight {
  /** True when the day's radiation was measured rather than assumed clear. */
  measured: boolean;
  /** How much of the clear-sky ceiling actually arrived, 0-1. */
  clearSkyFraction: number;
}

/**
 * A bed's light for a day, using measured radiation where it exists.
 *
 * A cloudy day at 45% of clear sky under double shade is a different crop from
 * a bright one under single shade, and only this can tell them apart.
 */
export function measuredDayLight(
  dateISO: string,
  shade: ShadeLevel | undefined,
  radiation: RadiationByDay
): MeasuredDayLight {
  const clear = dayLight(dateISO, shade);
  const mj = radiation.get(dateISO);
  if (mj === undefined) {
    return { ...clear, measured: false, clearSkyFraction: 1 };
  }
  const openSky = radiationToPar(mj);
  return {
    openSky,
    atBed: openSky * clear.transmission,
    transmission: clear.transmission,
    daylightHours: clear.daylightHours,
    measured: true,
    // A reading can exceed the modelled ceiling on an exceptionally clear day;
    // that is the model being conservative, not the reading being wrong.
    clearSkyFraction: clear.openSky > 0 ? openSky / clear.openSky : 1,
  };
}

/**
 * Light accumulated between two dates using measurements where they exist and
 * the clear-sky ceiling elsewhere. Also reports how much of the span was
 * actually measured, so a figure resting mostly on assumption says so.
 */
export function accumulatedMeasuredLight(
  fromISO: string,
  toISO: string,
  shade: ShadeLevel | undefined,
  radiation: RadiationByDay
): { total: number; days: number; measuredDays: number } {
  const from = Date.parse(`${fromISO}T00:00:00Z`);
  const to = Date.parse(`${toISO}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
    return { total: 0, days: 0, measuredDays: 0 };
  }
  let total = 0, days = 0, measuredDays = 0;
  for (let t = from; t <= to; t += 86_400_000) {
    const day = measuredDayLight(new Date(t).toISOString().slice(0, 10), shade, radiation);
    total += day.atBed;
    days++;
    if (day.measured) measuredDays++;
  }
  return { total, days, measuredDays };
}

/**
 * Where a bed's daily light sits between the darkest and brightest bed in the
 * house, 0 to 1 — for colouring the map. Uses the cloth alone, because on any
 * one day that is the only term that differs between beds.
 */
export function relativeLight(shade: ShadeLevel | undefined): number {
  const brightest = clothTransmission("Single");
  const darkest = clothTransmission("Triple");
  const here = clothTransmission(shade);
  if (here >= brightest) return 1;
  // Log scale: a factor of eight read linearly puts double and triple almost
  // on top of each other, when the difference between them is threefold.
  const l = Math.log(here), lo = Math.log(darkest), hi = Math.log(brightest);
  return Math.max(0, Math.min(1, (l - lo) / (hi - lo)));
}
