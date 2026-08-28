/**
 * Counting a shipment week, bed by bed.
 *
 * The counts are measured, not derived — someone walks the rows and counts
 * what will be cuttable. Entering that one form at a time is a hundred and
 * twenty submissions for a job that is one pass through the field, so this is
 * a grid: pick the week, filter to the part of the nursery being walked, and
 * type down the column.
 *
 * The pruning estimate sits beside each box. It is the calculated
 * availability, and showing it means the counter can see what was expected
 * before recording what is there — which is also how the two numbers get
 * compared later.
 */

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useRecords } from "../hooks/useRecords";
import { useNurseryBeds } from "../hooks/useNurseryBeds";

interface BedCountRow {
  id: string;
  bed?: string;
  week?: number;
  counted?: number;
  countDate?: string;
  countedBy?: string;
}
interface PruningRow {
  id: string;
  bed?: string;
  week?: number;
  cuttingsEstimated?: number;
}

/** ISO week of a date, for defaulting to the week ahead. */
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round((t.getTime() - first.getTime()) / (7 * 86_400_000));
}

export default function BedCountGrid() {
  const [counts, setCounts] = useRecords<BedCountRow>("bedCounts", []);
  const [pruning] = useRecords<PruningRow>("pruning", []);
  const { beds } = useNurseryBeds();

  // Counting is for a week ahead, so that is where the picker starts.
  const [week, setWeek] = useState(() => isoWeek(new Date()) + 1);
  const [field, setField] = useState("");
  const [onlyPlanted, setOnlyPlanted] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);

  const fields = useMemo(
    () => [...new Set(beds.map((b) => b.fieldName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [beds]
  );

  /** What is already recorded for this week, so the grid opens on it. */
  const existing = useMemo(() => {
    const map = new Map<string, BedCountRow>();
    for (const c of counts) if (c.week === week && c.bed) map.set(c.bed, c);
    return map;
  }, [counts, week]);

  /** The pruning estimate per bed for this week — the calculated availability. */
  const estimate = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pruning) {
      if (!p.bed || p.week !== week) continue;
      map.set(p.bed, (map.get(p.bed) ?? 0) + (p.cuttingsEstimated ?? 0));
    }
    return map;
  }, [pruning, week]);

  const rows = useMemo(
    () =>
      beds
        .filter((b) => (!field || b.fieldName === field))
        .filter((b) => (!onlyPlanted || b.plant))
        .map((b) => ({
          bed: b.name,
          field: b.fieldName,
          plant: b.plant ?? "",
          level: b.level,
          estimated: estimate.get(b.name),
          recorded: existing.get(b.name)?.counted,
        })),
    [beds, field, onlyPlanted, estimate, existing]
  );

  const dirty = Object.entries(draft).filter(([bed, v]) => {
    const n = Number(v);
    if (v === "" || !Number.isFinite(n)) return false;
    return n !== existing.get(bed)?.counted;
  });

  const save = () => {
    if (dirty.length === 0) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const next = [...counts];
    for (const [bed, value] of dirty) {
      const qty = Number(value);
      const found = next.findIndex((c) => c.bed === bed && c.week === week);
      if (found >= 0) next[found] = { ...next[found], counted: qty, countDate: today };
      else next.push({ id: "", bed, week, counted: qty, countDate: today } as BedCountRow);
    }
    setCounts(next);
    setDraft({});
    setSaved(dirty.length);
    setSaving(false);
    window.setTimeout(() => setSaved(0), 4000);
  };

  const totalCounted = rows.reduce(
    (sum, r) => sum + (Number(draft[r.bed] ?? r.recorded ?? 0) || 0),
    0
  );
  const totalEstimated = rows.reduce((sum, r) => sum + (r.estimated ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-navy-800">Field Count</h3>
          <p className="text-[12px] text-navy-400 mt-0.5">
            {rows.length} beds · counted {totalCounted.toLocaleString()}
            {totalEstimated > 0 && ` · pruning estimate ${totalEstimated.toLocaleString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-[12px] text-navy-600">
            Shipment week
            <input
              type="number"
              min={1}
              max={53}
              value={week}
              onChange={(e) => { setWeek(Number(e.target.value)); setDraft({}); }}
              className="w-16 px-2 py-1.5 text-[13px] rounded-lg border border-sand-200 bg-white
                         text-navy-900 focus:outline-none focus:ring-2 focus:ring-lime-400/30"
            />
          </label>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="px-2 py-1.5 text-[13px] rounded-lg border border-sand-200 bg-white
                       text-navy-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400/30"
          >
            <option value="">All fields</option>
            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-[12px] text-navy-600 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyPlanted}
              onChange={(e) => setOnlyPlanted(e.target.checked)}
              className="accent-lime-500 cursor-pointer"
            />
            Planted only
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-[13px] text-navy-400 py-8 text-center">
          No beds match. Clear the filters, or untick “planted only” to count empty beds.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand-200">
          <table className="w-full text-[13px]">
            <thead className="bg-sand-50">
              <tr className="text-[10px] uppercase tracking-wider text-navy-400">
                <th className="text-left font-semibold px-3 py-2">Bed</th>
                <th className="text-left font-semibold px-3 py-2">Variety</th>
                <th className="text-right font-semibold px-3 py-2">Estimated</th>
                <th className="text-right font-semibold px-3 py-2 w-32">Counted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const value = draft[r.bed] ?? (r.recorded === undefined ? "" : String(r.recorded));
                const changed = draft[r.bed] !== undefined && Number(draft[r.bed]) !== r.recorded;
                return (
                  <tr key={r.bed} className="border-t border-sand-200/70 hover:bg-sand-50/60">
                    <td className="px-3 py-1.5 font-mono text-[12px] text-navy-700 whitespace-nowrap">
                      {r.bed}
                      {r.level ? <span className="text-navy-300 ml-1">L{r.level}</span> : null}
                    </td>
                    <td className="px-3 py-1.5 text-navy-600 truncate max-w-[220px]">
                      {r.plant || <span className="text-navy-300">empty</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-navy-400 tabular-nums">
                      {r.estimated?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, [r.bed]: e.target.value }))}
                        placeholder="—"
                        aria-label={`Counted for ${r.bed}`}
                        className={`w-24 px-2 py-1 text-[13px] text-right rounded-md border bg-white
                                   tabular-nums focus:outline-none focus:ring-2 focus:ring-lime-400/30 ${
                          changed ? "border-lime-400 bg-lime-50/40" : "border-sand-200"
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-navy-400">
          {dirty.length > 0
            ? `${dirty.length} bed${dirty.length === 1 ? "" : "s"} changed`
            : saved > 0
              ? <span className="text-green-600 inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> saved {saved}
                </span>
              : "Type down the Counted column, then save."}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={dirty.length === 0 || saving}
          className="px-4 py-2 text-[13px] font-medium rounded-lg bg-lime-600 text-white
                     hover:bg-lime-700 disabled:opacity-40 disabled:cursor-not-allowed
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40
                     transition-colors cursor-pointer"
        >
          {saving ? "Saving…" : `Save week ${week}`}
        </button>
      </div>
    </div>
  );
}
