/**
 * The season in figures.
 *
 * An earlier version opened with a generated paragraph restating the tiles in
 * prose, above two full-height charts. Santiago's read was that the visuals
 * crowded out the numbers and the paragraph said nothing the figures did not —
 * so the figures lead, each carrying its own comparison, and the charts sit
 * below as reference someone can open.
 *
 * Every figure comes from records. Where a comparison does not exist it is
 * omitted rather than invented.
 */

import { useMemo } from "react";
import { Scissors, Sprout, Layers, Boxes, CalendarClock } from "lucide-react";
import { useRecords } from "../hooks/useRecords";
import { useNurseryBeds } from "../hooks/useNurseryBeds";
import MetricTile, { trendOf } from "./MetricTile";
import RankedBars from "./RankedBars";
import ProductionSchedule from "./ProductionSchedule";
import BedRotation from "./BedRotation";
import {
  harvestInsight, varietyInsight, occupancyInsight,
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

  const changePct =
    model.lastMonth > 0
      ? Math.round(((model.thisMonth - model.lastMonth) / model.lastMonth) * 100)
      : undefined;

  return (
    <div className="space-y-5">
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

      {/* Detail below the figures, collapsed. They are worth having and not
          worth the top of the screen — Santiago's point was that big visuals
          crowd out the numbers they exist to support. */}
      <details className="bg-white rounded-xl border border-sand-200/80 shadow-sm">
        <summary className="px-5 py-3 text-[13px] font-semibold text-navy-900 cursor-pointer
                            select-none hover:bg-sand-50/60 rounded-xl">
          Planting schedule
        </summary>
        <div className="px-5 pb-5"><ProductionSchedule /></div>
      </details>
      <details className="bg-white rounded-xl border border-sand-200/80 shadow-sm">
        <summary className="px-5 py-3 text-[13px] font-semibold text-navy-900 cursor-pointer
                            select-none hover:bg-sand-50/60 rounded-xl">
          Bed rotation
        </summary>
        <div className="px-5 pb-5"><BedRotation /></div>
      </details>
    </div>
  );
}

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round((t.getTime() - first.getTime()) / (7 * 86_400_000));
}
