/** Checks the generated prose. Run: npm run test:insight */
import { harvestInsight, varietyInsight, occupancyInsight, extremes, summary } from '../../src/services/productionInsight.ts'
import { trendOf, trendWord } from '../../src/components/MetricTile.tsx'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// nothing to say is said, not padded
eq('no data claims nothing', harvestInsight([{label:'Jan',value:0}]).headline, 'No harvest recorded yet')
eq('two months is not a trend',
  harvestInsight([{label:'Jul',value:100},{label:'Aug',value:900}]).detail,
  'Too few months recorded to call a trend yet.')

const rising = [
  {label:'Mar',value:100},{label:'Apr',value:120},{label:'May',value:140},
  {label:'Jun',value:300},{label:'Jul',value:340},{label:'Aug',value:380},
]
eq('a real rise is called', harvestInsight(rising).headline.startsWith('Harvest is rising'), true)
eq('and best/worst named', harvestInsight(rising).detail?.includes('Best Aug'), true)
eq('a rise reads as good', harvestInsight(rising).tone, 'good')

const falling = [...rising].reverse().map((m, i) => ({ label: rising[i].label, value: m.value }))
eq('a real fall is called', harvestInsight(falling).headline.startsWith('Harvest is falling'), true)
eq('and reads as a warning', harvestInsight(falling).tone, 'warn')

const flat = [
  {label:'Mar',value:100},{label:'Apr',value:104},{label:'May',value:98},
  {label:'Jun',value:102},{label:'Jul',value:99},{label:'Aug',value:101},
]
eq('small movement is steady, not a trend', harvestInsight(flat).headline, 'Harvest is steady')

// varieties
eq('concentration is flagged',
  varietyInsight([{label:'Hawaiian',value:900},{label:'Jade',value:100}]).tone, 'warn')
eq('and said plainly',
  varietyInsight([{label:'Hawaiian',value:900},{label:'Jade',value:100}]).detail?.includes('concentrated'), true)
eq('a balanced spread is not flagged',
  varietyInsight([{label:'Hawaiian',value:400},{label:'Jade',value:350},{label:'N\'Joy',value:250}]).tone, 'good')
eq('one variety only', varietyInsight([{label:'Jade',value:50}]).headline, 'All output is Jade')

// occupancy
eq('a full nursery reads good', occupancyInsight(115, 120).tone, 'good')
eq('a half-empty one warns', occupancyInsight(50, 120).tone, 'warn')
eq('empty beds counted', occupancyInsight(118, 120).detail, '2 beds standing empty')
eq('no beds is honest', occupancyInsight(0, 0).headline, 'No beds recorded')

// extremes
eq('best and worst', extremes([{label:'a',value:3},{label:'b',value:9},{label:'c',value:1}]),
  { best:{label:'b',value:9}, worst:{label:'c',value:1} })

// trend direction
eq('trendOf sees a rise', trendOf([1,2,3,10,11,12]), 'up')
eq('trendOf sees a fall', trendOf([12,11,10,3,2,1]), 'down')
eq('trendOf ignores noise', trendOf([100,101,99,100,102,98]), 'flat')
eq('trendOf needs two points', trendOf([5]), 'flat')
eq('trend words read plainly', trendWord('down'), 'falling')

// the paragraph
const para = summary({
  harvest: harvestInsight(rising),
  variety: varietyInsight([{label:'Hawaiian',value:900},{label:'Jade',value:100}]),
  occupancy: occupancyInsight(115, 120),
  waves: 4, unscheduled: 2,
})
eq('the paragraph names the missing cycle times', para.includes('without a cycle time'), true)
eq('and is a sentence, not a fragment', para.trim().endsWith('.'), true)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
