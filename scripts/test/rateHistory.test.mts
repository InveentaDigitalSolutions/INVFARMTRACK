/** Checks the exchange-rate history. Run: npm run test:rate */
import { rateSeries, withinRange, rateStats, plotPoints, RANGES } from '../../src/services/rateHistory.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}
const near = (label: string, got: number, want: number, tol = 1e-6) => {
  const pass = Math.abs(got - want) <= tol
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${got}${pass ? '' : ` want ~${want}`}`)
}

// rateSeries — cleaning
const messy = [
  { date: '2026-08-03', value: 26.80 },
  { date: '2026-08-01', value: 26.70 },
  { date: '2026-08-02T00:00:00Z', value: 26.75 },   // a datetime, not a date
  { date: '2026-08-04', value: 0 },                  // never published
  { date: '2026-08-05', value: null },               // half-written record
  { date: '', value: 26.9 },                         // no date at all
  { date: '2026-08-01', value: 26.71 },              // a correction, same day
]
eq('sorted oldest first, cleaned, one row per day', rateSeries(messy), [
  { date: '2026-08-01', value: 26.71 },
  { date: '2026-08-02', value: 26.75 },
  { date: '2026-08-03', value: 26.8 },
])
eq('nothing in, nothing out', rateSeries([]), [])
eq('a zero rate is dropped, not drawn as a crash',
  rateSeries([{ date: '2026-08-04', value: 0 }]), [])

// withinRange — measured from the last published rate, not from today
const series = Array.from({ length: 400 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 6, 1)); d.setUTCDate(d.getUTCDate() + i)
  return { date: d.toISOString().slice(0, 10), value: 26 + i / 1000 }
})
eq('the last day of the series is its own last point',
  withinRange(series, 90).at(-1)!.date, series.at(-1)!.date)
eq('90 days back holds 91 daily points', withinRange(series, 90).length, 91)
eq('a year holds more than 3 months',
  withinRange(series, 365).length > withinRange(series, 90).length, true)
eq('an empty series has no window', withinRange([], 90), [])

// A stale feed must still produce a window rather than an empty chart.
const stale = [{ date: '2020-01-01', value: 24.5 }, { date: '2020-02-01', value: 24.6 }]
eq('a series that stopped years ago still charts', withinRange(stale, 90).length, 2)

// rateStats
const window = rateSeries([
  { date: '2026-06-01', value: 26.00 },
  { date: '2026-07-01', value: 26.50 },
  { date: '2026-08-01', value: 26.20 },
])
eq('first and last are the ends, not the low and high',
  [rateStats(window).first!.value, rateStats(window).last!.value], [26, 26.2])
eq('the low and high are the extremes', [rateStats(window).low, rateStats(window).high], [26, 26.5])
near('the change is last minus first', rateStats(window).change, 0.2, 1e-9)
near('and as a percentage of where it started', rateStats(window).changePct, 0.7692307, 1e-6)
eq('an empty window has no ends', rateStats([]).first, null)

// plotPoints — spacing must follow the date, not the index
const gappy = [
  { date: '2026-08-03', value: 26.0 },  // Monday
  { date: '2026-08-04', value: 26.5 },
  { date: '2026-08-10', value: 27.0 },  // a week later
]
const plotted = plotPoints(gappy, 100, 50)
near('the first point is at the left edge', plotted[0].x, 0)
near('the last point is at the right edge', plotted[2].x, 100)
eq('a one-day gap is drawn narrower than a six-day one',
  plotted[1].x - plotted[0].x < plotted[2].x - plotted[1].x, true)
eq('the highest rate is drawn above the lowest', plotted[2].y < plotted[0].y, true)
eq('every coordinate is a real number', plotted.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), true)

// The trap: a window where nothing moved. Dividing by a zero span or a zero
// range would put NaN into the path and draw nothing at all.
const flat = plotPoints([{ date: '2026-08-01', value: 26.5 }, { date: '2026-08-02', value: 26.5 }], 100, 50)
eq('a flat rate still plots', flat.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), true)
const single = plotPoints([{ date: '2026-08-01', value: 26.5 }], 100, 50)
eq('a single point sits in the middle rather than dividing by zero', single[0].x, 50)
eq('nothing to plot is an empty path, not a crash', plotPoints([], 100, 50), [])

eq('three ranges offered', RANGES.map((r) => r.key), ['3M', '6M', '1Y'])

console.log(failures ? `\n  ${failures} failed` : '\n  The rate history reads as published.')
process.exit(failures ? 1 : 0)
