/**
 * What the dashboard reports, from what is actually recorded.
 *
 * Every figure on it used to be a literal: "76K harvest", "+23% vs 2025-S1",
 * "$6,200 revenue", "24 active plantings". None came from anywhere. A
 * dashboard that invents its numbers is worse than a plain one that does not,
 * because it is believed.
 *
 * A metric here reports `undefined` when it cannot be worked out, and the card
 * shows a dash. Comparisons are only returned when there is a real prior
 * period to compare against — a nursery in its first season has nothing to
 * compare to, and saying "+23%" anyway is how the old version lied.
 */

import { useMemo } from "react";
import { useRecords } from "./useRecords";
import { paidAgainst, money } from "../services/invoiceMath";

interface HarvestRow { id: string; date?: string; qty?: number; quality?: string; bed?: string }
interface PlantingRow { id: string; bed?: string; plant?: string; date?: string; qty?: number; current?: boolean }
interface InvoiceRow { id: string; total?: number; balance?: number; status?: string; dueDate?: string; currency?: string }
interface BedRow { id: string; name?: string; active?: boolean; field?: string }
interface CountRow { id: string; bed?: string; week?: number; counted?: number }
interface TreatmentRow { id: string }
interface IrrigationRow { id: string; liters?: number }
interface CustomerRow { id: string }
interface TimesheetRow { id: string; worker?: string; boxes?: number; hours?: number }
interface TaskRow { id: string; title?: string; due?: string; status?: string; priority?: string }

export interface Metric {
  value?: number;
  /** Percentage change against the prior period, when one exists. */
  changePct?: number;
  /** What the comparison is against, for the card's label. */
  against?: string;
}

const monthKey = (d: string) => String(d).slice(0, 7);

/** ISO week, used to find the next shipment week's counted total. */
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round((t.getTime() - first.getTime()) / (7 * 86_400_000));
}

export function useDashboardMetrics() {
  const [harvests] = useRecords<HarvestRow>("harvest", []);
  const [plantings] = useRecords<PlantingRow>("plantings", []);
  const [invoices] = useRecords<InvoiceRow>("invoices", []);
  const [payments] = useRecords<{ id: string; invoice?: string; amount?: number; current?: boolean }>("payments", []);
  const [beds] = useRecords<BedRow>("beds", []);
  const [counts] = useRecords<CountRow>("bedCounts", []);
  const [treatments] = useRecords<TreatmentRow>("treatments", []);
  const [irrigation] = useRecords<IrrigationRow>("irrigation", []);
  const [customers] = useRecords<CustomerRow>("customers", []);
  const [timesheets] = useRecords<TimesheetRow>("timesheets", []);
  const [tasks] = useRecords<TaskRow>("tasks", []);

  return useMemo(() => {
    const now = new Date();
    const thisMonth = monthKey(now.toISOString());
    const prev = new Date(now);
    prev.setMonth(prev.getMonth() - 1);
    const lastMonth = monthKey(prev.toISOString());

    /** Harvest this month against last, which is a comparison that exists. */
    const harvestIn = (m: string) =>
      harvests.filter((h) => monthKey(String(h.date ?? "")) === m)
        .reduce((sum, h) => sum + (h.qty ?? 0), 0);

    const thisHarvest = harvestIn(thisMonth);
    const lastHarvest = harvestIn(lastMonth);
    const harvest: Metric = {
      value: harvests.length ? thisHarvest : undefined,
      changePct: lastHarvest > 0 ? Math.round(((thisHarvest - lastHarvest) / lastHarvest) * 100) : undefined,
      against: lastHarvest > 0 ? "vs last month" : undefined,
    };

    /** A planting is active until something replaces it on that bed. */
    const latestByBed = new Map<string, PlantingRow>();
    for (const p of [...plantings].sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1))) {
      if (p.bed && p.current !== false) latestByBed.set(p.bed, p);
    }
    const activePlantings: Metric = { value: plantings.length ? latestByBed.size : undefined };

    /** Beds carrying a crop, against beds that exist. */
    const liveBeds = beds.filter((b) => b.active !== false);
    const planted: Metric = {
      value: liveBeds.length ? latestByBed.size : undefined,
    };

    /** Money owed: what invoices still carry, less what has been paid. */
    const open = invoices.filter((i) => i.status !== "Paid" && i.status !== "Cancelled");
    const receivable: Metric = {
      value: invoices.length
        ? money(open.reduce((sum, i) => {
            const paid = paidAgainst(i.id, payments);
            return sum + Math.max(0, (i.total ?? 0) - paid);
          }, 0))
        : undefined,
    };

    /** What the field counted for the coming shipment week. */
    const nextWeek = isoWeek(now) + 1;
    const countedRows = counts.filter((c) => c.week === nextWeek);
    const counted: Metric = {
      value: countedRows.length
        ? countedRows.reduce((sum, c) => sum + (c.counted ?? 0), 0)
        : undefined,
    };

    /** Harvest by variety, for the breakdown — from the bed it came off. */
    const varietyOfBed = new Map([...latestByBed].map(([bed, p]) => [bed, String(p.plant ?? "")]));
    const byVariety = new Map<string, number>();
    for (const h of harvests) {
      const v = h.bed ? varietyOfBed.get(h.bed) : undefined;
      if (!v) continue;
      byVariety.set(v, (byVariety.get(v) ?? 0) + (h.qty ?? 0));
    }

    /** The last six months of harvest, for the trend. */
    const months: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      months.push({
        month: d.toLocaleDateString("en-GB", { month: "short" }),
        value: harvestIn(monthKey(d.toISOString())),
      });
    }

    return {
      harvest,
      activePlantings,
      planted,
      totalBeds: liveBeds.length,
      receivable,
      counted,
      nextWeek,
      byVariety: [...byVariety.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      months,
      /**
       * Season-to-date totals. No percentage changes: there is no prior
       * season on file to compare against, and the panel these replace
       * asserted "+18%", "+23%" and "+15%" for exactly that comparison.
       */
      totals: {
        harvested: harvests.reduce((sum, h) => sum + (h.qty ?? 0), 0),
        plantings: plantings.length,
        treatments: treatments.length,
        irrigationLitres: irrigation.reduce((sum, i) => sum + (i.liters ?? 0), 0),
        customers: customers.length,
        invoiced: money(invoices.reduce((sum, i) => sum + (i.total ?? 0), 0)),
        counted: counts.reduce((sum, c) => sum + (c.counted ?? 0), 0),
        bedsPlanted: latestByBed.size,
      },

      /**
       * Harvest by field. With one shadehouse a per-shadehouse split says
       * nothing — it was three hardcoded rows all called "Shadehouse 1" —
       * whereas which of four fields is producing varies and can be acted on.
       */
      byField: (() => {
        const fieldOfBed = new Map<string, string>();
        for (const b of beds) if (b.name && b.field) fieldOfBed.set(b.name, b.field);
        const out = new Map<string, number>();
        for (const h of harvests) {
          const f = h.bed ? fieldOfBed.get(h.bed) : undefined;
          if (f) out.set(f, (out.get(f) ?? 0) + (h.qty ?? 0));
        }
        return [...out.entries()]
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
      })(),

      /** Work still open, and what of it is already late. */
      openTasks: (() => {
        const today = new Date().toISOString().slice(0, 10);
        const open = tasks.filter((t) => t.status !== "Done" && t.status !== "Skipped");
        return {
          count: open.length,
          overdue: open.filter((t) => t.due && String(t.due).slice(0, 10) < today).length,
          next: open
            .filter((t) => t.due)
            .sort((a, b) => String(a.due).localeCompare(String(b.due)))
            .slice(0, 4)
            .map((t) => ({ title: String(t.title ?? ""), due: String(t.due).slice(0, 10),
                           late: String(t.due).slice(0, 10) < today })),
        };
      })(),

      /** Boxes packed per worker, from their timesheets. */
      byWorker: [...timesheets.reduce((map, t) => {
        if (!t.worker) return map;
        map.set(t.worker, (map.get(t.worker) ?? 0) + (t.boxes ?? 0));
        return map;
      }, new Map<string, number>())]
        .map(([name, boxes]) => ({ name, boxes }))
        .filter((w) => w.boxes > 0)
        .sort((a, b) => b.boxes - a.boxes)
        .slice(0, 5),

      /** True when nothing has been recorded yet, so the page can say so. */
      empty: harvests.length === 0 && plantings.length === 0 && invoices.length === 0,
    };
  }, [harvests, plantings, invoices, payments, beds, counts, treatments, irrigation, customers, timesheets, tasks]);
}
