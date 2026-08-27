import { useEffect, useState } from "react";
import { fetchCurrentConditions, type CurrentConditions } from "../services/weather";

/** Open-Meteo updates roughly every 15 minutes; polling faster buys nothing. */
const REFRESH_MS = 10 * 60_000;

export function useCurrentWeather() {
  const [conditions, setConditions] = useState<CurrentConditions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval>;

    const load = async () => {
      try {
        const next = await fetchCurrentConditions(controller.signal);
        setConditions(next);
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

  return { conditions, loading, error };
}
