/**
 * What the season looks like, said before it is shown.
 *
 * The Overview held a schedule and a rotation chart and no answer to "how is
 * it going". The reports Santiago shared all open the same way — a sentence
 * with a verdict, then figures that each carry a comparison, then the detail —
 * so that is the order here.
 *
 * Every figure comes from records. Where there is nothing to say the page says
 * so, which is the discipline the old dashboard lacked when it asserted "+23%
 * vs 2025-S1" for a season that does not exist.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Scissors, Sprout, Layers, Boxes, CalendarClock } from "lucide-react";
import { useRecords } from "../hooks/useRecords";
import { useNurseryBeds } from "../hooks/useNurseryBeds";
import MetricTile, { trendOf } from "./MetricTile";
import RankedBars from "./RankedBars";
import ProductionSchedule from "./ProductionSchedule";
import BedRotation from "./BedRotation";
import {
  harvestInsight, varietyInsight, occupancyInsight, summary,
} from "../services/productionInsight";
import { cohorts, missingCycles } from "../services/productionSchedule";

interface HarvestRow { id: string; date?: string; qty?: number; bed?: string }
interface PlantingRow { id: string; bed?: string; plant?: string; date?: string; qty?: number; status?: string }
interface PlantRow { id: string; name?: string; variety?: string; weeksToFirstHarvest?: number; productiveWeeks?: number }
interface CountRow { id: string; week?: number; counted?: number }

const monthKey = (d: string) => String(d).slice(0, 7);

export default function ProductionOverview() {
  const [harvests] = useRecords<HarvestRow>("harvest", []);
  const [plantings] = useRecords<PlantingRow>("plantings", []);
  const [plants] = useRecords<PlantRow>("plants", []);
  const [counts] = useRecords<CountRow>("bedCounts", []);
  const { beds } = useNurseryBeds();

  const model = useMemo(() => {
    const now = new Date();

    /** Six months of harvest, oldest first. */
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (5 - i));
      const key = monthKey(d.toISOString());
      return {
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        value: harvests
          .filter((h) => monthKey(String(h.date ?? "")) === key)
          .reduce((s, h) => s + (h.qty ?? 0), 0),
      };
    });

    /** The crop standing on each bed now. */
    const latestByBed = new Map<string, PlantingRow>();
    for (const p of [...plantings].sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1))) {
      if (p.bed && p.status !== "Inactive") latestByBed.set(p.bed, p);
    }

    /** Harvest attributed to a variety through the bed it came off. */
    const varietyOfBed = new Map([...latestByBed].map(([bed, p]) => [bed, String(p.plant ?? "")]));
    const byVariety = new Map<string, number>();
    for (const h of harvests) {
      const v = h.bed ? varietyOfBed.get(h.bed) : undefined;
      if (v) byVariety.set(v, (byVariety.get(v) ?? 0) + (h.qty ?? 0));
    }

    /** Beds carrying each variety, which is the other half of the picture. */
    const bedsByVariety = new Map<string, number>();
    for (const [, p] of latestByBed) {
      const v = String(p.plant ?? "");
      if (v) bedsByVariety.set(v, (bedsByVariety.get(v) ?? 0) + 1);
    }

    const waves = cohorts(
      plantings,
      plants.map((p) => ({
        plant: [p.name, p.variety].filter(Boolean).join(" / "),
        weeksToFirstHarvest: p.weeksToFirstHarvest,
        productiveWeeks: p.productiveWeeks,
      }))
    );

    const liveBeds = beds.filter((b) => b.name);
    const varietyList = [...byVariety.entries()].map(([label, value]) => ({ label, value }));

    return {
      months,
      thisMonth: months[months.length - 1]?.value ?? 0,
      lastMonth: months[months.length - 2]?.value ?? 0,
      planted: latestByBed.size,
      totalBeds: liveBeds.length,
      byVariety: varietyList,
      bedsByVariety: [...bedsByVariety.entries()].map(([name, value]) => ({ name, value })),
      waves,
      unscheduled: missingCycles(waves).length,
      counted: counts.reduce((s, c) => s + (c.counted ?? 0), 0),
      nextWeekCounted: counts
        .filter((c) => c.week === isoWeek(now) + 1)
        .reduce((s, c) => s + (c.counted ?? 0), 0),
      harvest: harvestInsight(months),
      variety: varietyInsight(varietyList),
      occupancy: occupancyInsight(latestByBed.size, liveBeds.length),
    };
  }, [harvests, plantings, plants, counts, beds]);

  const paragraph = summary({
    harvest: model.harvest,
    variety: model.variety,
    occupancy: model.occupancy,
    waves: model.waves.length,
    unscheduled: model.unscheduled,
  });

  const changePct =
    model.lastMonth > 0
      ? Math.round(((model.thisMonth - model.lastMonth) / model.lastMonth) * 100)
      : undefined;

  const accent =
    model.harvest.tone === "good" ? "border-l-lime-500"
    : model.harvest.tone === "warn" ? "border-l-amber-500"
    : "border-l-navy-300";

  return (
    <div className="space-y-5">
      {/* The verdict, before the numbers. */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-xl border border-sand-200/80 border-l-4 ${accent} p-5 shadow-sm`}
      >
        <h3 className="text-[15px] font-semibold text-navy-900 mb-1">{model.harvest.headline}</h3>
        <p className="text-[13px] text-navy-600 leading-relaxed max-w-3xl">{paragraph}</p>
        {model.harvest.detail && (
          <p className="text-[12px] text-navy-400 mt-2">{model.harvest.detail}</p>
        )}
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <MetricTile
          label="Harvest this month"
          value={model.thisMonth.toLocaleString()}
          icon={Scissors}
          series={model.months.map((m) => m.value)}
          tone={model.harvest.tone === "warn" ? "warn" : "good"}
          comparison={
            changePct === undefined
              ? undefined
              : {
                  label: "vs last month",
                  value: `${changePct > 0 ? "+" : ""}${changePct}%`,
                  direction: changePct > 2 ? "up" : changePct < -2 ? "down" : "flat",
                }
          }
          context={{ label: "6-month total", value: model.months.reduce((s, m) => s + m.value, 0).toLocaleString() }}
        />
        <MetricTile
          label="Beds carrying a crop"
          value={`${model.planted}`}
          icon={Sprout}
          tone={model.occupancy.tone === "warn" ? "warn" : "good"}
          comparison={
            model.totalBeds
              ? { label: "of the nursery", value: `${Math.round((model.planted / model.totalBeds) * 100)}%` }
              : undefined
          }
          context={model.totalBeds ? { label: "beds in total", value: String(model.totalBeds) } : undefined}
        />
        <MetricTile
          label="Planting waves"
          value={String(model.waves.length)}
          icon={CalendarClock}
          context={
            model.unscheduled > 0
              ? { label: "no cycle time", value: String(model.unscheduled) }
              : undefined
          }
          tone={model.unscheduled > 0 ? "warn" : "default"}
        />
        <MetricTile
          label="Counted for next week"
          value={model.nextWeekCounted ? model.nextWeekCounted.toLocaleString() : "—"}
          icon={Boxes}
          context={{ label: "counted overall", value: model.counted.toLocaleString() }}
        />
        <MetricTile
          label="Varieties in the ground"
          value={String(model.bedsByVariety.length)}
          icon={Layers}
          tone={model.variety.tone === "warn" ? "warn" : "default"}
          comparison={
            model.byVariety.length > 0
              ? {
                  label: "trend",
                  value: model.harvest.headline.includes("rising") ? "rising" : model.harvest.headline.includes("falling") ? "falling" : "steady",
                  direction: trendOf(model.months.map((m) => m.value)),
                }
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
          <h4 className="text-[13px] font-semibold text-navy-900">{model.variety.headline}</h4>
          <p className="text-[11px] text-navy-400 mb-4">
            {model.variety.detail ?? "Harvest attributed through the bed each cut came from"}
          </p>
          <RankedBars rows={model.byVariety.map((v) => ({ name: v.label, value: v.value }))} />
        </div>

        <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
          <h4 className="text-[13px] font-semibold text-navy-900">Beds per variety</h4>
          <p className="text-[11px] text-navy-400 mb-4">
            What is standing in the ground now, which is what next season's cuts come from
          </p>
          <RankedBars rows={model.bedsByVariety} format={(v) => `${v}`} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
        <ProductionSchedule />
      </div>
      <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
        <BedRotation />
      </div>
    </div>
  );
}

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round((t.getTime() - first.getTime()) / (7 * 86_400_000));
}
