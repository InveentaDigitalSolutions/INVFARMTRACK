/**
 * When a planting will be ready, from the light it actually receives.
 *
 * Phenology records the weeks a variety takes "in a normal year". That is a
 * useful thing to know and a poor thing to schedule from, because a year is not
 * uniform: measured daylight here averages 45.3 mol/m² a day from March to
 * August and 34.7 from September to February, and the nursery's own figures say
 * the same cutting takes 8-10 weeks in the bright half and 10-12 in the dark.
 *
 * Those two facts are the same fact. Converting the weeks into the light they
 * imply, and then counting real light from the planting date, reproduces the
 * seasonal difference without anyone recording it twice — and handles the thing
 * a two-season table cannot: an August that was unusually cloudy.
 *
 * The conversion runs through the bed's own cloth, so a double-shaded bed takes
 * longer than a single-shaded one for the same variety, which is also true and
 * also never had to be typed.
 */

import { measuredDayLight, type RadiationByDay } from "./bedLight";
import type { ShadeLevel } from "./shadehouseLayout";

/** Light in an average year at this latitude, mol/m²/day of PAR in the open. */
const TYPICAL_OPEN_SKY = 40.0;

/**
 * The light a variety needs to reach its stage, worked out from the weeks it
 * takes in a normal year under the cloth it is normally grown under.
 */
export function lightRequired(weeks: number, shade: ShadeLevel | undefined): number | null {
  if (!Number.isFinite(weeks) || weeks <= 0) return null;
  const transmission = shade === "Double" ? 0.1225 : shade === "Triple" ? 0.042875 : 0.35;
  return TYPICAL_OPEN_SKY * transmission * weeks * 7;
}

export interface ReadyEstimate {
  /** ISO date the stage is expected to be reached. */
  readyOn: string;
  /** Light accumulated by then, mol/m². */
  light: number;
  /** How much of the span was measured rather than assumed clear. */
  measuredDays: number;
  days: number;
}

/**
 * Walk forward from the planting date, adding each day's light at that bed,
 * and stop when the requirement is met.
 *
 * Capped at two years: a variety with a requirement nothing can reach — a
 * triple-shaded bed and a figure meant for full sun — must not walk forever.
 */
export function readyOn(
  plantedOn: string,
  weeks: number,
  shade: ShadeLevel | undefined,
  radiation: RadiationByDay,
  maxDays = 730
): ReadyEstimate | null {
  const need = lightRequired(weeks, shade);
  const start = Date.parse(`${plantedOn}T00:00:00Z`);
  if (need === null || !Number.isFinite(start)) return null;

  let light = 0;
  let measuredDays = 0;
  for (let day = 1; day <= maxDays; day++) {
    const iso = new Date(start + day * 86_400_000).toISOString().slice(0, 10);
    const today = measuredDayLight(iso, shade, radiation);
    light += today.atBed;
    if (today.measured) measuredDays++;
    if (light >= need) {
      return { readyOn: iso, light: Math.round(light), measuredDays, days: day };
    }
  }
  return null;
}

/**
 * How far through a planting is, 0 to 1, by light rather than by days.
 *
 * A bed two thirds of the way through its light is two thirds grown; a bed two
 * thirds of the way through its weeks in a dull month is not.
 */
export function progress(
  plantedOn: string,
  today: string,
  weeks: number,
  shade: ShadeLevel | undefined,
  radiation: RadiationByDay
): number | null {
  const need = lightRequired(weeks, shade);
  const start = Date.parse(`${plantedOn}T00:00:00Z`);
  const end = Date.parse(`${today}T00:00:00Z`);
  if (need === null || !Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;

  let light = 0;
  for (let t = start + 86_400_000; t <= end; t += 86_400_000) {
    light += measuredDayLight(new Date(t).toISOString().slice(0, 10), shade, radiation).atBed;
  }
  return Math.min(1, light / need);
}
