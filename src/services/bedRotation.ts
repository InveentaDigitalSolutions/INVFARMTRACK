/**
 * What each bed has held, and for how long.
 *
 * This replaces a utilisation percentage that could not say much: the nursery's
 * beds are occupied nearly year-round, so the figure sat near 100 and moved
 * only when a bed happened to be between crops on the day you looked. Santiago
 * said as much — it barely varies, so it barely informs.
 *
 * Turnover is the thing that varies. A bed planted with one variety for eleven
 * months and a bed that turned over four times both read as "full", and they
 * are not the same bed. The occupancies below are what the timeline draws.
 */

export interface PlantingLike {
  id?: string;
  bed?: string;
  plant?: string;
  date?: string;
  qty?: number;
  /** False once the seeding has been cleared off the bed. */
  current?: boolean;
}

export interface Occupancy {
  bed: string;
  plant: string;
  /** Inclusive start, ISO date. */
  from: string;
  /** Exclusive end: the next planting on this bed, or the window's end. */
  to: string;
  /** Whether this is what the bed holds now. */
  current: boolean;
  qty?: number;
  days: number;
}

const day = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${String(s).slice(0, 10)}T00:00:00Z`);

/**
 * Turns plantings into the spans a bed was occupied for.
 *
 * A planting runs until the next one on the same bed. Nothing records when a
 * bed is cleared, so the last planting is treated as still standing — which
 * is right for a nursery where beds are replanted rather than emptied, and is
 * why `current` is worth showing rather than inferring from dates alone.
 */
export function occupancies(
  plantings: PlantingLike[],
  windowEnd: Date = new Date()
): Occupancy[] {
  const byBed = new Map<string, PlantingLike[]>();
  for (const p of plantings) {
    if (!p.bed || !p.date) continue;
    if (p.current === false) continue;
    const list = byBed.get(p.bed) ?? [];
    list.push(p);
    byBed.set(p.bed, list);
  }

  const out: Occupancy[] = [];
  for (const [bed, list] of byBed) {
    const sorted = [...list].sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1));
    sorted.forEach((planting, i) => {
      const from = String(planting.date).slice(0, 10);
      const next = sorted[i + 1];
      const to = next ? String(next.date).slice(0, 10) : iso(windowEnd);
      const days = Math.max(0, Math.round((parse(to).getTime() - parse(from).getTime()) / day));
      out.push({
        bed,
        plant: String(planting.plant ?? ""),
        from,
        to,
        current: !next,
        qty: planting.qty,
        days,
      });
    });
  }
  return out.sort((a, b) =>
    a.bed === b.bed ? (a.from < b.from ? -1 : 1) : a.bed.localeCompare(b.bed, undefined, { numeric: true })
  );
}

export interface RotationSummary {
  bed: string;
  /** How many times the bed was replanted in the window. */
  turns: number;
  /** Average days per occupancy. */
  averageDays: number;
  currentPlant: string;
  /** Days the current crop has been standing. */
  currentDays: number;
}

/** Per-bed turnover, which is what a rotation view is for. */
export function rotationSummary(
  plantings: PlantingLike[],
  windowEnd: Date = new Date()
): RotationSummary[] {
  const spans = occupancies(plantings, windowEnd);
  const byBed = new Map<string, Occupancy[]>();
  for (const span of spans) {
    const list = byBed.get(span.bed) ?? [];
    list.push(span);
    byBed.set(span.bed, list);
  }

  return [...byBed.entries()]
    .map(([bed, list]) => {
      const current = list.find((s) => s.current);
      const total = list.reduce((sum, s) => sum + s.days, 0);
      return {
        bed,
        turns: list.length,
        averageDays: list.length ? Math.round(total / list.length) : 0,
        currentPlant: current?.plant ?? "",
        currentDays: current?.days ?? 0,
      };
    })
    .sort((a, b) => a.bed.localeCompare(b.bed, undefined, { numeric: true }));
}

/**
 * Where a span sits in the drawn window, as fractions from 0 to 1.
 * Spans that start before the window are clipped rather than dropped, so a
 * crop planted last year still shows as occupying the beginning of the view.
 */
export function spanFraction(
  span: { from: string; to: string },
  windowStart: Date,
  windowEnd: Date
): { left: number; width: number } | null {
  const total = windowEnd.getTime() - windowStart.getTime();
  if (total <= 0) return null;

  const from = Math.max(parse(span.from).getTime(), windowStart.getTime());
  const to = Math.min(parse(span.to).getTime(), windowEnd.getTime());
  if (to <= from) return null;

  return {
    left: (from - windowStart.getTime()) / total,
    width: (to - from) / total,
  };
}
