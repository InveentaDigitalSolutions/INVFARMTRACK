import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Thermometer, Droplets, Wind, Eye, Sun, CloudRain, Gauge,
  ArrowUp, ChevronDown, ChevronUp, Sunrise, Sunset, CloudSun,
} from "lucide-react";

// Nursery coordinates — El Olvido, Santa Cruz de Yojoa
const LAT = 14.97;
const LNG = -87.85;

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  pressure: number;
  precipitation: number;
  uvIndex: number;
  visibility: number;
  cloudCover: number;
  weatherCode: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
}

const weatherDescriptions: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 80: "Slight showers", 81: "Moderate showers",
  82: "Violent showers", 95: "Thunderstorm", 96: "Thunderstorm with hail",
};

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return iso; }
}

interface WeatherWidgetProps {
  compact?: boolean;
  className?: string;
}

export default function WeatherWidget({ compact = false, className = "" }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,precipitation,weather_code,cloud_cover,is_day,uv_index&daily=sunrise,sunset&timezone=America%2FTegucigalpa&forecast_days=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();
        const c = data.current;
        setWeather({
          temperature: c.temperature_2m,
          humidity: c.relative_humidity_2m,
          windSpeed: c.wind_speed_10m,
          windDirection: c.wind_direction_10m,
          windGusts: c.wind_gusts_10m,
          pressure: c.surface_pressure,
          precipitation: c.precipitation,
          uvIndex: c.uv_index,
          visibility: 10, // Open-Meteo doesn't provide visibility in free tier
          cloudCover: c.cloud_cover,
          weatherCode: c.weather_code,
          isDay: c.is_day === 1,
          sunrise: data.daily.sunrise[0],
          sunset: data.daily.sunset[0],
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
    // Refresh every 15 minutes
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

  const description = weatherDescriptions[weather.weatherCode] || "Unknown";

  // Compact mode — just temperature + icon for sidebar/header
  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-sand-50 hover:bg-sand-100 transition-colors cursor-pointer ${className}`}
      >
        <Thermometer className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-[13px] font-semibold text-navy-900">{weather.temperature}°C</span>
        <span className="text-[11px] text-navy-400 hidden sm:inline">{description}</span>
        <Droplets className="w-3 h-3 text-blue-400 ml-1" />
        <span className="text-[11px] text-navy-500">{weather.humidity}%</span>
      </button>
    );
  }

  // Full widget
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border border-sand-200/80 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
            {weather.isDay ? <Sun className="w-5 h-5 text-white" /> : <CloudSun className="w-5 h-5 text-white" />}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-navy-900">{weather.temperature}°C</span>
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
          { icon: Droplets, label: "Humidity", value: `${weather.humidity}%`, color: "text-blue-500" },
          { icon: Wind, label: "Wind", value: `${weather.windSpeed} km/h`, color: "text-navy-500" },
          { icon: Sun, label: "UV Index", value: String(weather.uvIndex), color: "text-amber-500" },
          { icon: CloudRain, label: "Rain", value: `${weather.precipitation} mm`, color: "text-blue-600" },
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

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-sand-100"
        >
          <div className="p-4 grid grid-cols-2 gap-3 text-[12px]">
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-navy-400" />
              <span className="text-navy-500">Pressure</span>
              <span className="ml-auto font-medium text-navy-800">{weather.pressure.toFixed(0)} hPa</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-3.5 h-3.5 text-navy-400" />
              <span className="text-navy-500">Gusts</span>
              <span className="ml-auto font-medium text-navy-800">{weather.windGusts} km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUp className="w-3.5 h-3.5 text-navy-400" style={{ transform: `rotate(${weather.windDirection}deg)` }} />
              <span className="text-navy-500">Direction</span>
              <span className="ml-auto font-medium text-navy-800">{windDirectionLabel(weather.windDirection)} ({weather.windDirection}°)</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-navy-400" />
              <span className="text-navy-500">Cloud Cover</span>
              <span className="ml-auto font-medium text-navy-800">{weather.cloudCover}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Sunrise className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-navy-500">Sunrise</span>
              <span className="ml-auto font-medium text-navy-800">{formatTime(weather.sunrise)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sunset className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-navy-500">Sunset</span>
              <span className="ml-auto font-medium text-navy-800">{formatTime(weather.sunset)}</span>
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="text-[9px] text-navy-400 flex items-center gap-1">
              <span>Source: Open-Meteo API</span>
              <span>·</span>
              <span>Auto-refreshes every 15 min</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
