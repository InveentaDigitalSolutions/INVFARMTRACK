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
 * **What this is not.** These are clear-sky figures: the light available when
 * nothing is in the way but air and cloth. Cloud takes a large bite out of it
 * in the rainy season, and that comes from measured radiation, not from
 * geometry. Multiply by the day's actual radiation to get what really landed.
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
