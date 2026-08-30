/**
 * Every bed in the nursery, with the field and shadehouse it sits in and
 * whatever is currently planted there.
 *
 * The bed picker used to build this list from a hardcoded config: four fields
 * with invented types, levels and varieties. The bed names happened to line up
 * with the real ones, which is the only reason planting saved correctly — the
 * lookup resolves by name. Everything else about it was fiction, including
 * varieties the nursery does not grow.
 *
 * The counts shown per field now come from the beds that actually exist, which
 * is what makes "how many beds are in this field" answerable.
 */

import { useMemo } from "react";
import { useRecords } from "./useRecords";

export interface BedOption {
  id: string;
  name: string;
  fieldId: string;
  fieldName: string;
  shadehouseId: string;
  shadehouseName: string;
  /** Undefined when the bed has not been told which it is. */
  type?: "Basket" | "Ground";
  /** Undefined when unknown; 0 is a real answer meaning ground level. */
  level?: number;
  /** What is growing there now, joined for display; blank if the bed is empty. */
  plant?: string;
  /** Every variety standing on the bed. Use this to count, not `plant`. */
  plants?: string[];
}

interface BedRow { id: string; name?: string; field?: string; type?: string; level?: string | number; active?: boolean }
interface FieldRow { id: string; name?: string; shadehouse?: string; rows?: number }
interface PlantingRow { id: string; bed?: string; plant?: string; date?: string; current?: boolean }

export function useNurseryBeds(fallback: BedOption[] = []): {
  beds: BedOption[];
  /** Bed count per field name — what the picker shows beside each field. */
  countByField: Record<string, number>;
  /** True while the live set is empty and the fallback is standing in. */
  isFallback: boolean;
} {
  const [bedRows] = useRecords<BedRow>("beds", []);
  const [fieldRows] = useRecords<FieldRow>("fields", []);
  const [plantings] = useRecords<PlantingRow>("plantings", []);

  const beds = useMemo<BedOption[]>(() => {
    if (bedRows.length === 0) return fallback;

    const fieldOf = new Map(fieldRows.map((f) => [String(f.name ?? ""), f]));

    // Every variety still standing on a bed, not just the latest — a bed can
    // carry 4,000 of one and 200 of another at the same time.
    const plantsOf = new Map<string, string[]>();
    for (const p of plantings) {
      if (!p.bed || !p.plant || p.current === false) continue;
      const here = plantsOf.get(String(p.bed)) ?? [];
      if (!here.includes(String(p.plant))) here.push(String(p.plant));
      plantsOf.set(String(p.bed), here);
    }
    for (const list of plantsOf.values()) list.sort();

    return bedRows
      .filter((b) => b.active !== false)
      .map((b) => {
        const name = String(b.name ?? "");
        const fieldName = String(b.field ?? "");
        const field = fieldOf.get(fieldName);
        const shadehouse = String(field?.shadehouse ?? "");
        return {
          id: name,
          name,
          fieldId: fieldName,
          fieldName,
          shadehouseId: shadehouse,
          shadehouseName: shadehouse,
          // Not defaulted: a bed whose type nobody has recorded is unknown,
          // and calling it Air would be the same guess that had to be undone.
          type: (b.type === "Ground" || b.type === "Basket" ? b.type : undefined) as BedOption["type"],
          level: b.level === undefined || b.level === null ? undefined : Number(b.level),
          plant: (plantsOf.get(name) ?? []).join(" + "),
          plants: plantsOf.get(name) ?? [],
        };
      })
      // "E3-02" after "E3-01", not after "E3-10", which a plain sort would do.
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [bedRows, fieldRows, plantings, fallback]);

  const countByField = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const bed of beds) counts[bed.fieldName] = (counts[bed.fieldName] ?? 0) + 1;
    return counts;
  }, [beds]);

  return { beds, countByField, isFallback: bedRows.length === 0 };
}
