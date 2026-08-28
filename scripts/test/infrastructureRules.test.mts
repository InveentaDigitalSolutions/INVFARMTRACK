/**
 * Checks the naming and capacity rules. Run: npm run test:rules
 */
import {
  nextSeasonName, fieldNameProblem, fieldCapacityProblem,
  bedName, rowOf, levelOf, parseBedName, availableRows, levelsFor, defaultLevel,
  levelProblem, bedCapacityProblem, typeForLevel, planBulkBeds,
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

// beds — ground
eq('bed name pads the row', bedName('E3', 1), 'E3-01')
eq('bed name row 12', bedName('E3', 12), 'E3-12')
eq('row parsed back out', rowOf('E3-07'), 7)
eq('a ground bed is level 0', levelOf('E3-07'), 0)

// beds — air, named for the row they hang over
eq('air bed on level 1', bedName('E3', 1, 1), 'E3-01-1')
eq('air bed on level 3, row 12', bedName('E3', 12, 3), 'E3-12-3')
eq('air bed parses to its row, not its level', rowOf('E3-01-1'), 1)
eq('the trap: E3-12-3 is row 12, not row 3', rowOf('E3-12-3'), 12)
eq('and its level is 3', levelOf('E3-12-3'), 3)
eq('full parse', parseBedName('C1-27-2'), {field:'C1', row:27, level:2})
eq('a name that is not a bed', parseBedName('nonsense'), null)
eq('type follows the level', typeForLevel(0), 'Ground')
eq('type follows the level, air', typeForLevel(2), 'Air')

const beds = [{name:'E3-01',field:'E3'},{name:'E3-03',field:'E3'}]
eq('free ground rows skip the taken ones', availableRows({name:'E3',rows:5}, beds), [2,4,5])
eq('no row count -> offer nothing', availableRows({name:'E3'}, beds), [])
// a ground bed in row 1 does not stop an air bed hanging above it
eq('levels are counted separately', availableRows({name:'E3',rows:3}, beds, 1), [1,2,3])
const mixed = [{name:'E3-01'},{name:'E3-01-1'},{name:'E3-02-1'}]
eq('level 1 free rows', availableRows({name:'E3',rows:3}, mixed, 1), [3])
eq('level 2 is untouched by level 1', availableRows({name:'E3',rows:3}, mixed, 2), [1,2,3])
eq('ground free rows ignore air beds', availableRows({name:'E3',rows:3}, mixed, 0), [2,3])
eq('ground beds are level 0 only', levelsFor('Ground'), ['0'])
eq('air beds cannot be level 0', levelsFor('Air'), ['1','2','3'])
eq('ground defaults to 0', defaultLevel('Ground'), '0')
eq('air at level 0 refused', !!levelProblem('Air','0'), true)
eq('ground at level 2 refused', !!levelProblem('Ground','2'), true)
eq('air at level 2 fine', levelProblem('Air','2'), null)
eq('bed capacity reached', !!bedCapacityProblem({name:'Shadehouse 1',capacity:120}, 120), true)
eq('bed capacity has room', bedCapacityProblem({name:'Shadehouse 1',capacity:120}, 119), null)

// bulk add — how the real layout gets entered
const E3 = { name: 'E3', rows: 33 }
const none: { name?: string }[] = []
eq('a clean run of air beds',
  planBulkBeds({field:E3, level:1, fromRow:1, toRow:3, existing:none}).create,
  ['E3-01-1','E3-02-1','E3-03-1'])
eq('ground beds have no level suffix',
  planBulkBeds({field:E3, level:0, fromRow:1, toRow:2, existing:none}).create,
  ['E3-01','E3-02'])
const some = [{name:'E3-02-1'}]
eq('rows already filled are skipped',
  planBulkBeds({field:E3, level:1, fromRow:1, toRow:3, existing:some}).create,
  ['E3-01-1','E3-03-1'])
eq('and reported', planBulkBeds({field:E3, level:1, fromRow:1, toRow:3, existing:some}).alreadyThere, [2])
eq('a ground bed does not block the air above it',
  planBulkBeds({field:E3, level:1, fromRow:1, toRow:1, existing:[{name:'E3-01'}]}).create, ['E3-01-1'])
eq('rows past the end of the field are refused',
  planBulkBeds({field:{name:'C1',rows:27}, level:0, fromRow:26, toRow:30, existing:none}).outOfRange, [28,29,30])
eq('and only the valid ones created',
  planBulkBeds({field:{name:'C1',rows:27}, level:0, fromRow:26, toRow:30, existing:none}).create,
  ['C1-26','C1-27'])
eq('backwards range refused',
  !!planBulkBeds({field:E3, level:1, fromRow:9, toRow:2, existing:none}).problem, true)
eq('no row count -> cannot number the beds',
  !!planBulkBeds({field:{name:'E3'}, level:1, fromRow:1, toRow:3, existing:none}).problem, true)
// the whole batch is checked, not one bed at a time
eq('a batch that would overflow the shadehouse is refused',
  !!planBulkBeds({field:E3, level:1, fromRow:1, toRow:20, existing:none,
    totalBeds:115, shadehouse:{name:'Shadehouse 1', capacity:120}}).problem, true)
eq('and nothing is created when it is',
  planBulkBeds({field:E3, level:1, fromRow:1, toRow:20, existing:none,
    totalBeds:115, shadehouse:{name:'Shadehouse 1', capacity:120}}).create, [])
eq('a batch that fits is allowed',
  planBulkBeds({field:E3, level:1, fromRow:1, toRow:3, existing:none,
    totalBeds:115, shadehouse:{name:'Shadehouse 1', capacity:120}}).create.length, 3)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
