/**
 * Finding an action by what you would type. Run: npm run test:actions
 */
import { matchActions, type AppAction } from '../../src/services/actions.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const act = (id: string, title: string, group = '3D view', keywords = ''): AppAction =>
  ({ id, title, group, keywords, run: () => {} })

const actions = [
  act('bed.focus.e105', 'Go to bed E1-05'),
  act('bed.focus.c103', 'Go to bed C1-03'),
  act('layer.shade', 'Show the shade cloth', '3D view', 'cloth sun light'),
  act('query.water', 'Beds not watered in five days', 'Production', 'irrigation dry'),
  act('view.reset', 'Reset the view'),
]
const ids = (q: string) => matchActions(actions, q).map((a) => a.id)

eq('everything, in the order registered, when nothing is typed',
  ids('').length, 5)
// Nobody types the hyphen in a bed name.
eq('a bed is found without its punctuation', ids('e105'), ['bed.focus.e105'])
eq('and with it', ids('E1-05'), ['bed.focus.e105'])
eq('a word in the middle still matches', ids('shade'), ['layer.shade'])
eq('so do the extra words nobody put in the title', ids('irrigation'), ['query.water'])
eq('a title that starts with what you typed comes first',
  ids('go to')[0], 'bed.focus.c103')
eq('nothing matching returns nothing', ids('zzz'), [])

console.log(failures ? `\n  ${failures} failed` : '\n  Actions are found the way people type.')
process.exit(failures ? 1 : 0)
