/**
 * A ranked list with bars, and the row you care about picked out.
 *
 * The reference reports use this everywhere: twelve cities ranked by
 * livability with the selected one highlighted in blue, and an average line to
 * read each bar against. It answers "where does this sit" in one glance, which
 * a table of the same numbers does not.
 */

interface RankedBarsProps {
  rows: { name: string; value: number }[];
  /** Row to pick out, if one matters more than the rest. */
  highlight?: string;
  /** Formats the number at the end of each bar. */
  format?: (v: number) => string;
  /** Draw the mean as a reference line, as the reports do. */
  showAverage?: boolean;
  max?: number;
}

export default function RankedBars({
  rows, highlight, format = (v) => v.toLocaleString(), showAverage = true, max,
}: RankedBarsProps) {
  if (rows.length === 0) {
    return <p className="text-[12px] text-navy-400 py-4">Nothing to rank yet.</p>;
  }

  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const ceiling = max ?? Math.max(...sorted.map((r) => r.value), 1);
  const average = sorted.reduce((s, r) => s + r.value, 0) / sorted.length;

  return (
    <div className="space-y-1">
      {showAverage && sorted.length > 1 && (
        <div className="flex items-center gap-2 text-[10px] text-navy-400 mb-1.5">
          <span className="w-24 shrink-0" />
          <div className="relative flex-1 h-3">
            <span
              className="absolute top-0 bottom-0 border-l border-dashed border-navy-300"
              style={{ left: `${(average / ceiling) * 100}%` }}
            />
            <span
              className="absolute -top-0.5 text-[9px] text-navy-400 -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${(average / ceiling) * 100}%` }}
            >
              avg {format(Math.round(average))}
            </span>
          </div>
          <span className="w-14 shrink-0" />
        </div>
      )}

      {sorted.map((row) => {
        const picked = row.name === highlight;
        return (
          <div key={row.name} className="flex items-center gap-2">
            <span
              className={`w-24 shrink-0 text-[11px] truncate text-right ${
                picked ? "font-semibold text-navy-900" : "text-navy-500"
              }`}
              title={row.name}
            >
              {row.name}
            </span>
            <div className="relative flex-1 h-3.5 rounded bg-sand-100 overflow-hidden">
              {/* Brand navy for every bar, the accent for the picked one.
                  Grey was in no part of the palette and read as disabled
                  rather than neutral. */}
              <div
                className={`absolute inset-y-0 left-0 rounded ${picked ? "bar-accent" : "bar-fill"}`}
                style={{ width: `${Math.max((row.value / ceiling) * 100, 1)}%` }}
              />
              {showAverage && sorted.length > 1 && (
                <span
                  className="absolute top-0 bottom-0 border-l border-dashed border-navy-300/70"
                  style={{ left: `${(average / ceiling) * 100}%` }}
                />
              )}
            </div>
            <span
              className={`w-14 shrink-0 text-[11px] text-right tabular-nums ${
                picked ? "font-semibold text-navy-900" : "text-navy-500"
              }`}
            >
              {format(row.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
