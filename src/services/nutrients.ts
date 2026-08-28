/**
 * Nutrient accounting.
 *
 * An input's composition is a LIST, not a fixed set of fields. A fertiliser
 * may declare twelve nutrients, a pesticide two active ingredients, a
 * biostimulant humic acid and seaweed extract. So composition lives in
 * inv_InputComponent (input x component x percentage) and this module works
 * off whatever lines an input happens to have.
 *
 * The conversion that must not be got wrong: labels quote P and K as OXIDES.
 * "20-20-20" is 20% N, 20% P2O5, 20% K2O. Read as elemental it overstates P by
 * ~2.29x and K by ~1.20x. Each component therefore carries its own elemental
 * factor rather than the input carrying one global basis flag — because a
 * single product can mix oxide and elemental declarations.
 */

export type DoseUnit = "kg" | "g" | "L" | "mL";

export type ComponentCategory =
  | "macronutrient" | "secondary" | "micronutrient"
  | "active-ingredient" | "organic" | "carrier" | "other";

/** A row of the component catalogue (inv_Component). */
export interface Component {
  id: string;
  name: string;
  /** N, P2O5, K2O, Fe, Azadirachtin … */
  symbol?: string;
  category: ComponentCategory;
  /** Element this rolls up to: P2O5 -> "P". Absent for non-nutrients. */
  reportsAs?: string;
  /** Multiplier to elemental mass. P2O5 = 0.4364, K2O = 0.8301, else 1. */
  elementalFactor?: number;
  isNutrient?: boolean;
}

/** One line of an input's guaranteed analysis (inv_InputComponent). */
export interface CompositionLine {
  component: Component;
  /** Percent by weight of product, as printed on the label. */
  percentage: number;
}

export interface Input {
  id: string;
  name: string;
  composition: CompositionLine[];
  /** Required to turn a litre dose into kilograms of product. */
  densityKgPerL?: number;
}

/** Standard oxide conversions, for seeding the catalogue. */
export const ELEMENTAL_FACTORS: Record<string, { reportsAs: string; factor: number }> = {
  P2O5: { reportsAs: "P", factor: 0.4364 },
  K2O: { reportsAs: "K", factor: 0.8301 },
  CaO: { reportsAs: "Ca", factor: 0.7147 },
  MgO: { reportsAs: "Mg", factor: 0.6030 },
  SO3: { reportsAs: "S", factor: 0.4005 },
};

/** Convert any dose to kilograms of product. */
export function doseToKg(amount: number, unit: DoseUnit, densityKgPerL?: number): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  switch (unit) {
    case "kg": return amount;
    case "g": return amount / 1000;
    case "L":
    case "mL": {
      const litres = unit === "L" ? amount : amount / 1000;
      // A volume is not a mass. Refuse rather than assume water — fertiliser
      // concentrates run 1.2-1.4 kg/L, so guessing 1.0 is a 20-40% error.
      if (!densityKgPerL) return null;
      return litres * densityKgPerL;
    }
  }
}

export interface AppliedComponent {
  component: Component;
  /** Mass of the declared substance, e.g. kg of P2O5. */
  productKg: number;
  /** Mass expressed as the element it reports as, e.g. kg of P. */
  elementalKg: number;
}

/**
 * What one application actually delivered, line by line.
 * Returns null when the dose cannot be resolved to a mass.
 */
export function applicationBreakdown(
  input: Input,
  amount: number,
  unit: DoseUnit
): AppliedComponent[] | null {
  const productKg = doseToKg(amount, unit, input.densityKgPerL);
  if (productKg === null) return null;

  return input.composition.map((line) => {
    const mass = (line.percentage / 100) * productKg;
    return {
      component: line.component,
      productKg: mass,
      elementalKg: mass * (line.component.elementalFactor ?? 1),
    };
  });
}

/** Roll a breakdown up by element — the figure a nutrient balance needs. */
export function byElement(applied: AppliedComponent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of applied) {
    if (a.component.isNutrient === false) continue;
    const key = a.component.reportsAs ?? a.component.symbol ?? a.component.name;
    out[key] = (out[key] ?? 0) + a.elementalKg;
  }
  return out;
}

/** Sum many applications — per bed, per field, per season. */
export function totalByElement(all: Record<string, number>[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const one of all) {
    for (const [k, v] of Object.entries(one)) total[k] = (total[k] ?? 0) + v;
  }
  return total;
}

/** Grams per square metre — the figure agronomists actually work in. */
export function perSquareMetre(mass: Record<string, number>, areaM2: number): Record<string, number> {
  if (!areaM2) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(mass)) out[k] = (v * 1000) / areaM2;
  return out;
}

/** Active ingredients only — what a re-entry or residue check cares about. */
export function activeIngredients(applied: AppliedComponent[]): AppliedComponent[] {
  return applied.filter((a) => a.component.category === "active-ingredient");
}
