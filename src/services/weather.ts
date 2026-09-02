/**
 * Shared weather access.
 *
 * WeatherWidget fetches the full forecast for the Dashboard; the 3D view only
 * needs current conditions. Both read the same Open-Meteo endpoint and the
 * same station, so the two surfaces can never disagree about the weather.
 */

import { FarmTrack_GetWeatherService } from "../generated/services/FarmTrack_GetWeatherService";
import { radiationSeries, type RadiationByDay } from "./bedLight";
import { SITE_UTC_OFFSET_H } from "./site";

export const STATION = { lat: 14.97, lng: -87.85, label: "El Olvido, Santa Cruz de Yojoa" };

/**
 * An instant from a local clock reading at the nursery.
 *
 * Open-Meteo returns "YYYY-MM-DDTHH:MM"; seconds and the offset are added
 * here rather than trusting the engine's idea of "local".
 */
export function parseSiteClock(local: string): Date {
  const text = local.trim();
  const withSeconds = /T\d{2}:\d{2}$/.test(text) ? `${text}:00` : text;
  const sign = SITE_UTC_OFFSET_H <= 0 ? "-" : "+";
  const hours = String(Math.abs(SITE_UTC_OFFSET_H)).padStart(2, "0");
  return new Date(`${withSeconds}${sign}${hours}:00`);
}

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
    // Open-Meteo is asked for America/Tegucigalpa, so it answers with the
    // nursery's own clock and no offset — "2026-09-02T14:00". JavaScript reads
    // a date-time without an offset as the *browser's* local time, so from
    // Europe that reading was six hours adrift and every fresh observation
    // looked eight hours old. Honduras keeps UTC-6 all year, so the offset can
    // simply be stated.
    observedAt: parseSiteClock(String(c.time)),
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
export interface WeatherPayload {
  conditions: CurrentConditions;
  /** Measured daily shortwave radiation, MJ/m², keyed by ISO date. */
  radiation: RadiationByDay;
}

/**
 * Fetch conditions and the radiation history in one call.
 *
 * The flow returns both: the weather object with Open-Meteo's daily radiation
 * block merged in under `radiation`, covering 92 days back and 7 forward. That
 * window is what turns clear-sky light into the light that actually landed.
 */
export async function fetchWeather(signal?: AbortSignal): Promise<WeatherPayload> {
  const parsed = await fetchPayload(signal);
  return {
    conditions: toConditions(parsed as Parameters<typeof toConditions>[0]),
    radiation: radiationSeries(parsed),
  };
}

/** Conditions alone, for callers that do not care about light. */
export async function fetchCurrentConditions(signal?: AbortSignal): Promise<CurrentConditions> {
  return (await fetchWeather(signal)).conditions;
}

async function fetchPayload(signal?: AbortSignal): Promise<unknown> {
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
      return parsed;
    }
    throw new Error(result.error?.message ?? "Weather flow returned no data");
  } catch (flowError) {
    // Outside the player (npm run dev) there is no flow host; fall back to a
    // direct call so local development keeps working.
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${STATION.lat}&longitude=${STATION.lng}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,` +
      `precipitation,weather_code,cloud_cover,is_day` +
      `&daily=shortwave_radiation_sum&past_days=92&forecast_days=7` +
      `&timezone=America%2FTegucigalpa`;
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
      return await res.json();
    } catch {
      // Report the flow's failure, not the fallback's — the flow is the path
      // that matters in the deployed app.
      throw flowError instanceof Error ? flowError : new Error("Weather unavailable");
    }
  }
}
