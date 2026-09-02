/**
 * Every feed the app depends on, and how each one is doing.
 *
 * Gathered in one place so the answer is the same wherever it is shown — the
 * weather chip on the 3D view, the rate on the dashboard, the list under
 * Settings. A screen that says "live" while another says "3 days old" about
 * the same figure is worse than neither saying anything.
 */

import { useMemo } from "react";
import { useCurrentWeather } from "./useCurrentWeather";
import { useRecords } from "./useRecords";
import { feedState, type FeedState } from "../services/feedState";
import { hostingMode } from "../services/tableMap";
import type { ExchangeRateRow } from "./useExchangeRate";

export interface Feed extends FeedState {
  id: string;
  label: string;
  /** Where the numbers come from, named the way the source names itself. */
  source: string;
  /** What goes wrong in the app when this feed is not fresh. */
  matters: string;
}

interface SolarRow {
  id: string;
  date?: string;
}

export function useFeeds(): Feed[] {
  const { conditions, loading, error } = useCurrentWeather();
  const [rates] = useRecords<ExchangeRateRow>("exchangeRates", []);
  const [radiation] = useRecords<SolarRow>("solarRadiation", []);

  return useMemo(() => {
    const newest = (rows: { date?: string }[]) =>
      rows.reduce<string | null>((latest, r) => {
        const d = String(r.date ?? "").slice(0, 10);
        return d && (!latest || d > latest) ? d : latest;
      }, null);

    const dataverse = hostingMode() !== "demo";

    return [
      {
        id: "weather",
        label: "Weather",
        source: "Open-Meteo, at the nursery's coordinates",
        // Two hours: the service publishes quarter-hourly, and the app polls
        // every ten minutes. Anything older than a couple of hours means the
        // polling has stopped, not that the weather is quiet.
        matters: "Humidity and rain drive the irrigation view and the light figures.",
        ...feedState({
          loading,
          error,
          lastAt: conditions?.observedAt?.getTime() ?? null,
          staleAfterHours: 2,
        }),
      },
      {
        id: "radiation",
        label: "Sunlight received",
        source: "Open-Meteo daily shortwave, stored per day",
        matters: "Growth is measured in light. Without it the app falls back to clear-sky maths.",
        ...feedState({
          configured: dataverse,
          lastAt: newest(radiation),
          // Yesterday's total is the freshest that can exist, so two days is
          // the first age that means something has stopped.
          staleAfterHours: 48,
        }),
      },
      {
        id: "rate",
        label: "Lempira rate",
        source: "Banco Central de Honduras (TCR)",
        matters: "An invoice converts at the rate of its day. A stale rate misprices it.",
        ...feedState({
          configured: dataverse,
          lastAt: newest(rates),
          // The BCH does not publish at weekends, so a Monday rate may be
          // Friday's and still correct. Four days is the first real gap.
          staleAfterHours: 96,
        }),
      },
      {
        id: "irrigation",
        label: "Irrigation zones",
        source: "Simulated — no controller is connected yet",
        matters: "The zone colours on the 3D view are a demonstration, not the valves.",
        ...feedState({ configured: false, staleAfterHours: 1 }),
      },
    ];
  }, [conditions, loading, error, rates, radiation]);
}
