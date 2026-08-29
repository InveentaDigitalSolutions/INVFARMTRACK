/** Checks what actually goes on the wire. Run: npm run test:payload */
import { buildPayload, coerce } from '../../src/services/payload.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// The bug: Dataverse 400s on "" for anything but text, and the 400 fails the
// whole record — so one untouched date lost the entire form.
eq('a blank date is left out',   coerce('date', ''), undefined)
eq('a blank number is left out', coerce('number', ''), undefined)
eq('a blank choice is left out', coerce('choice', ''), undefined)
eq('a blank boolean is left out',coerce('boolean', ''), undefined)
eq('a blank lookup is left out', coerce('lookup', ''), undefined)
eq('a cleared text field clears the column', coerce('text', ''), null)

eq('a typed number becomes a number', coerce('number', '42'), 42)
eq('a decimal survives', coerce('number', '4.5'), 4.5)
eq('text in a number column is dropped rather than sent', coerce('number', 'abc'), undefined)
eq('a checkbox string becomes a boolean', [coerce('boolean', 'true'), coerce('boolean', 'false')], [true, false])
eq('a timestamp is trimmed to the day', coerce('date', '2026-08-26T00:00:00Z'), '2026-08-26')
eq('zero is a real number, not a blank', coerce('number', 0), 0)
eq('false is a real answer', coerce('boolean', false), false)

const rules = {
  primaryKey: 'bv_workerid',
  toColumn: {
    name: 'bv_workername', hireDate: 'bv_hiredate', hourlyRate: 'bv_hourlyrate',
    role: 'bv_role', active: 'bv_isactive', bed: '_bv_bedid_value', notes: 'bv_notes',
  },
  kinds: {
    bv_workername: 'text', bv_hiredate: 'date', bv_hourlyrate: 'number',
    bv_role: 'choice', bv_isactive: 'boolean', bv_notes: 'text',
  } as Record<string, 'text' | 'number' | 'date' | 'boolean' | 'choice' | 'lookup'>,
  choices: { bv_role: { Packer: 1, Harvester: 2 } },
}

// Exactly what a form submits when someone fills in a name and nothing else.
const typical = buildPayload(
  { name: 'Ana', hireDate: '', hourlyRate: '', role: '', active: true, notes: '', bed: '' },
  rules
)
eq('the form as typed still carries the name', typical.bv_workername, 'Ana')
eq('and the blanks are simply absent',
  ['bv_hiredate', 'bv_hourlyrate', 'bv_role'].filter((k) => k in typical), [])
eq('a boolean default is kept', typical.bv_isactive, true)
eq('an emptied note clears the column', typical.bv_notes, null)
eq('a lookup is never in the payload — it is bound separately', 'bed' in typical, false)

const full = buildPayload(
  { id: 'guid', name: 'Beto', hireDate: '2026-08-01', hourlyRate: '45', role: 'Packer', active: false },
  rules
)
eq('the id is never written', 'id' in full || 'bv_workerid' in full, false)
eq('a chosen option becomes its value', full.bv_role, 1)
eq('a rate becomes a number', full.bv_hourlyrate, 45)
eq('a date passes through', full.bv_hiredate, '2026-08-01')

let flagged = ''
buildPayload({ role: 'Astronaut' }, {
  ...rules,
  onUnknownChoice: (c, v) => { flagged = `${c}:${v}` },
})
eq('an option Dataverse does not have is reported, not sent', flagged, 'bv_role:Astronaut')

eq('an app-only field never reaches the wire',
  'somethingLocal' in buildPayload({ somethingLocal: 'x' }, rules), false)

console.log(failures === 0 ? '\n  all passed\n' : `\n  ${failures} FAILED\n`)
process.exit(failures === 0 ? 0 : 1)
