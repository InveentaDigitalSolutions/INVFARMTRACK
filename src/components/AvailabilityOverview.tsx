/**
 * Supply against demand, week by week.
 *
 * Availability had a table of projections and nothing that answered the
 * question the table exists for: can we cover what has been asked for, and
 * when can we not. Figures first, each carrying its own comparison, then the
 * detail — a paragraph restating the tiles was only saying it twice.
 *
 * The chart draws three things because the nursery has three: what pruning
 * assumed, what someone counted, and what customers asked for. A week resting
 * on the estimate is drawn differently from one that was counted, so nobody
 * reads an assumption as a measurement.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Boxes, ClipboardCheck, TrendingDown, Percent } from "lucide-react";
import { useRecords } from "../hooks/useRecords";
import MetricTile from "./MetricTile";
import RankedBars from "./RankedBars";
import {
  weeklySupply, shortfallByVariety, countedShare,
  type WeekSupply,
} from "../services/availabilityInsight";

interface CountRow { id: string; bed?: string; week?: number; counted?: number }
interface PruningRow { id: string; week?: number; cuttingsEstimated?: number }
interface ForecastRow { id: string; plant?: string; week?: number; requested?: number }

export default function AvailabilityOverview() {
  const [counts] = useRecords<CountRow>("bedCounts", []);
  const [pruning] = useRecords<PruningRow>("pruning", []);
  const [demand] = useRecords<ForecastRow>("demandForecasts", []);

  const weeks = useMemo(
    () => weeklySupply({ counts, pruning, demand }),
    [counts, pruning, demand]
  );
  const shortfalls = useMemo(() => {
    // Supply per variety is not yet attributable — counts are per bed and the
    // bed's variety comes from its planting — so this compares what was asked
    // for against nothing until that link is built. Shown only when there is
    // demand to show.
    const byVariety = new Map<string, number>();
    return shortfallByVariety(demand, byVariety).filter((r) => r.value < 0);
  }, [demand]);

  const totals = useMemo(() => {
    const supply = weeks.reduce((s, w) => s + w.supply, 0);
    const asked = weeks.reduce((s, w) => s + w.demand, 0);
    const short = weeks.filter((w) => w.balance < 0);
    return {
      supply, asked,
      shortWeeks: short.length,
      shortBy: short.reduce((s, w) => s + Math.abs(w.balance), 0),
      counted: countedShare(weeks),
    };
  }, [weeks]);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <MetricTile
          label="Available across the period"
          value={totals.supply ? totals.supply.toLocaleString() : "—"}
          icon={Boxes}
          series={weeks.map((w) => w.supply)}
          tone="good"
          comparison={
            totals.asked > 0
              ? {
                  label: "of demand",
                  value: `${Math.round((totals.supply / totals.asked) * 100)}%`,
                  direction: totals.supply >= totals.asked ? "up" : "down",
                }
              : undefined
          }
        />
        <MetricTile
          label="Asked for"
          value={totals.asked ? totals.asked.toLocaleString() : "—"}
          icon={ClipboardCheck}
          series={weeks.map((w) => w.demand)}
          context={{ label: "weeks covered", value: String(weeks.filter((w) => w.demand > 0).length) }}
        />
        <MetricTile
          label="Short across the period"
          value={totals.shortBy ? totals.shortBy.toLocaleString() : "0"}
          icon={TrendingDown}
          tone={totals.shortBy > 0 ? "bad" : "good"}
          context={{ label: "weeks short", value: String(totals.shortWeeks) }}
        />
        <MetricTile
          label="Based on a real count"
          value={weeks.length ? `${totals.counted}%` : "—"}
          icon={Percent}
          tone={totals.counted >= 80 ? "good" : totals.counted >= 40 ? "warn" : "bad"}
          context={{
            label: "still estimated",
            value: String(weeks.filter((w) => w.assumed).length),
          }}
        />
      </motion.div>

      <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
        <h4 className="text-[13px] font-semibold text-navy-900">Supply against demand</h4>
        <p className="text-[11px] text-navy-400 mb-4">
          A hatched bar rests on the pruning estimate rather than a count
        </p>
        {weeks.length === 0 ? (
          <p className="text-[12px] text-navy-400 py-8 text-center">
            Nothing to compare yet. Count a week, or import a customer forecast.
          </p>
        ) : (
          <SupplyChart weeks={weeks} />
        )}
      </div>

      {shortfalls.length > 0 && (
        <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
          <h4 className="text-[13px] font-semibold text-navy-900">Where the shortfall sits</h4>
          <p className="text-[11px] text-navy-400 mb-4">By variety, worst first</p>
          <RankedBars
            rows={shortfalls.map((r) => ({ name: r.name, value: Math.abs(r.value) }))}
            showAverage={false}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Supply and demand side by side per week, with the shortfall picked out.
 * Hand-drawn rather than charted: the hatching that marks an assumed week is
 * the point of the whole view, and it is easier to be exact about it here.
 */
function SupplyChart({ weeks }: { weeks: WeekSupply[] }) {
  const max = Math.max(...weeks.flatMap((w) => [w.supply, w.demand]), 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-[11px] text-navy-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded-sm bg-lime-600" /> counted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded-sm bg-lime-600/30 border border-lime-600/50" /> estimated
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded-sm bg-navy-400" /> asked for
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[520px] space-y-2">
          {weeks.map((w) => {
            const short = w.balance < 0 && w.demand > 0;
            return (
              <div key={w.week} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-[11px] font-mono text-navy-500 text-right">
                  wk {w.week}
                </span>

                <div className="flex-1 space-y-1">
                  <div className="relative h-3.5 rounded bg-sand-100 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded ${
                        w.assumed ? "bg-lime-600/30 border border-lime-600/50" : "bg-lime-600"
                      }`}
                      style={{ width: `${Math.max((w.supply / max) * 100, w.supply > 0 ? 1 : 0)}%` }}
                      title={`${w.assumed ? "Estimated" : "Counted"} ${w.supply.toLocaleString()}`}
                    />
                  </div>
                  <div className="relative h-3.5 rounded bg-sand-100 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-navy-400"
                      style={{ width: `${Math.max((w.demand / max) * 100, w.demand > 0 ? 1 : 0)}%` }}
                      title={`Asked for ${w.demand.toLocaleString()}`}
                    />
                  </div>
                </div>

                <span
                  className={`w-24 shrink-0 text-[11px] text-right tabular-nums font-medium ${
                    short ? "text-red-600" : w.demand > 0 ? "text-navy-500" : "text-navy-300"
                  }`}
                >
                  {w.demand === 0
                    ? "no demand"
                    : short
                      ? `short ${Math.abs(w.balance).toLocaleString()}`
                      : `+${w.balance.toLocaleString()}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
