/**
 * Checks the naming and capacity rules. Run: npm run test:rules
 */
import {
  nextSeasonName, fieldNameProblem, fieldCapacityProblem,
  bedName, rowOf, levelOf, parseBedName, availableRows, levelsFor, defaultLevel,
  levelProblem, bedCapacityProblem, typeForLevel, planBulkBeds,
  planBedUpdate, positionCount,
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
// A ground bed in row 1 does not stop an air bed hanging above it — but an air
// bed can only hang where a cable is, and a cable is strung between posts. In
// E3 the post lines fall on rows 1, 8, 16, 24 and 32.
eq('ground rows are every free row', availableRows({name:'E3',rows:33}, beds), 
   Array.from({length:33},(_,i)=>i+1).filter(r=>r!==1&&r!==3))
eq('air rows are only the ones carrying a cable',
   availableRows({name:'E3',rows:33}, beds, 1), [1,8,16,24,32])
const mixed = [{name:'E3-01'},{name:'E3-01-1'},{name:'E3-08-1'}]
eq('and a taken cable row drops out',
   availableRows({name:'E3',rows:33}, mixed, 1), [16,24,32])
eq('a ground bed below does not block the cable above',
   availableRows({name:'E3',rows:33}, [{name:'E3-16'}], 1), [1,8,16,24,32])
eq('level 2 is untouched by what hangs at level 1',
   availableRows({name:'E3',rows:33}, mixed, 2), [1,8,16,24,32])
eq('C fields have their own post rows',
   availableRows({name:'C3',rows:27}, [], 1), [1,6,12,17,22,27])
eq('ground free rows ignore air beds', availableRows({name:'E3',rows:3}, mixed, 0), [2,3])
eq('ground beds are level 0 only', levelsFor('Ground'), ['0'])
eq('air beds cannot be level 0', levelsFor('Air'), ['1','2','3'])
eq('ground defaults to 0', defaultLevel('Ground'), '0')
eq('air at level 0 refused', !!levelProblem('Air','0'), true)
eq('ground at level 2 refused', !!levelProblem('Ground','2'), true)
eq('air at level 2 fine', levelProblem('Air','2'), null)
// capacity is a number of positions on the ground, not of bed records
const full120 = Array.from({length:120},(_,i)=>({name:`E3-${String(i+1).padStart(2,'0')}`}))
eq('120 ground beds occupy 120 positions', positionCount(full120), 120)
eq('a new ground bed on a full floor is refused',
  !!bedCapacityProblem({name:'Shadehouse 1',capacity:120}, full120, ['C1-01']), true)
eq('re-adding a row that already exists is not new ground',
  bedCapacityProblem({name:'Shadehouse 1',capacity:120}, full120, ['E3-99']), null)
// the bug Santiago hit: air beds were refused because the floor looked full
eq('an air bed above an existing row is allowed on a full floor',
  bedCapacityProblem({name:'Shadehouse 1',capacity:120}, full120, ['E3-01-1']), null)
eq('a whole run of air beds is allowed too',
  bedCapacityProblem({name:'Shadehouse 1',capacity:120}, full120,
    ['E3-01-1','E3-02-1','E3-03-1']), null)
eq('levels stacked on one row are still one position',
  positionCount([{name:'E3-01'},{name:'E3-01-1'},{name:'E3-01-2'},{name:'E3-01-3'}]), 1)

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
// a run of ground beds that would need more floor than exists
const nearlyFull = Array.from({length:118},(_,i)=>({name:`C1-${String(i+1).padStart(2,'0')}`}))
eq('a ground run that overflows the floor is refused',
  !!planBulkBeds({field:{name:'E3',rows:33}, level:0, fromRow:1, toRow:20, existing:nearlyFull,
    shadehouse:{name:'Shadehouse 1', capacity:120}}).problem, true)
eq('and nothing is created when it is',
  planBulkBeds({field:{name:'E3',rows:33}, level:0, fromRow:1, toRow:20, existing:nearlyFull,
    shadehouse:{name:'Shadehouse 1', capacity:120}}).create, [])
// air beds over rows that already exist take no new ground
const groundE3 = Array.from({length:33},(_,i)=>({name:`E3-${String(i+1).padStart(2,'0')}`}))
eq('a full run of air beds over existing rows is allowed',
  planBulkBeds({field:E3, level:1, fromRow:1, toRow:33, existing:groundE3,
    shadehouse:{name:'Shadehouse 1', capacity:33}}).create.length, 33)


// ── planBedUpdate ───────────────────────────────────────────────────────────
// Shade is recorded per bed but strung over whole runs, so a run-update is the
// only practical way to set it across a nursery of 120.
const field = { name: "E3", rows: 6, shadehouse: "SH1" }
const nursery = [
  { name: "E3-01" }, { name: "E3-01-1" },
  { name: "E3-02" },
  { name: "E3-03" }, { name: "E3-03-1" }, { name: "E3-03-2" },
  { name: "C1-01" },
]

const everyLevel = planBedUpdate({ field, fromRow: 1, toRow: 3, existing: nursery })
eq('a run with no level takes every bed over those rows',
   everyLevel.match, ["E3-01", "E3-01-1", "E3-02", "E3-03", "E3-03-1", "E3-03-2"])
eq('and never a bed in another field', everyLevel.match.some(n => n.startsWith("C1")), false)

const groundOnly = planBedUpdate({ field, level: 0, fromRow: 1, toRow: 3, existing: nursery })
eq('a level narrows it to that tier', groundOnly.match, ["E3-01", "E3-02", "E3-03"])

const airOnly = planBedUpdate({ field, level: 1, fromRow: 1, toRow: 3, existing: nursery })
eq('air level 1 only', airOnly.match, ["E3-01-1", "E3-03-1"])
eq('and rows with no bed at that level are reported, not silently skipped',
   airOnly.missing, [2])

const past = planBedUpdate({ field, fromRow: 5, toRow: 8, existing: nursery })
eq('rows past the end of the field are named', past.outOfRange, [7, 8])
eq('and rows inside it with no bed are missing', past.missing, [5, 6])

eq('no field is a problem, not an empty result',
   planBedUpdate({ field: undefined, fromRow: 1, toRow: 2, existing: nursery }).problem, "Choose a field.")
eq('a backwards range is refused',
   planBedUpdate({ field, fromRow: 4, toRow: 2, existing: nursery }).problem,
   "The last row comes before the first.")
eq('a level outside 0-3 is refused',
   planBedUpdate({ field, level: 9, fromRow: 1, toRow: 2, existing: nursery }).problem,
   "Levels run from 0 to 3.")
eq('the run reads in row order, not string order',
   planBedUpdate({ field: { name: "E3", rows: 12 }, fromRow: 1, toRow: 11,
     existing: [{ name: "E3-11" }, { name: "E3-02" }, { name: "E3-01" }] }).match,
   ["E3-01", "E3-02", "E3-11"])

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)