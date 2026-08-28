/**
 * When each planting was made and when it should be ready.
 *
 * The schedule this replaces was a hardcoded array that gave one variety to a
 * whole field — "Hawaiian in E3" — when E3 has 33 beds that can each hold
 * something different. Grouping by variety alone would have been wrong too:
 * the same variety planted in three waves has three harvest windows, and one
 * bar per variety hides exactly the thing worth seeing.
 *
 * So the unit here is a cohort: a variety, planted in one week, across
 * however many beds. Waves fall out of the data instead of being assumed.
 *
 * Nothing is projected without a cycle time. A cohort whose variety has no
 * weeks-to-first-cut recorded reports its planting and says the rest is
 * unknown, rather than drawing a plausible bar nobody entered.
 */

export interface PlantingLike {
  bed?: string;
  plant?: string;
  date?: string;
  qty?: number;
  status?: string;
}

export interface PlantCycle {
  /** Variety name as it appears on a planting. */
  plant: string;
  weeksToFirstHarvest?: number;
  productiveWeeks?: number;
}

export interface Cohort {
  plant: string;
  /** ISO date of the Monday the cohort was planted in. */
  weekStart: string;
  /** ISO week number, for labelling. */
  week: number;
  beds: string[];
  qty: number;
  /** First cut, when the variety has a cycle time. */
  harvestFrom?: string;
  /** End of the productive window, when one is recorded. */
  harvestTo?: string;
  /** True when no cycle time is known, so nothing after planting is drawn. */
  unscheduled: boolean;
}

const day = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${String(s).slice(0, 10)}T00:00:00Z`);

/** The Monday of the week a date falls in, so plantings a few days apart group. */
export function weekStart(dateISO: string): string {
  const d = parse(dateISO);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return iso(new Date(d.getTime() - dow * day));
}

/** ISO week number, for labels people recognise from the packing schedule. */
export function isoWeek(dateISO: string): number {
  const d = parse(dateISO);
  const target = new Date(d.getTime());
  target.setUTCDate(target.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * day));
}

const addWeeks = (dateISO: string, weeks: number) =>
  iso(new Date(parse(dateISO).getTime() + weeks * 7 * day));

/**
 * Groups plantings into cohorts and projects each one's harvest window.
 *
 * Grouping is by variety and planting week rather than exact date: beds
 * planted on Monday and Wednesday are one wave in practice, and treating them
 * as two would produce a chart of eighty single-bed rows.
 */
export function cohorts(
  plantings: PlantingLike[],
  cycles: PlantCycle[] = []
): Cohort[] {
  const cycleOf = new Map(cycles.map((c) => [c.plant, c]));
  const grouped = new Map<string, Cohort>();

  for (const p of plantings) {
    if (!p.plant || !p.date) continue;
    if (p.status === "Inactive") continue;

    const start = weekStart(String(p.date));
    const key = `${p.plant}|${start}`;
    const existing = grouped.get(key);
    if (existing) {
      if (p.bed && !existing.beds.includes(p.bed)) existing.beds.push(p.bed);
      existing.qty += p.qty ?? 0;
      continue;
    }

    const cycle = cycleOf.get(p.plant);
    const weeks = cycle?.weeksToFirstHarvest;
    const productive = cycle?.productiveWeeks;

    grouped.set(key, {
      plant: p.plant,
      weekStart: start,
      week: isoWeek(start),
      beds: p.bed ? [p.bed] : [],
      qty: p.qty ?? 0,
      harvestFrom: weeks ? addWeeks(start, weeks) : undefined,
      harvestTo: weeks && productive ? addWeeks(start, weeks + productive) : undefined,
      unscheduled: !weeks,
    });
  }

  return [...grouped.values()].sort((a, b) =>
    a.weekStart === b.weekStart ? a.plant.localeCompare(b.plant) : a.weekStart < b.weekStart ? -1 : 1
  );
}

/** Which varieties have no cycle time, so the screen can say what is missing. */
export function missingCycles(list: Cohort[]): string[] {
  return [...new Set(list.filter((c) => c.unscheduled).map((c) => c.plant))].sort();
}
