/**
 * The Banco Central de Honduras reference rate (TCR), read from Dataverse.
 *
 * It used to be fetched from the BCH API in the browser, which failed twice
 * over: the Power Apps player blocks outbound requests, so the app silently
 * fell back to a rate hard-coded at 26.5543 — 1.2% adrift by August 2026, or
 * about 1,900 lempiras on a six-thousand-dollar order — and the subscription
 * key sat in a VITE_ variable, which means it was compiled into the bundle
 * every visitor downloads.
 *
 * The rate now arrives the way every other figure does, through the Dataverse
 * connection the app already holds, filled daily by a flow. Keeping the
 * history rather than one current value is the point: an invoice has to be
 * read back at the rate it was converted at, and `rateOn` answers that.
 */

import { useCallback, useMemo } from "react";
import { useRecords } from "./useRecords";

export interface ExchangeRateRow {
  id: string;
  date?: string;
  value?: number;
  source?: string;
}

export interface ExchangeRate {
  date: Date;
  dateISO: string;
  value: number;
}

/**
 * Last resort only. If this is what the app is showing, the daily flow has
 * stopped and nobody has noticed — which is what `isLive` is for.
 */
const FALLBACK: ExchangeRate = {
  date: new Date("2026-08-28"),
  dateISO: "2026-08-28",
  value: 26.8667,
};

const toISO = (value: unknown): string => String(value ?? "").slice(0, 10);

export function useExchangeRate(): {
  rate: ExchangeRate | null;
  loading: boolean;
  isLive: boolean;
  /** How many days old the newest stored rate is; 0 means published today. */
  staleDays: number;
  /** The rate published on a given day, for reading an invoice back. */
  rateOn: (date: string) => number | null;
} {
  const [rows] = useRecords<ExchangeRateRow>("exchangeRates", []);

  const sorted = useMemo(
    () => [...rows].filter((r) => r.date && typeof r.value === "number")
      .sort((a, b) => (toISO(a.date) < toISO(b.date) ? 1 : -1)),
    [rows]
  );

  const rate = useMemo<ExchangeRate | null>(() => {
    const newest = sorted[0];
    if (!newest) return rows.length === 0 ? FALLBACK : null;
    return { date: new Date(toISO(newest.date)), dateISO: toISO(newest.date), value: newest.value! };
  }, [sorted, rows.length]);

  const staleDays = useMemo(() => {
    if (!rate) return 0;
    const days = Math.floor((Date.now() - rate.date.getTime()) / 86_400_000);
    return Math.max(0, days);
  }, [rate]);

  /**
   * The rate for a date, falling back to the most recent one published before
   * it — the BCH does not publish at weekends, so an invoice dated Sunday
   * carries Friday's rate, which is how the conversion was actually done.
   */
  const rateOn = useCallback(
    (date: string): number | null => {
      const target = toISO(date);
      const match = sorted.find((r) => toISO(r.date) <= target);
      return match?.value ?? null;
    },
    [sorted]
  );

  return {
    rate,
    loading: rows.length === 0 && rate === FALLBACK,
    isLive: sorted.length > 0,
    staleDays,
    rateOn,
  };
}
