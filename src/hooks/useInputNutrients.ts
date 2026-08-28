/**
 * How much of each element a fertilizer application actually delivered.
 *
 * The Fertilization table showed N, P, K and Ca columns that were blank for
 * every row — the app carried the field names but nothing computed them, and
 * bv_InputComponent was not even bound, so the composition they depend on had
 * nowhere to come from.
 *
 * They are computed rather than stored because they follow from two things
 * that are: the input's composition, and how much of it went on. Storing them
 * as well would mean a number that silently disagrees with its own inputs the
 * first time a composition is corrected.
 */

import { useCallback, useMemo } from "react";
import { useRecords } from "./useRecords";
import { applicationBreakdown, byElement } from "../services/nutrients";

interface ComponentRow {
  id: string;
  name?: string;
  symbol?: string;
  elementSymbol?: string;
  elementalFactor?: number;
  isNutrient?: boolean;
}
interface InputComponentRow {
  id: string;
  input?: string;
  component?: string;
  percentage?: number;
}

export function useInputNutrients(): {
  /** Elemental kg delivered, keyed by element, or null when unknowable. */
  elementsFor: (inputName: string, kg: number) => Record<string, number> | null;
  /** Whether any composition has been recorded at all. */
  hasCompositions: boolean;
} {
  const [components] = useRecords<ComponentRow>("components", []);
  const [lines] = useRecords<InputComponentRow>("inputComponents", []);

  /** input name -> its composition, in the shape nutrients.ts expects. */
  const compositions = useMemo(() => {
    const byName = new Map(components.map((c) => [String(c.name ?? ""), c]));
    const out = new Map<string, { component: {
      name: string; symbol?: string; reportsAs?: string;
      elementalFactor?: number; isNutrient?: boolean;
    }; percentage: number }[]>();

    for (const line of lines) {
      if (!line.input || !line.component || line.percentage === undefined) continue;
      const c = byName.get(String(line.component));
      const list = out.get(line.input) ?? [];
      list.push({
        component: {
          name: String(line.component),
          symbol: c?.symbol,
          // The element a compound reports as: P2O5 is recorded as applied but
          // counted as P, which is the conversion the factor carries.
          reportsAs: c?.elementSymbol ?? c?.symbol,
          elementalFactor: c?.elementalFactor,
          isNutrient: c?.isNutrient,
        },
        percentage: Number(line.percentage),
      });
      out.set(line.input, list);
    }
    return out;
  }, [components, lines]);

  const elementsFor = useCallback(
    (inputName: string, kg: number) => {
      const composition = compositions.get(inputName);
      // No composition recorded is not zero — it is unknown, and a column of
      // zeros would read as "this fertilizer contains nothing".
      if (!composition || composition.length === 0) return null;
      const applied = applicationBreakdown(
        { name: inputName, composition } as never,
        kg,
        "kg" as never
      );
      return applied ? byElement(applied) : null;
    },
    [compositions]
  );

  return { elementsFor, hasCompositions: compositions.size > 0 };
}
