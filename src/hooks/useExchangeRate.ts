/**
 * useExchangeRate — React hook for BCH exchange rate.
 *
 * Returns the latest USD/HNL reference rate from Banco Central de Honduras.
 * Falls back to a manual rate if the API key is not configured.
 */

import { useState, useEffect, useCallback } from "react";
import { bchClient, type ExchangeRate } from "../services/bch";

interface UseExchangeRateResult {
  rate: ExchangeRate | null;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  /** Wall-clock time this value was last fetched — distinct from the rate's own date. */
  fetchedAt: Date | null;
  refresh: () => Promise<void>;
  /** Manual override for when API is unavailable */
  setManualRate: (value: number) => void;
}

// Fallback rate (updated manually when API unavailable)
const FALLBACK_RATE: ExchangeRate = {
  date: new Date(),
  value: 26.5543,
  dateISO: new Date().toISOString().slice(0, 10),
};

export function useExchangeRate(): UseExchangeRateResult {
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!bchClient) {
      // No API key — use fallback
      setRate(FALLBACK_RATE);
      setIsLive(false);
      setFetchedAt(new Date());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await bchClient.getReferenceExchangeRate();
      setRate(result);
      setIsLive(true);
      setFetchedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch exchange rate");
      // Fall back to cached or default
      if (!rate) setRate(FALLBACK_RATE);
      setIsLive(false);
      setFetchedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setManualRate = useCallback((value: number) => {
    setRate({
      date: new Date(),
      value,
      dateISO: new Date().toISOString().slice(0, 10),
    });
    setIsLive(false);
    setFetchedAt(new Date());
  }, []);

  return { rate, loading, error, isLive, fetchedAt, refresh, setManualRate };
}
