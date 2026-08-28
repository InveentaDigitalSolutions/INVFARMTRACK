/**
 * Whether the nursery can cover what has been asked for, week by week.
 *
 * Availability has three sides and they disagree on purpose. Pruning gives an
 * estimate; walking the beds gives a count; the customer's sheet gives a
 * demand. The useful view is all three against each other per week, because
 * the question is not "how much is there" but "is it enough, and when is it
 * not".
 *
 * Counted supply beats estimated wherever both exist — the count is someone
 * looking at the plants, and the estimate is an assumption about them.
 */

export interface WeekSupply {
  week: number;
  /** From pruning: the assumed availability. */
  estimated: number;
  /** From walking the beds. Undefined when that week has not been counted. */
  counted?: number;
  /** What customers have asked for. */
  demand: number;
  /** The number to plan on: counted where it exists, else estimated. */
  supply: number;
  /** Positive is spare, negative is short. */
  balance: number;
  /** True where the week rests on an estimate rather than a count. */
  assumed: boolean;
}

export interface SupplyInput {
  counts: { week?: number; counted?: number }[];
  pruning: { week?: number; cuttingsEstimated?: number }[];
  demand: { week?: number; requested?: number }[];
}

/** One row per week that any of the three sides mentions. */
export function weeklySupply(input: SupplyInput): WeekSupply[] {
  const weeks = new Set<number>();
  const add = (w: unknown) => {
    const n = Number(w);
    if (Number.isFinite(n) && n > 0) weeks.add(n);
  };
  input.counts.forEach((c) => add(c.week));
  input.pruning.forEach((p) => add(p.week));
  input.demand.forEach((d) => add(d.week));

  const sum = <T,>(rows: T[], week: number, pick: (r: T) => number | undefined, wk: (r: T) => unknown) =>
    rows.filter((r) => Number(wk(r)) === week).reduce((s, r) => s + (pick(r) ?? 0), 0);

  return [...weeks]
    .sort((a, b) => a - b)
    .map((week) => {
      const estimated = sum(input.pruning, week, (p) => p.cuttingsEstimated, (p) => p.week);
      const countedRows = input.counts.filter((c) => Number(c.week) === week);
      const counted = countedRows.length
        ? countedRows.reduce((s, c) => s + (c.counted ?? 0), 0)
        : undefined;
      const demand = sum(input.demand, week, (d) => d.requested, (d) => d.week);

      // The count is someone looking at the plants; the estimate is an
      // assumption about them. Where both exist the count wins.
      const supply = counted ?? estimated;
      return {
        week, estimated, counted, demand, supply,
        balance: supply - demand,
        assumed: counted === undefined,
      };
    });
}

export interface SupplyVerdict {
  headline: string;
  detail?: string;
  tone: "good" | "warn" | "bad" | "neutral";
}

/**
 * The sentence at the top. Names the first week that falls short, because
 * that is the one there is still time to do something about.
 */
export function supplyVerdict(weeks: WeekSupply[]): SupplyVerdict {
  const withDemand = weeks.filter((w) => w.demand > 0);
  if (withDemand.length === 0) {
    return {
      headline: "No demand recorded yet",
      detail: "Import a customer forecast and it will be compared against what the beds hold.",
      tone: "neutral",
    };
  }

  const short = withDemand.filter((w) => w.balance < 0).sort((a, b) => a.week - b.week);
  const assumed = withDemand.filter((w) => w.assumed).length;

  if (short.length === 0) {
    const tightest = [...withDemand].sort((a, b) => a.balance - b.balance)[0];
    return {
      headline: `Supply covers demand through week ${withDemand[withDemand.length - 1].week}`,
      detail: `Tightest is week ${tightest.week}, ${tightest.balance.toLocaleString()} spare` +
        (assumed > 0 ? ` · ${assumed} week${assumed === 1 ? "" : "s"} still resting on the pruning estimate` : ""),
      tone: assumed > 0 ? "neutral" : "good",
    };
  }

  const first = short[0];
  const worst = [...short].sort((a, b) => a.balance - b.balance)[0];
  return {
    headline: `Week ${first.week} is short by ${Math.abs(first.balance).toLocaleString()}`,
    detail:
      (short.length > 1
        ? `${short.length} weeks fall short, worst is week ${worst.week} at ${Math.abs(worst.balance).toLocaleString()}.`
        : "") +
      (first.assumed ? " This week has not been counted — the figure is the pruning estimate." : ""),
    tone: short.length > 1 ? "bad" : "warn",
  };
}

/** Which varieties are short, so the shortfall has somewhere to be acted on. */
export function shortfallByVariety(
  demand: { plant?: string; week?: number; requested?: number }[],
  supplyByVariety: Map<string, number>
): { name: string; value: number }[] {
  const wanted = new Map<string, number>();
  for (const d of demand) {
    if (!d.plant) continue;
    wanted.set(d.plant, (wanted.get(d.plant) ?? 0) + (d.requested ?? 0));
  }
  return [...wanted.entries()]
    .map(([name, asked]) => ({ name, value: (supplyByVariety.get(name) ?? 0) - asked }))
    .sort((a, b) => a.value - b.value);
}

/** How much of the plan rests on a count rather than an assumption. */
export function countedShare(weeks: WeekSupply[]): number {
  if (weeks.length === 0) return 0;
  return Math.round((weeks.filter((w) => !w.assumed).length / weeks.length) * 100);
}
