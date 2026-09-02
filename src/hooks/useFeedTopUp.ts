/**
 * Fill in what the app missed while nobody had it open.
 *
 * The live weather has always refreshed itself. The stored record of daily
 * sunlight did not: it was filled by a script somebody had to remember to run,
 * so the table sat four days behind and the growth figures quietly fell back
 * to clear-sky arithmetic for the days in between.
 *
 * Open-Meteo's window carries about ninety days of measured totals, so
 * anything missing from the store can simply be written when the app starts.
 * Once per launch, not per screen: this runs at the top of the app and is
 * guarded, because two screens mounting at once would otherwise each create
 * the same day.
 */

import { useEffect, useRef } from "react";
import { useRecords } from "./useRecords";
import { useCurrentWeather } from "./useCurrentWeather";
import { hostingMode } from "../services/tableMap";
import { nurseryToday } from "../services/solar";
import { missingDays } from "../services/feedTopUp";

interface SolarRadiationRow {
  id: string;
  date?: string;
  megajoules?: number;
  source?: string;
}

export function useFeedTopUp(): void {
  const [stored, setStored] = useRecords<SolarRadiationRow>("solarRadiation", []);
  const { radiation: live } = useCurrentWeather();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (hostingMode() === "demo") return;
    // Wait until both sides have actually arrived; an empty live map at first
    // render is not "nothing to do".
    if (live.size === 0) return;

    const missing = missingDays(stored, live, nurseryToday());
    if (missing.length === 0) {
      done.current = true;
      return;
    }

    done.current = true;
    console.info(`[feeds] storing ${missing.length} day(s) of sunlight that were missing`);
    void setStored([
      ...stored,
      ...missing.map((day) => ({
        id: "",
        date: day.date,
        megajoules: Math.round(day.megajoules * 100) / 100,
        source: "Open-Meteo",
      })),
    ]);
  }, [stored, live, setStored]);
}
