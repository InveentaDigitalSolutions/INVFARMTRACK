/**
 * The shadehouse map, built from what is recorded rather than from a seed.
 *
 * `generateBeds()` invented 120 beds, gave each a variety the nursery may not
 * grow, a planting date in the past and — one bed in seven — a pest warning.
 * The dashboard's key insight, the bed waffle and the nursery map all read it,
 * so three screens agreed with each other about a nursery that did not exist.
 *
 * Geometry still comes from `plotConfigs`: the field positions and bed widths
 * were measured off the farm plan and are not data anybody types in. Which
 * beds exist, what is on them and how they are doing all come from Dataverse.
 */

import { useMemo } from "react";
import { useRecords } from "./useRecords";
import { plotConfigs, potsPerCable, type ShadehouseBed, type BedLevel } from "../services/shadehouseLayout";
import { bedStatuses, bedHistory, type BedActivity } from "../services/bedState";
import { parseBedName } from "../services/infrastructureRules";
import type {
  BedsRow, PlantingsRow, PlantsRow, TreatmentsRow,
  IrrigationRow, HarvestRow, FertilizationRow, PruningRow,
} from "../services/rowTypes.generated";

export function useShadehouseBeds(): {
  beds: ShadehouseBed[];
  /** Everything recorded against one bed, newest first. */
  historyFor: (bedName: string) => BedActivity[];
  /** True when no bed has been created yet — the screens say so rather than drawing nothing. */
  isEmpty: boolean;
} {
  const [bedRows] = useRecords<BedsRow>("beds", []);
  const [plantings] = useRecords<PlantingsRow>("plantings", []);
  const [plants] = useRecords<PlantsRow>("plants", []);
  const [treatments] = useRecords<TreatmentsRow>("treatments", []);
  const [irrigation] = useRecords<IrrigationRow>("irrigation", []);
  const [harvest] = useRecords<HarvestRow>("harvest", []);
  const [fertilization] = useRecords<FertilizationRow>("fertilization", []);
  const [pruning] = useRecords<PruningRow>("pruning", []);

  const beds = useMemo<ShadehouseBed[]>(() => {
    const status = bedStatuses({ plantings, plants, treatments });

    return bedRows
      .filter((b) => b.name && b.active !== false)
      .map((b) => {
        const name = String(b.name);
        const parsed = parseBedName(name);
        // The field on the record is authoritative; the name is the fallback
        // for a bed created before the lookup existed.
        const fieldId = String(b.field ?? parsed?.field ?? "");
        const geometry = plotConfigs.find((p) => p.id === fieldId);
        const level = (parsed?.level ?? Number(b.level ?? 0)) as BedLevel;
        const s = status.get(name);

        return {
          bedId: name,
          fieldId,
          bedNumber: parsed?.row ?? 0,
          level,
          type: level === 0 ? ("ground" as const) : ("basket" as const),
          // A cable row's pots are not counted anywhere: the hooks run the
          // length of the house whether or not anything hangs on them, so the
          // count comes from the cable. Without it the 3D view drew bare wire.
          potCount: level === 0 ? undefined : potsPerCable(geometry?.bedLength ?? 37.2),
          // A field with no geometry on file falls back to the common bed size
          // rather than to zero, which would draw the map as a hairline.
          widthM: geometry?.bedWidth ?? 1.2,
          lengthM: geometry?.bedLength ?? 37.2,
          // Recorded per bed, though it is strung over whole runs.
          shade: (b.shade === "Single" || b.shade === "Double" || b.shade === "Triple"
            ? b.shade : undefined) as ShadehouseBed["shade"],
          state: s?.state ?? "empty",
          variety: s?.variety ?? "",
          varieties: s?.varieties ?? [],
          plantedDate: s?.plantedDate ?? "",
          expectedHarvest: s?.expectedHarvest ?? "",
          notes: s?.notes ?? "",
        };
      })
      .sort((a, b) => a.bedId.localeCompare(b.bedId, undefined, { numeric: true }));
  }, [bedRows, plantings, plants, treatments]);

  const historyFor = useMemo(
    () => (bedName: string) =>
      bedHistory(bedName, { plantings, treatments, irrigation, harvest, fertilization, pruning }),
    [plantings, treatments, irrigation, harvest, fertilization, pruning]
  );

  return { beds, historyFor, isEmpty: bedRows.length === 0 };
}
