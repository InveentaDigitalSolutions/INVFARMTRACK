/**
 * Whether the beds are being fed what the crop takes out.
 *
 * Nutrition held four tables of laboratory numbers and no reading of them. The
 * question underneath is always the same: for each element, is more going in
 * than coming out, and by how much. A negative balance is the nursery mining
 * its own soil, and it does not show up in a harvest figure for a season or
 * two — which is exactly why it needs a number on the screen.
 *
 * pH and aluminium saturation get their own figure because they gate uptake:
 * fertiliser applied to a bed below pH 5 largely does not arrive.
 */
import { ranked, sum } from "./period";

export interface Balance {
  bed?: string;
  week?: number;
  nApplied?: number; pApplied?: number; kApplied?: number; caApplied?: number;
  nExtracted?: number; pExtracted?: number; kExtracted?: number; caExtracted?: number;
  dryMatterPct?: number;
}

export interface SoilAnalysis {
  bed?: string;
  sampleDate?: string;
  ph?: number;
  organicMatter?: number;
  alSaturation?: number;
  cic?: number;
}

export interface FoliarAnalysis {
  bed?: string;
  sampleDate?: string;
  n?: number;
}

export interface BoxWeight {
  date?: string;
  avgLeafWeight?: number;
  netWeight?: number;
  dryMatterPct?: number;
}

export interface ElementBalance {
  element: "N" | "P" | "K" | "Ca";
  applied: number;
  extracted: number;
  /** Positive is a surplus going into the soil, negative is depletion. */
  balance: number;
}

export interface NutritionSummary {
  /** Applied against extracted, per element. */
  elements: ElementBalance[];
  /** Elements running a deficit — the ones to act on. */
  depleted: string[];
  bedsWithBalance: number;
  bedsAnalysed: number;
  /** Mean pH across the most recent analysis of each bed. */
  meanPh?: number;
  /** Beds whose latest analysis is below pH 5.5, where uptake starts to fail. */
  acidBeds: number;
  /** Beds above 30% aluminium saturation, which is toxic to roots. */
  aluminiumBeds: number;
  meanOrganicMatter?: number;
  /** Days since the most recent soil sample was taken. */
  daysSinceSoil?: number;
  meanDryMatter?: number;
  meanLeafWeight?: number;
  /** Applied per element, for a distribution bar. */
  appliedByElement: { name: string; value: number }[];
}

const ELEMENTS = [
  { element: "N" as const, a: "nApplied" as const, e: "nExtracted" as const },
  { element: "P" as const, a: "pApplied" as const, e: "pExtracted" as const },
  { element: "K" as const, a: "kApplied" as const, e: "kExtracted" as const },
  { element: "Ca" as const, a: "caApplied" as const, e: "caExtracted" as const },
];

/** The most recent row per bed — an older sample must not outvote a newer one. */
function latestPerBed<T extends { bed?: string; sampleDate?: string }>(rows: T[]): T[] {
  const byBed = new Map<string, T>();
  for (const r of rows) {
    if (!r.bed) continue;
    const held = byBed.get(r.bed);
    if (!held || String(r.sampleDate ?? "") > String(held.sampleDate ?? "")) byBed.set(r.bed, r);
  }
  return [...byBed.values()];
}

const mean = (values: number[]): number | undefined =>
  values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100 : undefined;

export function nutritionSummary(input: {
  balances: Balance[];
  soil: SoilAnalysis[];
  foliar: FoliarAnalysis[];
  weights: BoxWeight[];
  today?: Date;
}): NutritionSummary {
  const { balances, soil, foliar, weights } = input;
  const today = input.today ?? new Date();

  const elements: ElementBalance[] = ELEMENTS.map(({ element, a, e }) => {
    const applied = sum(balances, (r) => r[a]);
    const extracted = sum(balances, (r) => r[e]);
    return {
      element,
      applied: Math.round(applied * 100) / 100,
      extracted: Math.round(extracted * 100) / 100,
      balance: Math.round((applied - extracted) * 100) / 100,
    };
  });

  const latestSoil = latestPerBed(soil);
  const phValues = latestSoil.map((s) => Number(s.ph)).filter((v) => Number.isFinite(v) && v > 0);
  const omValues = latestSoil.map((s) => Number(s.organicMatter)).filter((v) => Number.isFinite(v) && v > 0);

  const newestSample = soil.reduce(
    (newest, s) => (String(s.sampleDate ?? "") > newest ? String(s.sampleDate) : newest),
    ""
  );
  // Counted between calendar days, not clock times: rounding from "now" made
  // the same sample read 77 days old in the morning and 78 in the afternoon.
  const midnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysSinceSoil = newestSample
    ? Math.max(0, Math.round((midnight - Date.parse(newestSample.slice(0, 10))) / 86_400_000))
    : undefined;

  const appliedMap = new Map<string, number>();
  for (const el of elements) if (el.applied) appliedMap.set(el.element, el.applied);

  return {
    elements,
    depleted: elements.filter((e) => e.balance < 0).map((e) => e.element),
    bedsWithBalance: new Set(balances.map((b) => b.bed).filter(Boolean)).size,
    bedsAnalysed: new Set([...soil, ...foliar].map((r) => r.bed).filter(Boolean)).size,
    meanPh: mean(phValues),
    acidBeds: latestSoil.filter((s) => Number(s.ph) > 0 && Number(s.ph) < 5.5).length,
    aluminiumBeds: latestSoil.filter((s) => Number(s.alSaturation) > 30).length,
    meanOrganicMatter: mean(omValues),
    daysSinceSoil,
    meanDryMatter: mean(
      weights.map((w) => Number(w.dryMatterPct)).filter((v) => Number.isFinite(v) && v > 0)
    ),
    meanLeafWeight: mean(
      weights.map((w) => Number(w.avgLeafWeight)).filter((v) => Number.isFinite(v) && v > 0)
    ),
    appliedByElement: ranked(appliedMap),
  };
}
