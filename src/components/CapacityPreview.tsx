/**
 * What a density means, field by field, shown beside the box you type it in.
 *
 * A density is an abstraction — nobody counts plants per square metre. What
 * they know is roughly how many go in a row. Showing both makes the number
 * checkable at the moment it is entered rather than three screens later when
 * an availability figure looks wrong.
 */

import { capacityByField, type PlantDensity } from "../services/bedCapacity";

export interface CapacityPreviewProps {
  plant: PlantDensity;
}

export default function CapacityPreview({ plant }: CapacityPreviewProps) {
  const rows = capacityByField(plant);
  const anything = rows.some((r) => r.perRow !== null);

  if (!anything) return null;

  const total = rows.reduce((sum, r) => sum + (r.perField ?? 0), 0);

  return (
    <div className="mt-2 rounded-lg bg-sand-50 border border-sand-200 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.09em] text-navy-400 mb-1.5">
        On the ground that works out as
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {rows.map((r) => (
          <span key={r.fieldId} className="text-[11px] text-navy-600 tabular-nums">
            <b className="font-semibold text-navy-800">{r.fieldId}</b>{" "}
            {r.perRow?.toLocaleString() ?? "—"}
            <span className="text-navy-400">
              {" "}per row · {r.widthM}×{r.lengthM} m
            </span>
          </span>
        ))}
      </div>
      {total > 0 && (
        <p className="text-[10px] text-navy-400 mt-1.5">
          {total.toLocaleString()} plants if every ground bed carried this variety.
        </p>
      )}
    </div>
  );
}
