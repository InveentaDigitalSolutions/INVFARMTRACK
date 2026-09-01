/**
 * Days on which nothing moves.
 *
 * Two separate problems that a calendar alone cannot tell apart. On a Honduran
 * holiday nobody cuts, packs or drives to the airport, so the shipment does
 * not leave. On the destination's holiday the flight may well go, but customs
 * is shut and a box of unrooted cuttings spends the long weekend on a ramp —
 * which for perishable stock is the more expensive of the two.
 *
 * Both are knowable months ahead. The rows come from Dataverse; see
 * scripts/dataverse/import-holidays.mjs for where they come from before that.
 */

import { countryFor } from "./tariff";

export interface HolidayRow {
  /** ISO date, or anything Dataverse hands back that starts with one. */
  date?: unknown;
  name?: unknown;
  countryCode?: unknown;
  country?: unknown;
}

export interface Closure {
  date: string;
  name: string;
  countryCode: string;
  country: string;
}

/** Where the nursery is. Its own holidays stop the work whatever the order says. */
export const HOME_COUNTRY = "HN";

const day = (v: unknown) => String(v ?? "").slice(0, 10);

/**
 * The country code to look holidays up by, from whatever the record holds.
 *
 * Customers carry a country name, holidays carry a code, and the two have to
 * meet. An unrecognised name returns null — no holidays rather than the wrong
 * country's holidays.
 */
export function codeFor(country: unknown): string | null {
  const raw = String(country ?? "").trim();
  if (!raw) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return countryFor(raw)?.code ?? null;
}

/** The holiday falling on a date in one country, if there is one. */
export function holidayOn(rows: HolidayRow[], date: unknown, country: unknown): Closure | null {
  const when = day(date);
  const code = codeFor(country);
  if (!when || !code) return null;
  const hit = rows.find((r) => day(r.date) === when && String(r.countryCode ?? "").toUpperCase() === code);
  if (!hit) return null;
  return {
    date: when,
    name: String(hit.name ?? "Public holiday"),
    countryCode: code,
    country: String(hit.country ?? code),
  };
}

/**
 * Saturday or Sunday.
 *
 * Parsed as UTC on purpose: an ISO date is a day, not an instant, and reading
 * "2026-10-03" in a timezone west of Greenwich makes it the 2nd.
 */
export function isWeekend(date: unknown): boolean {
  const when = day(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(when)) return false;
  const wd = new Date(`${when}T00:00:00Z`).getUTCDay();
  return wd === 0 || wd === 6;
}

/** Nothing shipping, nothing clearing: a weekend or a public holiday. */
export function isWorkingDay(rows: HolidayRow[], date: unknown, country: unknown = HOME_COUNTRY): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day(date))) return false;
  return !isWeekend(date) && !holidayOn(rows, date, country);
}

/**
 * Everything that would stop a delivery landing on this date.
 *
 * Both ends at once, because they fail differently: the nursery not shipping
 * is a day lost, the destination not clearing is stock sitting warm.
 */
export function closuresOn(
  rows: HolidayRow[],
  date: unknown,
  destination?: unknown
): { home: Closure | null; away: Closure | null; weekend: boolean } {
  const away = destination && codeFor(destination) !== HOME_COUNTRY
    ? holidayOn(rows, date, destination)
    : null;
  return { home: holidayOn(rows, date, HOME_COUNTRY), away, weekend: isWeekend(date) };
}

/**
 * The next day work can actually happen, counting from a date.
 *
 * Returns the date itself when it is already a working day, so it can be used
 * to answer both "is this alright?" and "when instead?".
 */
export function nextWorkingDay(rows: HolidayRow[], date: unknown, country: unknown = HOME_COUNTRY): string {
  let when = day(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(when)) return "";
  // A fortnight is longer than any run of holidays anywhere; the bound stops a
  // bad country code turning into an endless loop.
  for (let i = 0; i < 14; i++) {
    if (isWorkingDay(rows, when, country)) return when;
    const next = new Date(`${when}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    when = next.toISOString().slice(0, 10);
  }
  return when;
}

/**
 * The Monday-to-Sunday dates of an ISO week.
 *
 * Orders here are placed by week number, not by date — "12,100 in week 38" —
 * so anything the calendar knows has to be mapped onto weeks before it can be
 * said. ISO weeks are defined by their Thursday, which is what makes week 1
 * the week containing 4 January.
 */
export function weekRange(year: number, week: number): string[] {
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) return [];
  const fourth = new Date(Date.UTC(year, 0, 4));
  // getUTCDay: Sunday is 0. ISO counts Monday as 1, so Sunday is day 7.
  const isoDay = fourth.getUTCDay() === 0 ? 7 : fourth.getUTCDay();
  const monday = new Date(fourth);
  monday.setUTCDate(fourth.getUTCDate() - (isoDay - 1) + (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/**
 * Public holidays inside one week, at the nursery and at the destination.
 *
 * A week with two holidays in it is a week with three working days, and an
 * order book that does not show that is a promise nobody checked.
 */
export function closuresInWeek(
  rows: HolidayRow[],
  year: number,
  week: number,
  destination?: unknown
): Closure[] {
  const out: Closure[] = [];
  for (const date of weekRange(year, week)) {
    const home = holidayOn(rows, date, HOME_COUNTRY);
    if (home) out.push(home);
    if (destination && codeFor(destination) !== HOME_COUNTRY) {
      const away = holidayOn(rows, date, destination);
      if (away) out.push(away);
    }
  }
  return out;
}
