/** Checks supply against demand. Run: npm run test:availability */
import { weeklySupply, supplyVerdict, shortfallByVariety, countedShare } from '../../src/services/availabilityInsight.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const input = {
  pruning: [{ week: 14, cuttingsEstimated: 1000 }, { week: 15, cuttingsEstimated: 1200 }, { week: 16, cuttingsEstimated: 900 }],
  counts:  [{ week: 14, counted: 800 }, { week: 14, counted: 300 }],   // two beds, one week
  demand:  [{ week: 14, requested: 900 }, { week: 15, requested: 1500 }, { week: 16, requested: 500 }],
}
const weeks = weeklySupply(input)

eq('a row per week mentioned anywhere', weeks.map(w => w.week), [14, 15, 16])
eq('counts across beds are summed', weeks[0].counted, 1100)
eq('the count beats the estimate', weeks[0].supply, 1100)
eq('and that week is not assumed', weeks[0].assumed, false)
eq('an uncounted week falls back to the estimate', weeks[1].supply, 1200)
eq('and is marked as assumed', weeks[1].assumed, true)
eq('balance is supply less demand', weeks[0].balance, 200)
eq('a shortfall is negative', weeks[1].balance, -300)

const v = supplyVerdict(weeks)
eq('the first short week is named', v.headline, 'Week 15 is short by 300')
eq('and its basis flagged', v.detail?.includes('pruning estimate'), true)
eq('one short week warns rather than alarms', v.tone, 'warn')

// covered
const ok = weeklySupply({
  pruning: [], counts: [{week:20,counted:900}], demand: [{week:20,requested:400}],
})
eq('a covered week says so', supplyVerdict(ok).headline, 'Supply covers demand through week 20')
eq('and names the tightest', supplyVerdict(ok).detail?.includes('500 spare'), true)
eq('fully counted and covered reads good', supplyVerdict(ok).tone, 'good')

// nothing asked for
eq('no demand is said plainly',
  supplyVerdict(weeklySupply({pruning:[{week:14,cuttingsEstimated:100}],counts:[],demand:[]})).headline,
  'No demand recorded yet')

// several short weeks
const bad = weeklySupply({
  pruning: [], counts: [{week:21,counted:100},{week:22,counted:100}],
  demand: [{week:21,requested:500},{week:22,requested:900}],
})
eq('several short weeks read as bad', supplyVerdict(bad).tone, 'bad')
eq('and the worst is named', supplyVerdict(bad).detail?.includes('week 22'), true)

// per variety
eq('shortfall per variety, worst first',
  shortfallByVariety(
    [{plant:'Hawaiian',requested:900},{plant:'Jade',requested:200}],
    new Map([['Hawaiian',400],['Jade',600]])
  ),
  [{name:'Hawaiian',value:-500},{name:'Jade',value:400}])

eq('how much rests on a count', countedShare(weeks), 33)
eq('no weeks is zero, not a crash', countedShare([]), 0)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
