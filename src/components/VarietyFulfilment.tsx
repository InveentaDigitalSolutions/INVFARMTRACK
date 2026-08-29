/**
 * Can each variety cover what was promised?
 *
 * Three numbers sit behind every variety and they are not interchangeable:
 * what pruning forecasts, what someone counted, and what customers asked for.
 * The bar shows supply against demand, with demand as the line to reach — so
 * a short variety is short by an amount you can see rather than a percentage
 * you have to trust.
 *
 * A variety whose beds have not been counted is drawn hollow. Its figure is
 * the pruning forecast, which is an assumption, and reading an assumption as
 * a measurement is how a nursery promises stock it does not have.
 */

import { useMemo } from "react";
import { useRecords } from "../hooks/useRecords";
import { varietyCoverage } from "../services/varietySupply";

interface PlantingRow { id: string; bed?: string; plant?: string; date?: string; current?: boolean }
interface CountRow { id: string; bed?: string; plant?: string; week?: number; counted?: number }
interface PruningRow { id: string; bed?: string; plant?: string; week?: number; cuttingsEstimated?: number }
interface DemandRow { id: string; plant?: string; week?: number; requested?: number }

export default function VarietyFulfilment() {
  const [plantings] = useRecords<PlantingRow>("plantings", []);
  const [counts] = useRecords<CountRow>("bedCounts", []);
  const [pruning] = useRecords<PruningRow>("pruning", []);
  const [demand] = useRecords<DemandRow>("demandForecasts", []);

  const rows = useMemo(
    () =>
      varietyCoverage({
        plantings,
        // The record's own variety wins; the bed's stands in only when that
        // bed carries exactly one.
        counts: counts.map((c) => ({ bed: c.bed, plant: c.plant, week: c.week, value: c.counted })),
        pruning: pruning.map((p) => ({ bed: p.bed, plant: p.plant, week: p.week, value: p.cuttingsEstimated })),
        demand,
      }),
    [plantings, counts, pruning, demand]
  );

  const max = Math.max(...rows.flatMap((r) => [r.supply, r.demand]), 1);

  /**
   * The figures the headline used to say in prose. Four of them, because
   * "covered" alone hides both how far short we are and how much of the answer
   * rests on a forecast rather than a count.
   */
  const kpi = useMemo(() => {
    const asked = rows.filter((r) => r.demand > 0);
    const demand = asked.reduce((s, r) => s + r.demand, 0);
    const supply = asked.reduce((s, r) => s + Math.min(r.supply, r.demand), 0);
    const short = asked.filter((r) => r.balance < 0);
    return {
      asked: asked.length,
      covered: asked.length - short.length,
      coveredPct: asked.length ? Math.round(((asked.length - short.length) / asked.length) * 100) : 0,
      demandPct: demand ? Math.round((supply / demand) * 100) : 0,
      shortBy: short.reduce((s, r) => s + Math.abs(r.balance), 0),
      shortCount: short.length,
      assumed: asked.filter((r) => r.assumed).length,
      assumedPct: asked.length
        ? Math.round((asked.filter((r) => r.assumed).length / asked.length) * 100)
        : 0,
    };
  }, [rows]);

  return (
    <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
      <p className="text-[13px] font-semibold text-navy-900">Client fulfilment by variety</p>
      <p className="text-[11px] text-navy-400 mb-4">
        Supply against demand per variety · a hollow bar rests on the pruning forecast, not a count
      </p>

      {kpi.asked > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-sand-200 rounded-lg
                        overflow-hidden mb-5">
          <Stat
            label="Varieties covered"
            value={`${kpi.covered}/${kpi.asked}`}
            note={`${kpi.coveredPct}% of what was asked for`}
          />
          <Stat
            label="Demand met"
            value={`${kpi.demandPct}%`}
            note="of the quantity requested"
            tone={kpi.demandPct >= 100 ? "good" : kpi.demandPct >= 80 ? "warn" : "bad"}
          />
          <Stat
            label="Short by"
            value={kpi.shortBy.toLocaleString()}
            note={kpi.shortCount ? `across ${kpi.shortCount} varieties` : "nothing outstanding"}
            tone={kpi.shortBy > 0 ? "bad" : "good"}
          />
          <Stat
            label="On forecast only"
            value={`${kpi.assumedPct}%`}
            note={`${kpi.assumed} not yet counted`}
            tone={kpi.assumedPct > 50 ? "warn" : "default"}
          />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-[12px] text-navy-400 py-8 text-center">
          Nothing to compare yet. Record a pruning estimate or import a customer forecast.
        </p>
      ) : (
        <>
          <div className="space-y-2.5">
            {rows.map((r) => {
              const short = r.balance < 0 && r.demand > 0;
              return (
                <div key={r.variety} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-[11px] text-navy-600 truncate" title={r.variety}>
                    {r.variety}
                    {r.beds > 0 && <span className="text-navy-300"> · {r.beds} beds</span>}
                  </span>

                  <div className="relative flex-1 h-5 rounded bg-sand-100 overflow-hidden">
                    {/* Supply. Hollow where it is only a forecast. */}
                    <div
                      className={`absolute inset-y-0 left-0 rounded ${
                        r.assumed
                          ? "bg-navy-400/25 border border-navy-400/50"
                          : short ? "bg-amber-500" : "bg-lime-600"
                      }`}
                      style={{ width: `${Math.max((r.supply / max) * 100, r.supply > 0 ? 1 : 0)}%` }}
                      title={`${r.assumed ? "Forecast" : "Counted"} ${r.supply.toLocaleString()}`}
                    />
                    {/* Demand, as the mark to reach rather than a second bar. */}
                    {r.demand > 0 && (
                      <span
                        className="absolute top-0 bottom-0 w-0.5 bg-navy-800"
                        style={{ left: `${(r.demand / max) * 100}%` }}
                        title={`Asked for ${r.demand.toLocaleString()}`}
                      />
                    )}
                  </div>

                  <span className="w-12 shrink-0 text-[11px] text-right tabular-nums text-navy-500">
                    {r.demand > 0 ? `${r.coverage}%` : "—"}
                  </span>
                  <span
                    className={`w-20 shrink-0 text-[11px] text-right tabular-nums font-medium ${
                      short ? "text-red-600" : r.demand > 0 ? "text-navy-500" : "text-navy-300"
                    }`}
                  >
                    {r.demand === 0
                      ? "no demand"
                      : short
                        ? `−${Math.abs(r.balance).toLocaleString()}`
                        : `+${r.balance.toLocaleString()}`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-navy-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-sm bg-lime-600" /> counted, covers demand
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-sm bg-amber-500" /> counted, short
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-sm bg-navy-400/25 border border-navy-400/50" /> pruning forecast only
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-0.5 h-3 bg-navy-800" /> asked for
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/** One figure in the strip above the bars. Colour carries the reading. */
function Stat({
  label, value, note, tone = "default",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const colour =
    tone === "good" ? "text-lime-700"
    : tone === "warn" ? "text-amber-700"
    : tone === "bad" ? "text-red-700"
    : "text-navy-900";
  return (
    <div className="bg-white px-3.5 py-3">
      <p className="text-[10px] uppercase tracking-wide text-navy-400">{label}</p>
      <p className={`text-[19px] font-semibold tabular-nums leading-tight ${colour}`}>{value}</p>
      {note && <p className="text-[10px] text-navy-400 mt-0.5">{note}</p>}
    </div>
  );
}
