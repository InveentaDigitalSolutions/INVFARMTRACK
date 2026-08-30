import { useEffect, useState } from "react";
import { fetchWeather, type CurrentConditions } from "../services/weather";
import type { RadiationByDay } from "../services/bedLight";

/** Open-Meteo updates roughly every 15 minutes; polling faster buys nothing. */
const REFRESH_MS = 10 * 60_000;

export function useCurrentWeather() {
  const [conditions, setConditions] = useState<CurrentConditions | null>(null);
  /** Measured daily radiation, so light per bed is what landed, not what could. */
  const [radiation, setRadiation] = useState<RadiationByDay>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval>;

    const load = async () => {
      try {
        const next = await fetchWeather(controller.signal);
        setConditions(next.conditions);
        // Keep whatever we had if this call came back without radiation: the
        // second request can fail on its own and losing the history over that
        // would silently drop every bed back to clear-sky figures.
        if (next.radiation.size > 0) setRadiation(next.radiation);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Weather unavailable");
      } finally {
        setLoading(false);
      }
    };

    load();
    timer = setInterval(load, REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  return { conditions, radiation, loading, error };
}
