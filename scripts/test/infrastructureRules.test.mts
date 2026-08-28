/**
 * Checks the naming and capacity rules. Run: npm run test:rules
 */
import {
  nextSeasonName, fieldNameProblem, fieldCapacityProblem,
  bedName, rowOf, availableRows, levelsFor, defaultLevel, levelProblem, bedCapacityProblem,
} from '../../src/services/infrastructureRules.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(52)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// seasons
const seasons = [{ name: '2026-S1' }]
eq('first season of 2026 exists -> next is S2', nextSeasonName('2026-03-01', seasons), '2026-S2')
eq('a 2027 start begins again at S1', nextSeasonName('2027-01-05', seasons), '2027-S1')
eq('three in a year -> S4', nextSeasonName('2026-09-01', [{name:'2026-S1'},{name:'2026-S2'},{name:'2026-S3'}]), '2026-S4')
eq('gap does not reissue a number', nextSeasonName('2026-09-01', [{name:'2026-S1'},{name:'2026-S3'}]), '2026-S4')
eq('no start date -> no name', nextSeasonName('', seasons), '')

// fields
const fields = [{ id:'a', name:'E3', shadehouse:'Shadehouse 1', rows:33 },
                { id:'b', name:'C3', shadehouse:'Shadehouse 1', rows:27 }]
eq('duplicate field name in same shadehouse', !!fieldNameProblem('E3','Shadehouse 1',fields), true)
eq('same name in another shadehouse is fine', fieldNameProblem('E3','Shadehouse 2',fields), null)
eq('renaming a field to its own name is fine', fieldNameProblem('E3','Shadehouse 1',fields,'a'), null)
eq('blank name refused', !!fieldNameProblem('  ','Shadehouse 1',fields), true)
eq('field capacity reached', !!fieldCapacityProblem({name:'Shadehouse 1',fieldCapacity:2},fields), true)
eq('field capacity has room', fieldCapacityProblem({name:'Shadehouse 1',fieldCapacity:4},fields), null)

// beds
eq('bed name pads the row', bedName('E3', 1), 'E3-01')
eq('bed name row 12', bedName('E3', 12), 'E3-12')
eq('row parsed back out', rowOf('E3-07'), 7)
const beds = [{name:'E3-01',field:'E3'},{name:'E3-03',field:'E3'}]
eq('free rows skip the taken ones', availableRows({name:'E3',rows:5}, beds), [2,4,5])
eq('no row count -> offer nothing', availableRows({name:'E3'}, beds), [])
eq('ground beds are level 0 only', levelsFor('Ground'), ['0'])
eq('air beds cannot be level 0', levelsFor('Air'), ['1','2','3'])
eq('ground defaults to 0', defaultLevel('Ground'), '0')
eq('air at level 0 refused', !!levelProblem('Air','0'), true)
eq('ground at level 2 refused', !!levelProblem('Ground','2'), true)
eq('air at level 2 fine', levelProblem('Air','2'), null)
eq('bed capacity reached', !!bedCapacityProblem({name:'Shadehouse 1',capacity:120}, 120), true)
eq('bed capacity has room', bedCapacityProblem({name:'Shadehouse 1',capacity:120}, 119), null)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
