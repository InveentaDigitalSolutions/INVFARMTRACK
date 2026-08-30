/**
 * What is actually happening on each bed, from the records rather than a seed.
 *
 * The shadehouse map, the bed waffle and the dashboard's key insight all ran
 * off `generateBeds()` — 120 beds with invented varieties, invented planting
 * dates and an invented pest warning on one bed in seven. It was convincing,
 * which is what made it dangerous: nothing on the screen said it was made up.
 *
 * A bed's state is derived, never stored. Stored state drifts the moment
 * somebody records a harvest and forgets to change a dropdown.
 */

import { growthWeeks } from "./phenology";
import type { PhenologyPlant } from "./rowTypes.helpers";

export type BedState = "empty" | "planted" | "growing" | "harvest-ready" | "issue";

export interface PlantingLike { bed?: string; plant?: string; date?: string; qty?: number; current?: boolean }
export interface PlantLike extends PhenologyPlant {
  name?: string;
  variety?: string;
  productiveWeeks?: number;
}
export interface DatedBedRecord { bed?: string; date?: string; type?: string }

/** Treatments that mean something is wrong, rather than routine feeding. */
const PROBLEM = /pest|disease|fungic|insectic|miticid|nematic/i;

/** Weeks between two dates, floored. */
const weeksBetween = (from: string, to: Date): number => {
  const t = Date.parse(from);
  if (Number.isNaN(t)) return 0;
  return Math.floor((to.getTime() - t) / (7 * 86_400_000));
};

export interface BedStatus {
  state: BedState;
  /**
   * What the bed reads as: the variety, or "A + B" where it carries several.
   * Use `varieties` for anything that counts rather than displays.
   */
  variety: string;
  /** Every variety standing on the bed, sorted. Empty when nothing is. */
  varieties: string[];
  plantedDate: string;
  /** When the first cut is due, from the plant's own cycle. Blank if unknown. */
  expectedHarvest: string;
  /** Why the bed is flagged, when it is. Never invented. */
  notes: string;
}

/**
 * Bed name -> what is on it and how it is doing.
 *
 * The cycle comes from the plant catalogue, and it depends on when the bed was
 * seeded: the same cutting takes 8-10 weeks to eight leaves between March and
 * August and 10-12 between September and February. A variety with no figures
 * recorded can only be called "growing" — claiming it is ready would be a guess
 * dressed as a fact, and the nursery would go and cut it.
 */
export function bedStatuses(input: {
  plantings: PlantingLike[];
  plants: PlantLike[];
  treatments?: DatedBedRecord[];
  today?: Date;
}): Map<string, BedStatus> {
  const today = input.today ?? new Date();

  // Keyed to the plant rather than to a single number, because how long it
  // takes depends on the month the bed was seeded.
  const plantOf = new Map<string, PlantLike>();
  for (const p of input.plants) {
    const label = [p.name, p.variety].filter(Boolean).join(" / ");
    if (label) plantOf.set(label, p);
    if (p.variety) plantOf.set(p.variety, p);
  }

  /**
   * Every seeding still standing on each bed, oldest first.
   *
   * A bed can carry more than one variety at a time — 4,000 of one and 200 of
   * another. This kept only the latest, so the second silently replaced the
   * first and the map showed a bed growing something it had alongside, not
   * instead of.
   */
  const standing = new Map<string, PlantingLike[]>();
  for (const p of [...input.plantings].sort((a, b) => (String(a.date ?? "") < String(b.date ?? "") ? -1 : 1))) {
    if (!p.bed || p.current === false) continue;
    const here = standing.get(String(p.bed)) ?? [];
    here.push(p);
    standing.set(String(p.bed), here);
  }

  // A pest or disease treatment in the last three weeks still counts as open.
  const flagged = new Map<string, string>();
  for (const t of input.treatments ?? []) {
    if (!t.bed || !t.date) continue;
    if (!PROBLEM.test(String(t.type ?? ""))) continue;
    if (weeksBetween(String(t.date), today) > 3) continue;
    flagged.set(String(t.bed), `${t.type} treated ${String(t.date).slice(0, 10)}`);
  }

  const out = new Map<string, BedStatus>();
  for (const [bed, here] of standing) {
    // The oldest standing seeding sets the bed's age and readiness — it is the
    // one nearest to being cut. All the varieties are listed alongside.
    const planting = here[0];
    const varieties = [...new Set(here.map((p) => String(p.plant ?? "")).filter(Boolean))].sort();
    const variety = varieties.length === 1 ? varieties[0] : varieties.join(" + ");
    const planted = String(planting.date ?? "").slice(0, 10);
    // The cycle depends on the month it went in, so it is looked up against
    // the seeding date rather than read off the variety as one flat number.
    const cycle = planted
      ? growthWeeks(plantOf.get(varieties[0] ?? variety), planted)?.expected
      : undefined;
    const age = planted ? weeksBetween(planted, today) : 0;

    let expectedHarvest = "";
    if (planted && cycle) {
      const d = new Date(planted);
      d.setDate(d.getDate() + cycle * 7);
      expectedHarvest = d.toISOString().slice(0, 10);
    }

    const state: BedState = flagged.has(bed)
      ? "issue"
      : cycle && age >= cycle
        ? "harvest-ready"
        // Four weeks is the window in which a bed still reads as newly set
        // rather than established; before that it is "planted".
        : age < 4
          ? "planted"
          : "growing";

    out.set(bed, {
      state,
      variety,
      varieties,
      plantedDate: planted,
      expectedHarvest,
      notes: flagged.get(bed) ?? "",
    });
  }
  return out;
}

export interface BedActivity {
  id: string;
  type: "planting" | "treatment" | "irrigation" | "harvest" | "fertilization" | "pruning";
  date: string;
  description: string;
  worker: string;
  details: string;
}

/**
 * Everything recorded against one bed, newest first.
 *
 * This replaces a generator that produced 15-25 plausible entries per bed from
 * a hash of the bed's name. A bed with no history now shows no history, which
 * is the truth and is also the prompt to go and record something.
 */
export function bedHistory(
  bed: string,
  sources: {
    plantings?: (PlantingLike & { qty?: number })[];
    treatments?: (DatedBedRecord & { input?: string; worker?: string })[];
    irrigation?: (DatedBedRecord & { liters?: number; method?: string })[];
    harvest?: (DatedBedRecord & { qty?: number; quality?: string; worker?: string })[];
    fertilization?: (DatedBedRecord & { input?: string; qtyKg?: number; worker?: string })[];
    pruning?: (DatedBedRecord & { cuttingsEstimated?: number; worker?: string })[];
  }
): BedActivity[] {
  const mine = <T extends { bed?: string }>(rows: T[] | undefined) =>
    (rows ?? []).filter((r) => String(r.bed ?? "") === bed);

  const out: BedActivity[] = [
    ...mine(sources.plantings).map((r, i) => ({
      id: `pl-${i}`, type: "planting" as const, date: String(r.date ?? "").slice(0, 10),
      description: r.plant ? `Planted ${r.plant}` : "Planted",
      worker: "", details: r.qty ? `${r.qty.toLocaleString()} plants` : "",
    })),
    ...mine(sources.treatments).map((r, i) => ({
      id: `tr-${i}`, type: "treatment" as const, date: String(r.date ?? "").slice(0, 10),
      description: String(r.type ?? "Treatment"),
      worker: String(r.worker ?? ""), details: String(r.input ?? ""),
    })),
    ...mine(sources.irrigation).map((r, i) => ({
      id: `ir-${i}`, type: "irrigation" as const, date: String(r.date ?? "").slice(0, 10),
      description: r.method ? `Irrigated — ${r.method}` : "Irrigated",
      worker: "", details: r.liters ? `${r.liters.toLocaleString()} L` : "",
    })),
    ...mine(sources.harvest).map((r, i) => ({
      id: `hv-${i}`, type: "harvest" as const, date: String(r.date ?? "").slice(0, 10),
      description: "Harvested",
      worker: String(r.worker ?? ""),
      details: [r.qty ? `${r.qty.toLocaleString()} cuttings` : "", r.quality].filter(Boolean).join(" · "),
    })),
    ...mine(sources.fertilization).map((r, i) => ({
      id: `fe-${i}`, type: "fertilization" as const, date: String(r.date ?? "").slice(0, 10),
      description: r.input ? `Fertilised — ${r.input}` : "Fertilised",
      worker: String(r.worker ?? ""), details: r.qtyKg ? `${r.qtyKg} kg` : "",
    })),
    ...mine(sources.pruning).map((r, i) => ({
      id: `pr-${i}`, type: "pruning" as const, date: String(r.date ?? "").slice(0, 10),
      description: "Pruned",
      worker: String(r.worker ?? ""),
      details: r.cuttingsEstimated ? `${r.cuttingsEstimated.toLocaleString()} cuttings estimated` : "",
    })),
  ];

  return out.filter((a) => a.date).sort((a, b) => (a.date < b.date ? 1 : -1));
}
