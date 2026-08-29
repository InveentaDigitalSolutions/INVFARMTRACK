/**
 * Whether each variety can cover what customers asked for.
 *
 * The nursery holds three numbers per variety and they are not the same thing:
 * pruning forecasts what a bed should yield, someone walking the rows counts
 * what it actually holds, and the customer's sheet says what was asked for.
 * Comparing them per week answers "is next Tuesday covered"; comparing them
 * per variety answers "can we keep our promises on Hawaiian", which is the
 * question a fulfilment conversation is actually about.
 *
 * Supply is recorded against beds and demand against varieties, so the two
 * only meet through what is planted where. That link is why this could not be
 * built earlier and why it is built here rather than guessed at.
 */

export interface BedPlanting {
  bed?: string;
  plant?: string;
  date?: string;
  status?: string;
}

export interface BedNumber {
  bed?: string;
  week?: number;
  /** Counted cuttings, or the pruning estimate, depending on the source. */
  value?: number;
}

export interface VarietyDemand {
  plant?: string;
  week?: number;
  requested?: number;
}

export interface VarietyCoverage {
  variety: string;
  /** What pruning suggests the beds will yield. */
  forecast: number;
  /** What someone counted. Undefined when no bed of this variety was counted. */
  counted?: number;
  /** What customers asked for. */
  demand: number;
  /** The number to plan on: counted where it exists, else the forecast. */
  supply: number;
  /** Positive is spare, negative is short. */
  balance: number;
  /** Share of demand that can be met, capped at 100 for reading. */
  coverage: number;
  /** True where supply rests on the forecast rather than a count. */
  assumed: boolean;
  /** How many beds carry this variety, for context on the numbers. */
  beds: number;
}

/** The variety standing on each bed now — the link between beds and demand. */
export function varietyByBed(plantings: BedPlanting[]): Map<string, string> {
  const out = new Map<string, string>();
  const ordered = [...plantings].sort((a, b) =>
    String(a.date ?? "") < String(b.date ?? "") ? -1 : 1
  );
  for (const p of ordered) {
    if (!p.bed || p.status === "Inactive") continue;
    if (p.plant) out.set(p.bed, p.plant);
  }
  return out;
}

/**
 * Coverage per variety, worst first.
 *
 * A week may be given to narrow all three sides to the same window; without
 * one the comparison spans everything recorded, which is the right default
 * for a season-level view.
 */
export function varietyCoverage(input: {
  plantings: BedPlanting[];
  counts: BedNumber[];
  pruning: BedNumber[];
  demand: VarietyDemand[];
  week?: number;
}): VarietyCoverage[] {
  const { week } = input;
  const byBed = varietyByBed(input.plantings);
  const inWeek = <T extends { week?: number }>(rows: T[]) =>
    week === undefined ? rows : rows.filter((r) => Number(r.week) === week);

  const sumByVariety = (rows: BedNumber[]) => {
    const out = new Map<string, number>();
    for (const r of inWeek(rows)) {
      const v = r.bed ? byBed.get(r.bed) : undefined;
      if (!v) continue;
      out.set(v, (out.get(v) ?? 0) + (Number(r.value) || 0));
    }
    return out;
  };

  const forecast = sumByVariety(input.pruning);
  const counted = sumByVariety(input.counts);

  const demand = new Map<string, number>();
  for (const d of inWeek(input.demand)) {
    if (!d.plant) continue;
    demand.set(d.plant, (demand.get(d.plant) ?? 0) + (Number(d.requested) || 0));
  }

  const bedsPer = new Map<string, number>();
  for (const [, variety] of byBed) bedsPer.set(variety, (bedsPer.get(variety) ?? 0) + 1);

  const varieties = new Set([...forecast.keys(), ...counted.keys(), ...demand.keys()]);

  return [...varieties]
    .map((variety) => {
      const f = forecast.get(variety) ?? 0;
      // A variety with no counted bed is unknown, not zero — treating it as
      // zero would report a shortfall nobody has measured.
      const c = counted.has(variety) ? counted.get(variety)! : undefined;
      const d = demand.get(variety) ?? 0;
      const supply = c ?? f;
      return {
        variety,
        forecast: f,
        counted: c,
        demand: d,
        supply,
        balance: supply - d,
        coverage: d > 0 ? Math.min(100, Math.round((supply / d) * 100)) : 100,
        assumed: c === undefined,
        beds: bedsPer.get(variety) ?? 0,
      };
    })
    // Worst coverage first: the point of the view is what cannot be met.
    .sort((a, b) => (a.coverage === b.coverage ? a.balance - b.balance : a.coverage - b.coverage));
}

/** The one-line read on fulfilment, for a heading. */
export function coverageVerdict(rows: VarietyCoverage[]): {
  headline: string;
  tone: "good" | "warn" | "bad" | "neutral";
} {
  const asked = rows.filter((r) => r.demand > 0);
  if (asked.length === 0) {
    return { headline: "Nothing asked for yet", tone: "neutral" };
  }
  const short = asked.filter((r) => r.balance < 0);
  if (short.length === 0) {
    const assumed = asked.filter((r) => r.assumed).length;
    return {
      headline: assumed
        ? `All ${asked.length} varieties covered, ${assumed} on the pruning forecast`
        : `All ${asked.length} varieties covered`,
      tone: assumed ? "neutral" : "good",
    };
  }
  const worst = short[0];
  return {
    headline: `${worst.variety} covers ${worst.coverage}% of demand`,
    tone: short.length > 1 ? "bad" : "warn",
  };
}
