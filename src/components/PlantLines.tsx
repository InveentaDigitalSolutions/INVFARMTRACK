import { Plus, X } from "lucide-react";

/**
 * A bed's seeding, variety by variety.
 *
 * A bed carries more than one: 4,000 of one and 200 of another is an ordinary
 * seeding here. One Plant field and one Quantity meant filling the form twice
 * for the same bed on the same day, and nothing tied the two records together
 * as one act of seeding.
 *
 * Each line becomes its own seeding record, because that is what a seeding is —
 * this variety, this bed, this many. The form just stops making you say the
 * bed and the date twice.
 */

export interface PlantLine {
  plant: string;
  qty: string;
}

export const emptyLine = (): PlantLine => ({ plant: "", qty: "" });

/** Lines with a variety chosen. A blank row is someone mid-thought, not data. */
export const filledLines = (lines: PlantLine[]): PlantLine[] =>
  lines.filter((l) => l.plant);

export default function PlantLines({
  value,
  options,
  onChange,
}: {
  value: PlantLine[];
  options: { value: string; label: string }[];
  onChange: (lines: PlantLine[]) => void;
}) {
  const lines = value.length > 0 ? value : [emptyLine()];

  const set = (i: number, patch: Partial<PlantLine>) =>
    onChange(lines.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  const filled = filledLines(lines);
  const total = filled.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  // The same variety twice is two rows that should have been one.
  const chosen = lines.map((l) => l.plant).filter(Boolean);
  const duplicated = chosen.filter((p, i) => chosen.indexOf(p) !== i);

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={line.plant}
            onChange={(e) => set(i, { plant: e.target.value })}
            className="flex-1 min-w-0 px-3 py-2.5 text-[13px] rounded-lg border border-sand-200
                       bg-white text-navy-900 cursor-pointer focus:outline-none
                       focus:ring-2 focus:ring-lime-400/30"
          >
            <option value="">Select a plant...</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={line.qty}
            onChange={(e) => set(i, { qty: e.target.value })}
            placeholder="Quantity"
            className="w-32 shrink-0 px-3 py-2.5 text-[13px] rounded-lg border border-sand-200
                       bg-white text-navy-900 tabular-nums focus:outline-none
                       focus:ring-2 focus:ring-lime-400/30"
          />

          <button
            type="button"
            onClick={() => onChange(lines.filter((_, n) => n !== i))}
            // Never leave no line at all: an empty control looks broken.
            disabled={lines.length === 1}
            aria-label={`Remove ${line.plant || "this line"}`}
            className="shrink-0 p-2 rounded-lg text-navy-300 hover:text-red-600 hover:bg-red-50
                       disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy-300
                       disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3 pt-0.5">
        <button
          type="button"
          onClick={() => onChange([...lines, emptyLine()])}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-navy-700
                     hover:text-navy-900 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add another plant
        </button>

        {/* Counted from lines with a variety chosen. A quantity typed against
            no plant is not a seeding of anything yet. */}
        {filled.length > 0 && (
          <span className="text-[12px] text-navy-500 tabular-nums">
            {filled.length} {filled.length === 1 ? "plant" : "plants"}
            {total > 0 && (
              <> · <span className="font-semibold text-navy-800">{total.toLocaleString()}</span> in total</>
            )}
          </span>
        )}
      </div>

      {duplicated.length > 0 && (
        <p className="text-[11px] text-amber-700">
          {duplicated[0]} is listed twice — combine the quantities into one line.
        </p>
      )}
    </div>
  );
}
