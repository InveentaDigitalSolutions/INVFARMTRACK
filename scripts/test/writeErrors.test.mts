/**
 * What a failed write says to the person who tried it.
 * Run: npm run test:errors
 */
import { describeError } from '../../src/services/writeErrors.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(50)} ${JSON.stringify(got)}${pass ? '' : `\n       want ${JSON.stringify(want)}`}`)
}

// Verbatim from Dataverse when a customer with forecast lines is deleted.
const cascade = 'The object you tried to delete is associated with another object and cannot be deleted. ' +
  'Deleting records from bv_Customer (ObjectTypeCode: 10892)\r\nfor Id(s) : 09b6ef6d\r\n' +
  'Exception : Cascade Delete failed due to cascade restrict relation. Details below : \r\n' +
  'Restricting entity bv_DemandForecast (ObjectTypeCode: 10913) has Id: f'

eq('a refused delete names what is in the way',
  describeError({ message: cascade }),
  'Still in use: demand forecast records point at this one. Delete or re-point those first.')

eq('anything else is passed through, trimmed',
  describeError({ message: 'A required field is missing.' }),
  'A required field is missing.')
eq('and a write with no reason still says something',
  describeError({}), 'The write was rejected and gave no reason.')

console.log(failures ? `\n  ${failures} failed` : '\n  A refusal explains itself.')
process.exit(failures ? 1 : 0)
