import { useMemo } from "react";
import type { ShadehouseBed } from "../services/shadehouseLayout";
import { plotConfigs, stateColors } from "../services/shadehouseLayout";

/**
 * One dot per bed — not per percentage point. A grower can count the empties,
 * which an occupancy percentage never lets them do.
 */
const ORDER: ShadehouseBed["state"][] = [
  "harvest-ready",
  "growing",
  "planted",
  "issue",
  "empty",
];

export default function BedWaffle({
  beds,
  onPlotClick,
  className = "",
}: {
  beds: ShadehouseBed[];
  onPlotClick?: (fieldId: string) => void;
  className?: string;
}) {
  const fields = useMemo(
    () =>
      // The fields are whichever ones the beds are actually in. Reading them
      // off plotConfigs drew four fixed panels, so a field added under
      // Infrastructure never appeared and a field with no beds drew an empty
      // panel that looked like a fault.
      [...new Set(beds.map((b) => b.fieldId).filter(Boolean))].sort().map((id) => {
        const field = plotConfigs.find((p) => p.id === id);
        const own = beds.filter((b) => b.fieldId === id);
        // Group by state so the dot grid reads as bands, not confetti.
        const ordered = ORDER.flatMap((state) => own.filter((b) => b.state === state));
        const filled = own.filter((b) => b.state !== "empty").length;
        return {
          id,
          label: field?.label ?? id,
          beds: ordered,
          filled,
          total: own.length,
          occupancy: own.length ? filled / own.length : 0,
        };
      }),
    [beds]
  );

  const ranked = [...fields].sort((a, b) => b.occupancy - a.occupancy);
  const rankOf = new Map(ranked.map((p, i) => [p.id, i + 1]));

  return (
    <div className={`card-surface bg-white rounded-xl border border-sand-200/80 p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="text-[15px] font-bold text-navy-900">Bed Occupancy</h3>
          <p className="text-[11px] text-navy-400">Each dot is one bed · grouped by state</p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mt-4">
        {fields.map((field) => (
          <button
            key={field.id}
            onClick={onPlotClick ? () => onPlotClick(field.id) : undefined}
            className={`text-left rounded-lg p-2 -m-2 transition-colors ${
              onPlotClick ? "cursor-pointer hover:bg-sand-50" : "cursor-default"
            }`}
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-semibold text-navy-400">
                #{rankOf.get(field.id)}
              </span>
              <span className="text-[13px] font-bold text-navy-900">{field.label}</span>
            </div>

            <div className="flex flex-wrap gap-[3px] mt-2.5 max-w-[132px]">
              {field.beds.map((bed) => (
                <span
                  key={bed.bedId}
                  title={`${bed.bedId} — ${stateColors[bed.state].label}`}
                  className="w-[9px] h-[9px] rounded-[2px] shrink-0"
                  style={{ backgroundColor: stateColors[bed.state].fill }}
                />
              ))}
            </div>

            <p className="font-display text-[26px] leading-none font-semibold text-navy-900 mt-3">
              {Math.round(field.occupancy * 100)}%
            </p>
            <p className="text-[11px] text-navy-400 mt-1">
              <span className="font-semibold text-navy-600">{field.filled}</span> of{" "}
              {field.total} beds planted
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-sand-100">
        {ORDER.map((state) => (
          <span key={state} className="inline-flex items-center gap-1.5">
            <span
              className="w-[9px] h-[9px] rounded-[2px]"
              style={{ backgroundColor: stateColors[state].fill }}
            />
            <span className="text-[11px] text-navy-400">{stateColors[state].label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
