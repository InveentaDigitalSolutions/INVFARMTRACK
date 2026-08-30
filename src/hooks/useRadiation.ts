/**
 * Measured daily radiation, from the store and from the live feed together.
 *
 * Two sources, deliberately:
 *
 * - **The store** (`bv_SolarRadiation`) holds every day back to when the
 *   nursery started recording. It is the only thing that can answer what a
 *   planting older than three months actually received.
 * - **The weather flow** carries a rolling 92-day window plus a week ahead.
 *   It is fresher than the store for today and the only source for tomorrow.
 *
 * The live window wins where the two overlap: it is the same measurement from
 * the same service, and today's figure gets revised as the day completes.
 */

import { useMemo } from "react";
import { useRecords } from "./useRecords";
import { useCurrentWeather } from "./useCurrentWeather";
import type { RadiationByDay } from "../services/bedLight";

export interface SolarRadiationRow {
  id: string;
  date?: string;
  megajoules?: number;
}

export function useRadiation(): {
  radiation: RadiationByDay;
  /** Days from the store, before the live window is laid over it. */
  storedDays: number;
  /** The earliest day anything is known for, or null. */
  from: string | null;
} {
  const [rows] = useRecords<SolarRadiationRow>("solarRadiation", []);
  const { radiation: live } = useCurrentWeather();

  return useMemo(() => {
    const merged: RadiationByDay = new Map();
    for (const row of rows) {
      const date = String(row.date ?? "").slice(0, 10);
      const mj = Number(row.megajoules);
      // A blank reading must not become a day of darkness — the same trap the
      // feed itself sets with its nulls.
      if (date.length !== 10 || row.megajoules == null || !Number.isFinite(mj)) continue;
      merged.set(date, mj);
    }
    const storedDays = merged.size;
    for (const [date, mj] of live) merged.set(date, mj);

    const dates = [...merged.keys()].sort();
    return { radiation: merged, storedDays, from: dates[0] ?? null };
  }, [rows, live]);
}
