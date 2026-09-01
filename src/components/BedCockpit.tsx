/**
 * Everything known about the bed you just picked, beside the bed itself.
 *
 * The 3D view could show what a bed *is* — its size, its cloth, the light that
 * reaches it — but nothing of what has happened to it. That lived in a table
 * on another screen, so answering "when was this last fed?" meant leaving the
 * model, finding the row, and losing your place.
 *
 * Laid out as instruments rather than prose: a state line you read in one
 * glance, a block of figures that always sit in the same place, and a log of
 * what was actually done. Empty slots say "none recorded" rather than
 * disappearing — a bed nobody has irrigated is a fact worth seeing, and a
 * panel whose rows move around cannot be read at a glance.
 */

import { X } from "lucide-react";
import type { ShadehouseBed } from "../services/shadehouseLayout";
import type { BedActivity } from "../services/bedState";
import { stateColors, LEVEL_HEIGHTS_M } from "../services/shadehouseLayout";
import {
  clothTransmission, measuredDayLight, SHADE_LAYERS, type RadiationByDay,
} from "../services/bedLight";

const potTypeLabels: Record<string, string> = { round: "Round", square: "Square" };

/** Whole days between two ISO dates, or null when either is missing. */
function daysBetween(from: unknown, to: unknown): number | null {
  const a = String(from ?? "").slice(0, 10);
  const b = String(to ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return null;
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** "3 days ago", "today", "in 5 days" — a date on its own makes you do sums. */
function ago(date: unknown, today: string): string {
  const days = daysBetween(date, today);
  if (days === null) return "";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days > 1) return `${days} days ago`;
  return days === -1 ? "tomorrow" : `in ${-days} days`;
}

function Instrument({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="text-[12px] text-white/90 tabular-nums truncate" title={hint ?? value}>{value}</p>
    </div>
  );
}

function LogLine({
  label,
  entry,
  today,
}: {
  label: string;
  entry?: BedActivity;
  today: string;
}) {
  return (
    <div className="flex items-baseline gap-2 py-1 border-b border-white/5 last:border-0">
      <span className="w-[4.6rem] shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/35">
        {label}
      </span>
      {entry ? (
        <>
          <span className="text-[11px] text-white/85 truncate" title={`${entry.description}${entry.details ? ` — ${entry.details}` : ""}`}>
            {entry.description}
            {entry.details && <span className="text-white/45"> · {entry.details}</span>}
          </span>
          <span className="ml-auto shrink-0 text-[10px] text-white/40 tabular-nums">
            {ago(entry.date, today)}
          </span>
        </>
      ) : (
        <span className="text-[11px] text-white/25">none recorded</span>
      )}
    </div>
  );
}

export interface BedCockpitProps {
  bed: ShadehouseBed;
  /** Everything recorded against this bed, newest first. */
  activity: BedActivity[];
  /** The date the light figures are for — the sun layer's date. */
  onDate: string;
  radiation: RadiationByDay;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function BedCockpit({
  bed, activity, onDate, radiation, onClose, children,
}: BedCockpitProps) {
  const latest = (type: BedActivity["type"]) => activity.find((a) => a.type === type);
  const treatments = activity.filter((a) => a.type === "treatment").slice(0, 3);

  const light = bed.shade ? measuredDayLight(onDate, bed.shade, radiation) : null;
  const age = daysBetween(bed.plantedDate, onDate);
  const due = daysBetween(onDate, bed.expectedHarvest);

  return (
    <div className="absolute left-4 bottom-4 w-[21rem] max-h-[calc(100%-2rem)] overflow-y-auto
                    rounded-xl bg-navy-900/95 backdrop-blur ring-1 ring-white/10 shadow-xl">
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-white tracking-tight">{bed.bedId}</p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {bed.type === "ground"
              ? `Ground row · ${bed.widthM.toFixed(2)} × ${bed.lengthM.toFixed(1)} m`
              : `Cable line · level ${bed.level} · ${(bed.potCount ?? 0).toLocaleString()} pots`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* What is in it, right now. */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stateColors[bed.state].fill }}
        />
        <span className="text-[12px] font-semibold text-white">{stateColors[bed.state].label}</span>
        {bed.variety && (
          <span className="text-[12px] text-white/70 truncate" title={bed.variety}>· {bed.variety}</span>
        )}
      </div>

      <div className="mx-4 mb-3 grid grid-cols-2 gap-x-3 gap-y-2.5 p-3 rounded-lg bg-white/5">
        <Instrument
          label="Planted"
          value={bed.plantedDate ? `${bed.plantedDate}` : "—"}
          hint={age === null ? undefined : `${age} days ago`}
        />
        <Instrument label="In the bed" value={age === null ? "—" : `${age} days`} />
        <Instrument
          label="Harvest due"
          value={bed.expectedHarvest || "—"}
          hint={due === null ? undefined : `in ${due} days`}
        />
        <Instrument
          label="Days to go"
          value={due === null ? "—" : due < 0 ? `${-due} overdue` : `${due} days`}
        />
        <Instrument
          label={light?.measured ? "Light that day" : "Light (clear sky)"}
          value={light ? `${light.atBed.toFixed(1)} mol/m²` : "—"}
        />
        <Instrument
          label="Through cloth"
          value={
            bed.shade
              ? `${(clothTransmission(bed.shade) * 100).toFixed(1)}% · ${SHADE_LAYERS[bed.shade]}×`
              : "no cloth"
          }
        />
        {bed.type === "basket" ? (
          <>
            <Instrument label="Height" value={`${LEVEL_HEIGHTS_M[bed.level].toFixed(2)} m`} />
            <Instrument label="Pot" value={bed.potType ? potTypeLabels[bed.potType] : "—"} />
          </>
        ) : (
          <>
            <Instrument label="Field" value={bed.fieldId || "—"} />
            <Instrument label="Area" value={`${(bed.widthM * bed.lengthM).toFixed(1)} m²`} />
          </>
        )}
      </div>

      {/* What has been done to it. */}
      <div className="px-4 pb-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-1">
          Last recorded
        </p>
        <LogLine label="Planting" entry={latest("planting")} today={onDate} />
        <LogLine label="Irrigation" entry={latest("irrigation")} today={onDate} />
        <LogLine label="Feeding" entry={latest("fertilization")} today={onDate} />
        <LogLine label="Harvest" entry={latest("harvest")} today={onDate} />
        <LogLine label="Pruning" entry={latest("pruning")} today={onDate} />
      </div>

      <div className="px-4 pb-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-1">
          Treatments · last three
        </p>
        {treatments.length === 0 ? (
          <p className="text-[11px] text-white/25 py-1">none recorded</p>
        ) : (
          treatments.map((t) => (
            <div key={t.id} className="flex items-baseline gap-2 py-1 border-b border-white/5 last:border-0">
              <span className="text-[11px] text-white/85 truncate" title={t.details}>
                {t.description}
                {t.details && <span className="text-white/45"> · {t.details}</span>}
              </span>
              <span className="ml-auto shrink-0 text-[10px] text-white/40 tabular-nums">
                {ago(t.date, onDate)}
              </span>
            </div>
          ))
        )}
      </div>

      {bed.notes && (
        <p className="px-4 pb-3 text-[11px] text-amber-300/90">{bed.notes}</p>
      )}

      {/* The live irrigation strip, when that layer is on. */}
      {children}
    </div>
  );
}
