/**
 * What the crew cost and what it produced.
 *
 * Labour opened with "Hours Today" measured against a date hardcoded to
 * 2026-04-10 — a demo date that would have read zero forever once real data
 * went in. The week is the honest unit here anyway: a nursery's hours land
 * unevenly across days and nobody plans a shift by yesterday's total.
 *
 * Cost per thousand cuttings is the figure that decides whether a crew is
 * worth what it is paid, and it is the one nobody could see.
 */
import { inWeekOf, isoWeek, ranked, sum } from "./period";

export interface Timesheet {
  worker?: string;
  date?: string;
  activity?: string;
  hours?: number;
  pieces?: number;
  boxes?: number;
  cost?: number;
}

export interface Worker {
  name?: string;
  active?: boolean;
  role?: string;
}

export interface LaborSummary {
  hours: number;
  lastHours: number;
  cost: number;
  lastCost: number;
  pieces: number;
  boxes: number;
  /** Cuttings an hour, across the week. Undefined with no hours logged. */
  perHour?: number;
  /** Lempira per thousand cuttings — the rate a piece rate is judged against. */
  costPerThousand?: number;
  activeWorkers: number;
  totalWorkers: number;
  /** Workers who logged time this week, out of those marked active. */
  loggedThisWeek: number;
  /** Cost per worker this week, worst first. */
  byWorker: { name: string; value: number }[];
  /** Hours by activity this week — where the crew's time actually went. */
  byActivity: { name: string; value: number }[];
}

/** The week's labour, against the week before it. */
export function laborSummary(
  timesheets: Timesheet[],
  workers: Worker[],
  today = new Date()
): LaborSummary {
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const week = timesheets.filter((t) => inWeekOf(t.date, today));
  const prior = timesheets.filter((t) => inWeekOf(t.date, lastWeek));

  const hours = sum(week, (t) => t.hours);
  const pieces = sum(week, (t) => t.pieces);
  const cost = sum(week, (t) => t.cost);

  const costByWorker = new Map<string, number>();
  const hoursByActivity = new Map<string, number>();
  for (const t of week) {
    if (t.worker) costByWorker.set(t.worker, (costByWorker.get(t.worker) ?? 0) + (Number(t.cost) || 0));
    if (t.activity) hoursByActivity.set(t.activity, (hoursByActivity.get(t.activity) ?? 0) + (Number(t.hours) || 0));
  }

  const active = workers.filter((w) => w.active !== false);
  const logged = new Set(week.map((t) => t.worker).filter(Boolean) as string[]);

  return {
    hours,
    lastHours: sum(prior, (t) => t.hours),
    cost,
    lastCost: sum(prior, (t) => t.cost),
    pieces,
    boxes: sum(week, (t) => t.boxes),
    perHour: hours > 0 ? Math.round(pieces / hours) : undefined,
    costPerThousand: pieces > 0 ? Math.round((cost / pieces) * 1000) : undefined,
    activeWorkers: active.length,
    totalWorkers: workers.length,
    loggedThisWeek: logged.size,
    byWorker: ranked(costByWorker),
    byActivity: ranked(hoursByActivity),
  };
}

/** Output per worker over the whole record, for the performance table. */
export function workerPerformance(timesheets: Timesheet[], workers: Worker[]) {
  const stats = new Map<string, { hours: number; pieces: number; boxes: number; cost: number; days: Set<string> }>();
  for (const t of timesheets) {
    if (!t.worker) continue;
    const s = stats.get(t.worker) ?? { hours: 0, pieces: 0, boxes: 0, cost: 0, days: new Set<string>() };
    s.hours += Number(t.hours) || 0;
    s.pieces += Number(t.pieces) || 0;
    s.boxes += Number(t.boxes) || 0;
    s.cost += Number(t.cost) || 0;
    // Days worked counts distinct dates: two entries on one day is one day,
    // and counting rows made a split shift look like twice the attendance.
    if (t.date) s.days.add(String(t.date));
    stats.set(t.worker, s);
  }

  return [...stats.entries()]
    .map(([name, s]) => {
      const worker = workers.find((w) => w.name === name);
      const days = s.days.size;
      return {
        name,
        role: worker?.role ?? "",
        totalHours: Math.round(s.hours * 10) / 10,
        totalPieces: s.pieces,
        totalBoxes: s.boxes,
        totalCost: Math.round(s.cost),
        daysWorked: days,
        avgHoursPerDay: days > 0 ? Math.round((s.hours / days) * 10) / 10 : 0,
        piecesPerHour: s.hours > 0 ? Math.round(s.pieces / s.hours) : 0,
      };
    })
    .sort((a, b) => b.totalPieces - a.totalPieces);
}

/** Hours per ISO week, oldest first — the shape a sparkline wants. */
export function weeklyHours(timesheets: Timesheet[], today = new Date(), weeks = 8): number[] {
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    const w = isoWeek(d);
    return sum(
      timesheets.filter((t) => {
        const td = t.date ? new Date(String(t.date)) : null;
        return td && !Number.isNaN(td.getTime()) && isoWeek(td) === w && td.getFullYear() === d.getFullYear();
      }),
      (t) => t.hours
    );
  });
}
