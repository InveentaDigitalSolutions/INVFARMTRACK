import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Thermometer, Droplets, Wind, Sun, CloudRain, Gauge,
  ArrowUp, ChevronDown, ChevronUp, Sunrise, Sunset, CloudSun,
  Cloud, CloudDrizzle, CloudLightning, Snowflake, CloudFog,
} from "lucide-react";

const LAT = 14.97;
const LNG = -87.85;

interface CurrentWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  pressure: number;
  precipitation: number;
  uvIndex: number;
  cloudCover: number;
  weatherCode: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
}

interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number;
  precipProbability: number;
  weatherCode: number;
  windSpeed: number;
}

interface DailyForecast {
  date: string;
  dayName: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipSum: number;
  windMax: number;
  uvMax: number;
  sunrise: string;
  sunset: string;
}

interface FullWeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

const weatherDescriptions: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 80: "Slight showers", 81: "Moderate showers",
  82: "Violent showers", 95: "Thunderstorm", 96: "Thunderstorm with hail",
};

function getWeatherIcon(code: number, size = "w-5 h-5") {
  if (code === 0 || code === 1) return <Sun className={`${size} text-amber-400`} />;
  if (code === 2) return <CloudSun className={`${size} text-amber-300`} />;
  if (code === 3) return <Cloud className={`${size} text-navy-400`} />;
  if (code === 45 || code === 48) return <CloudFog className={`${size} text-navy-300`} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className={`${size} text-blue-400`} />;
  if (code >= 61 && code <= 65) return <CloudRain className={`${size} text-blue-500`} />;
  if (code >= 71 && code <= 73) return <Snowflake className={`${size} text-blue-200`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-blue-600`} />;
  if (code >= 95) return <CloudLightning className={`${size} text-amber-500`} />;
  return <Cloud className={`${size} text-navy-400`} />;
}

function formatHour(iso: string): string {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }); }
  catch { return iso; }
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }); }
  catch { return iso; }
}

function getDayName(iso: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  try { return new Date(iso).toLocaleDateString("en-US", { weekday: "short" }); }
  catch { return iso; }
}

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

interface WeatherWidgetProps {
  compact?: boolean;
  className?: string;
}

export default function WeatherWidget({ compact = false, className = "" }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<FullWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"hourly" | "daily">("hourly");

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,precipitation,weather_code,cloud_cover,is_day,uv_index&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max,uv_index_max&timezone=America%2FTegucigalpa&forecast_days=7`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();
        const c = data.current;

        // Parse hourly — only next 24h from now
        const nowHour = new Date().getHours();
        const hourlyAll: HourlyForecast[] = data.hourly.time.map((t: string, i: number) => ({
          time: t,
          temperature: data.hourly.temperature_2m[i],
          humidity: data.hourly.relative_humidity_2m[i],
          precipProbability: data.hourly.precipitation_probability[i],
          weatherCode: data.hourly.weather_code[i],
          windSpeed: data.hourly.wind_speed_10m[i],
        }));
        // Filter: from current hour for next 24h
        const hourlyFiltered = hourlyAll.filter((h) => {
          const hDate = new Date(h.time);
          const now = new Date();
          return hDate >= now && hDate.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;
        });

        // Parse daily
        const daily: DailyForecast[] = data.daily.time.map((t: string, i: number) => ({
          date: t,
          dayName: getDayName(t, i),
          weatherCode: data.daily.weather_code[i],
          tempMax: data.daily.temperature_2m_max[i],
          tempMin: data.daily.temperature_2m_min[i],
          precipSum: data.daily.precipitation_sum[i],
          windMax: data.daily.wind_speed_10m_max[i],
          uvMax: data.daily.uv_index_max[i],
          sunrise: data.daily.sunrise[i],
          sunset: data.daily.sunset[i],
        }));

        setWeather({
          current: {
            temperature: c.temperature_2m,
            humidity: c.relative_humidity_2m,
            windSpeed: c.wind_speed_10m,
            windDirection: c.wind_direction_10m,
            windGusts: c.wind_gusts_10m,
            pressure: c.surface_pressure,
            precipitation: c.precipitation,
            uvIndex: c.uv_index,
            cloudCover: c.cloud_cover,
            weatherCode: c.weather_code,
            isDay: c.is_day === 1,
            sunrise: data.daily.sunrise[0],
            sunset: data.daily.sunset[0],
          },
          hourly: hourlyFiltered,
          daily,
        });
      } catch { setError(true); }
      finally { setLoading(false); }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-sand-50 ${className}`}>
        <div className="w-3 h-3 rounded-full border border-navy-300 border-t-lime-400 animate-spin" />
        <span className="text-[11px] text-navy-400">Loading weather...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-sand-50 ${className}`}>
        <CloudRain className="w-3.5 h-3.5 text-navy-400" />
        <span className="text-[11px] text-navy-400">Weather unavailable</span>
      </div>
    );
  }

  const { current } = weather;
  const description = weatherDescriptions[current.weatherCode] || "Unknown";

  // Compact mode — sidebar
  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800/50 ${className}`}>
        {getWeatherIcon(current.weatherCode, "w-3.5 h-3.5")}
        <span className="text-[13px] font-semibold text-white">{current.temperature}°C</span>
        <Droplets className="w-3 h-3 text-blue-400 ml-1" />
        <span className="text-[11px] text-navy-400">{current.humidity}%</span>
      </div>
    );
  }

  // Full widget
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border border-sand-200/80 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header — current weather */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
            {getWeatherIcon(current.weatherCode, "w-6 h-6 text-white")}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-navy-900">{current.temperature}°C</span>
              <span className="text-[12px] text-navy-400">{description}</span>
            </div>
            <p className="text-[10px] text-navy-400">El Olvido, Santa Cruz de Yojoa</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-sand-100 cursor-pointer"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-px bg-sand-100 border-t border-sand-100">
        {[
          { icon: Droplets, label: "Humidity", value: `${current.humidity}%`, color: "text-blue-500" },
          { icon: Wind, label: "Wind", value: `${current.windSpeed} km/h ${windDirectionLabel(current.windDirection)}`, color: "text-navy-500" },
          { icon: Sun, label: "UV Index", value: String(current.uvIndex), color: "text-amber-500" },
          { icon: CloudRain, label: "Rain", value: `${current.precipitation} mm`, color: "text-blue-600" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white px-3 py-2.5 flex flex-col items-center gap-1">
              <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className="text-[12px] font-semibold text-navy-900">{stat.value}</span>
              <span className="text-[9px] text-navy-400">{stat.label}</span>
            </div>
          );
        })}
      </div>

      {/* Expanded section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-sand-100 overflow-hidden"
          >
            {/* Extra current details */}
            <div className="px-4 py-3 grid grid-cols-3 gap-3 text-[12px] border-b border-sand-100">
              <div className="flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-navy-400" />
                <span className="text-navy-500">Pressure</span>
                <span className="ml-auto font-medium text-navy-800">{current.pressure.toFixed(0)} hPa</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="w-3.5 h-3.5 text-navy-400" />
                <span className="text-navy-500">Gusts</span>
                <span className="ml-auto font-medium text-navy-800">{current.windGusts} km/h</span>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-navy-400" />
                <span className="text-navy-500">Clouds</span>
                <span className="ml-auto font-medium text-navy-800">{current.cloudCover}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Sunrise className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-navy-500">Sunrise</span>
                <span className="ml-auto font-medium text-navy-800">{formatTime(current.sunrise)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sunset className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-navy-500">Sunset</span>
                <span className="ml-auto font-medium text-navy-800">{formatTime(current.sunset)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-navy-400" />
                <span className="text-navy-500">Feels like</span>
                <span className="ml-auto font-medium text-navy-800">{current.temperature}°C</span>
              </div>
            </div>

            {/* Forecast toggle */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <div className="flex bg-sand-100 rounded-lg p-0.5">
                {(["hourly", "daily"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                      view === v ? "bg-white text-navy-800 shadow-sm" : "text-navy-400 hover:text-navy-600"
                    }`}
                  >
                    {v === "hourly" ? "Today (Hourly)" : "7-Day Forecast"}
                  </button>
                ))}
              </div>
            </div>

            {/* Hourly forecast */}
            {view === "hourly" && (
              <div className="px-4 pb-3">
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {weather.hourly.slice(0, 24).map((h, i) => (
                    <div
                      key={h.time}
                      className="flex flex-col items-center gap-1 min-w-[48px] py-2 px-1.5 rounded-lg hover:bg-sand-50 transition-colors"
                    >
                      <span className="text-[9px] text-navy-400">{formatHour(h.time)}</span>
                      {getWeatherIcon(h.weatherCode, "w-4 h-4")}
                      <span className="text-[12px] font-semibold text-navy-900">{h.temperature}°</span>
                      <div className="flex items-center gap-0.5">
                        <Droplets className="w-2.5 h-2.5 text-blue-400" />
                        <span className="text-[8px] text-blue-500">{h.precipProbability}%</span>
                      </div>
                      <span className="text-[8px] text-navy-300">{h.windSpeed}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily forecast */}
            {view === "daily" && (
              <div className="px-4 pb-3 space-y-0.5">
                {weather.daily.map((d, i) => (
                  <div
                    key={d.date}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-sand-50 transition-colors"
                  >
                    <span className="text-[12px] font-medium text-navy-700 w-16">{d.dayName}</span>
                    {getWeatherIcon(d.weatherCode, "w-4 h-4")}
                    <span className="text-[10px] text-navy-400 w-20 truncate">
                      {weatherDescriptions[d.weatherCode] || "—"}
                    </span>
                    {/* Temp range bar */}
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[11px] text-blue-500 font-medium w-8 text-right">{d.tempMin.toFixed(0)}°</span>
                      <div className="flex-1 h-1.5 rounded-full bg-sand-100 relative overflow-hidden">
                        {(() => {
                          const allMin = Math.min(...weather.daily.map((dd) => dd.tempMin));
                          const allMax = Math.max(...weather.daily.map((dd) => dd.tempMax));
                          const range = allMax - allMin || 1;
                          const left = ((d.tempMin - allMin) / range) * 100;
                          const width = ((d.tempMax - d.tempMin) / range) * 100;
                          return (
                            <div
                              className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 via-amber-400 to-orange-400"
                              style={{ left: `${left}%`, width: `${Math.max(width, 5)}%` }}
                            />
                          );
                        })()}
                      </div>
                      <span className="text-[11px] text-orange-500 font-medium w-8">{d.tempMax.toFixed(0)}°</span>
                    </div>
                    <div className="flex items-center gap-1 w-12">
                      <Droplets className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] text-navy-500">{d.precipSum.toFixed(0)}mm</span>
                    </div>
                    <div className="flex items-center gap-1 w-12">
                      <Wind className="w-3 h-3 text-navy-400" />
                      <span className="text-[10px] text-navy-500">{d.windMax.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 pb-2">
              <p className="text-[9px] text-navy-400">Source: Open-Meteo API · Auto-refreshes every 15 min</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
