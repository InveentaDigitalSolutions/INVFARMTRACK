/**
 * Shared weather access.
 *
 * WeatherWidget fetches the full forecast for the Dashboard; the 3D view only
 * needs current conditions. Both read the same Open-Meteo endpoint and the
 * same station, so the two surfaces can never disagree about the weather.
 */

import { FarmTrack_GetWeatherService } from "../generated/services/FarmTrack_GetWeatherService";

export const STATION = { lat: 14.97, lng: -87.85, label: "El Olvido, Santa Cruz de Yojoa" };

export interface CurrentConditions {
  temperature: number;
  humidity: number;
  /** km/h */
  windSpeed: number;
  /** Degrees the wind is coming FROM: 0 = north, 90 = east. */
  windDirection: number;
  windGusts: number;
  /** mm in the last hour */
  precipitation: number;
  cloudCover: number;
  weatherCode: number;
  isDay: boolean;
  observedAt: Date;
}

/** WMO weather codes that mean water is falling. */
export function precipitationKind(code: number): "none" | "drizzle" | "rain" | "heavy" | "storm" {
  if (code >= 95) return "storm";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 66, 80, 81].includes(code)) return "rain";
  if ([65, 67, 82].includes(code)) return "heavy";
  return "none";
}

export function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

/** Shape the parsed Open-Meteo payload into our own type. */
function toConditions(data: {
  current: Record<string, number | string>;
}): CurrentConditions {
  const c = data.current;
  return {
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    windGusts: c.wind_gusts_10m,
    precipitation: c.precipitation,
    cloudCover: c.cloud_cover,
    weatherCode: c.weather_code,
    isDay: c.is_day === 1,
    observedAt: new Date(String(c.time)),
  } as CurrentConditions;
}

/**
 * Fetch current conditions.
 *
 * The Power Apps player enforces `connect-src 'none'`, so the browser cannot
 * reach Open-Meteo at all — verified in the deployed console. The request is
 * therefore made by a Power Automate flow and the app calls the flow. Running
 * locally outside the player, the direct call still works, so both paths are
 * kept and the flow is preferred wherever it is available.
 */
export async function fetchCurrentConditions(signal?: AbortSignal): Promise<CurrentConditions> {
  try {
    const result = await FarmTrack_GetWeatherService.Run({
      latitude: STATION.lat,
      longitude: STATION.lng,
    });
    if (result.success && result.data?.weather) {
      const parsed = JSON.parse(result.data.weather);
      // The flow's failure branch returns a structured error rather than
      // failing the run, so a successful call can still carry a failure.
      if (parsed?.error) throw new Error(parsed.message ?? "Weather service unavailable");
      return toConditions(parsed);
    }
    throw new Error(result.error?.message ?? "Weather flow returned no data");
  } catch (flowError) {
    // Outside the player (npm run dev) there is no flow host; fall back to a
    // direct call so local development keeps working.
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${STATION.lat}&longitude=${STATION.lng}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,` +
      `precipitation,weather_code,cloud_cover,is_day&timezone=America%2FTegucigalpa`;
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
      return toConditions(await res.json());
    } catch {
      // Report the flow's failure, not the fallback's — the flow is the path
      // that matters in the deployed app.
      throw flowError instanceof Error ? flowError : new Error("Weather unavailable");
    }
  }
}
