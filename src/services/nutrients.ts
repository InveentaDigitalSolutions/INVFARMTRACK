/**
 * Nutrient accounting.
 *
 * An input carries a guaranteed analysis (its percentages). A dose applied to
 * a bed therefore delivers a computable mass of each element — which is what
 * makes per-bed nutrient balance possible rather than guesswork.
 *
 * The one thing that must not be got wrong: fertiliser labels quote P and K as
 * OXIDES. "20-20-20" means 20% N, 20% P2O5, 20% K2O — not 20% elemental P and
 * K. Treating the label figure as elemental overstates P by roughly 2.3x and K
 * by 1.2x, which would quietly corrupt every balance the nursery relies on.
 */

/** P2O5 -> P. Molar: 2 x 30.97 / 141.94 */
export const P2O5_TO_P = 0.4364;
/** K2O -> K. Molar: 2 x 39.10 / 94.20 */
export const K2O_TO_K = 0.8301;

export type AnalysisBasis = "oxide" | "elemental";
export type DoseUnit = "kg" | "g" | "L" | "mL";

export interface InputAnalysis {
  basis: AnalysisBasis;
  /** Percent by weight of product, as printed on the label. */
  N?: number; P?: number; K?: number;
  Ca?: number; Mg?: number; S?: number;
  Fe?: number; Mn?: number; Zn?: number; B?: number; Cu?: number; Mo?: number;
  /** Required to convert a liquid dose into kilograms of product. */
  densityKgPerL?: number;
}

export type NutrientMass = Record<string, number>;

/** Convert any dose to kilograms of product. */
export function doseToKg(amount: number, unit: DoseUnit, densityKgPerL?: number): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  switch (unit) {
    case "kg": return amount;
    case "g": return amount / 1000;
    case "L":
    case "mL": {
      const litres = unit === "L" ? amount : amount / 1000;
      // Without a density a volume cannot become a mass. Refuse rather than
      // silently assuming water at 1.0 kg/L, which fertiliser rarely is.
      if (!densityKgPerL) return null;
      return litres * densityKgPerL;
    }
  }
}

/**
 * Elemental mass of each nutrient delivered by one application, in kg.
 * Returns null when the dose cannot be resolved to a mass.
 */
export function nutrientsApplied(
  analysis: InputAnalysis,
  amount: number,
  unit: DoseUnit
): NutrientMass | null {
  const productKg = doseToKg(amount, unit, analysis.densityKgPerL);
  if (productKg === null) return null;

  const share = (pct?: number) => ((pct ?? 0) / 100) * productKg;

  // N is always elemental on a label; P and K depend on the basis.
  const pFactor = analysis.basis === "oxide" ? P2O5_TO_P : 1;
  const kFactor = analysis.basis === "oxide" ? K2O_TO_K : 1;

  const out: NutrientMass = {
    N: share(analysis.N),
    P: share(analysis.P) * pFactor,
    K: share(analysis.K) * kFactor,
    Ca: share(analysis.Ca),
    Mg: share(analysis.Mg),
    S: share(analysis.S),
    Fe: share(analysis.Fe),
    Mn: share(analysis.Mn),
    Zn: share(analysis.Zn),
    B: share(analysis.B),
    Cu: share(analysis.Cu),
    Mo: share(analysis.Mo),
  };

  // Drop nutrients this product does not contain, so a UI can list only what
  // was actually applied.
  for (const key of Object.keys(out)) if (!out[key]) delete out[key];
  return out;
}

/** Sum many applications — per bed, per plot, per season. */
export function totalNutrients(applications: NutrientMass[]): NutrientMass {
  const total: NutrientMass = {};
  for (const app of applications) {
    for (const [k, v] of Object.entries(app)) total[k] = (total[k] ?? 0) + v;
  }
  return total;
}

/** Grams of nutrient per square metre — the figure agronomists actually use. */
export function perSquareMetre(mass: NutrientMass, areaM2: number): NutrientMass {
  if (!areaM2) return {};
  const out: NutrientMass = {};
  for (const [k, v] of Object.entries(mass)) out[k] = (v * 1000) / areaM2;
  return out;
}
