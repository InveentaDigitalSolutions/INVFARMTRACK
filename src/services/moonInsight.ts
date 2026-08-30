/**
 * The moon, reduced to the handful of figures a nursery plans around.
 *
 * Not decoration: seeding, pruning and cutting are timed against the phase
 * here, so what the schedule needs is how far off the next turning point is and
 * where in the cycle today sits.
 */

import { moonPhase, moonPosition, moonDay, nextPhase, type MoonPhase, type PhaseName } from "./moon";

export interface MoonKpis {
  phase: MoonPhase;
  /** Whole days to the next full moon, 0 when today is one. */
  daysToFull: number | null;
  /** Whole days to the next new moon, 0 when today is one. */
  daysToNew: number | null;
  nextFullISO: string | null;
  nextNewISO: string | null;
  /** Hours the moon is above the horizon on this local day. */
  hoursUp: number;
  moonrise: number | null;
  moonset: number | null;
}

const dayGap = (fromISO: string, toISO: string | null): number | null => {
  if (!toISO) return null;
  const a = Date.parse(`${fromISO}T12:00:00Z`);
  const b = Date.parse(`${toISO}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
};

export function moonKpis(dateISO: string): MoonKpis {
  const day = moonDay(dateISO);
  const nextFullISO = nextPhase(dateISO, "Full moon");
  const nextNewISO = nextPhase(dateISO, "New moon");

  /**
   * Hours up, counted rather than derived from rise and set.
   *
   * Either can be missing — the moon rises about fifty minutes later each day,
   * so roughly once a month a calendar day has no rise at all — and
   * `set - rise` is negative whenever the moon sets before it next rises.
   */
  let up = 0;
  for (let minute = 0; minute < 1440; minute += 5) {
    const at = new Date(Date.parse(`${dateISO}T00:00:00Z`) + (minute + 360) * 60_000);
    if (moonPosition(at).altitude > 0) up += 5;
  }

  return {
    phase: day.phase,
    daysToFull: dayGap(dateISO, nextFullISO),
    daysToNew: dayGap(dateISO, nextNewISO),
    nextFullISO,
    nextNewISO,
    hoursUp: up / 60,
    moonrise: day.rise,
    moonset: day.set,
  };
}

export interface MoonCalendarDay {
  dateISO: string;
  phase: MoonPhase;
  /** A turning point — new, either quarter, or full. Worth marking. */
  isTurning: boolean;
  isToday: boolean;
}

/**
 * A run of days with their phase, for the strip the planner reads.
 *
 * Starts a few days back on purpose: a decision taken today is usually judged
 * against what the moon did this week, not only what it will do next.
 */
export function moonCalendar(todayISO: string, back = 6, forward = 29): MoonCalendarDay[] {
  const t0 = Date.parse(`${todayISO}T12:00:00Z`);
  if (!Number.isFinite(t0)) return [];
  const TURNING: PhaseName[] = ["New moon", "First quarter", "Full moon", "Last quarter"];

  const out: MoonCalendarDay[] = [];
  for (let i = -back; i <= forward; i++) {
    const at = new Date(t0 + i * 86_400_000);
    out.push({
      dateISO: at.toISOString().slice(0, 10),
      phase: moonPhase(at),
      isTurning: false,
      isToday: i === 0,
    });
  }

  /**
   * Mark one day per turning point, not every day that qualifies.
   *
   * The naming window is a little under a day either side of the exact
   * instant, so a full moon falling near midnight satisfies it on two
   * consecutive dates — and the strip then showed "Full" twice in a row, which
   * reads as a fault. Of each run, only the day closest to the exact point is
   * marked.
   */
  const distanceToPoint = (fraction: number) =>
    Math.min(...[0, 0.25, 0.5, 0.75, 1].map((p) => Math.abs(fraction - p)));

  let i = 0;
  while (i < out.length) {
    if (!TURNING.includes(out[i].phase.name)) { i++; continue; }
    let j = i;
    while (j + 1 < out.length && out[j + 1].phase.name === out[i].phase.name) j++;
    let best = i;
    for (let k = i; k <= j; k++) {
      if (distanceToPoint(out[k].phase.fraction) < distanceToPoint(out[best].phase.fraction)) best = k;
    }
    out[best].isTurning = true;
    i = j + 1;
  }
  return out;
}
