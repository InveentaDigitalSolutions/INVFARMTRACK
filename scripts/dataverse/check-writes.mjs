/**
 * Every form on every screen writes to a store.
 *
 * The tables were verified end-to-end by verify-writes.mjs, which proves the
 * store layer. It does not prove a button is wired to it: a FormModal whose
 * onSubmit only closes the dialog looks identical on screen and loses the
 * record. That happened on shipments, and it was found by hand.
 *
 * This walks every FormModal and ConfirmDialog in src/pages and checks the
 * handler behind it reaches a setter that came from useRecords.
 *
 * Run: npm run dataverse:check-writes
 */
import { readFileSync, readdirSync } from 'node:fs'

let problems = 0
let checked = 0

for (const file of readdirSync('src/pages').filter((f) => f.endsWith('.tsx'))) {
  const src = readFileSync(`src/pages/${file}`, 'utf8')

  // The setters this page got from useRecords — the only way to Dataverse.
  const setters = new Set(
    [...src.matchAll(/const \[\s*\w+\s*,\s*(\w+)\s*\]\s*=\s*useRecords/g)].map((m) => m[1])
  )
  if (setters.size === 0) continue

  /** Does this named function eventually call one of the setters? */
  const reaches = (name, seen = new Set()) => {
    if (setters.has(name)) return true
    if (seen.has(name)) return false
    seen.add(name)
    // The function's body, taken by brace balance rather than by indentation —
    // matching on "\n  };" missed every helper that closes differently and
    // reported three working save buttons as dead.
    const at = new RegExp(`(?:const ${name}\\s*=|function ${name}\\b)`).exec(src)
    if (!at) return false
    const open = src.indexOf('{', at.index)
    if (open === -1) return false
    let depth = 0, i = open
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}' && --depth === 0) break
    }
    const body = src.slice(open, i + 1)
    if ([...setters].some((x) => new RegExp(`\\b${x}\\b`).test(body))) return true
    if ([...setters].some((s) => body.includes(`${s}(`))) return true
    // One hop: a handler that delegates to another named helper.
    return [...body.matchAll(/\b(\w+)\s*\(/g)].some((m) => m[1] !== name && reaches(m[1], seen))
  }

  const check = (kind, prop) => {
    for (const m of src.matchAll(new RegExp(`<${kind}\\b([\\s\\S]{0,3000}?)/>`, 'g'))) {
      const body = m[1]
      const handler = new RegExp(`${prop}=\\{([\\s\\S]*?)\\}\\s`).exec(body)?.[1] ?? ''
      if (!handler.trim()) continue
      checked++
      // The common shape passes the setter in: save(rows, setRows, form, v).
      // Naming it at the call site is as good as calling it.
      if ([...setters].some((s) => new RegExp(`\\b${s}\\b`).test(handler))) continue
      const names = [...handler.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((x) => x[1])
      const bare = /^\s*\{?\s*([A-Za-z_$][\w$]*)\s*\}?\s*$/.exec(handler)?.[1]
      const candidates = bare ? [...names, bare] : names
      if (candidates.some((n) => reaches(n))) continue
      problems++
      const line = src.slice(0, m.index).split('\n').length
      console.log(`\n  ${file}:${line}`)
      console.log(`     <${kind}> ${prop} does not reach a useRecords setter`)
      console.log(`     handler: ${handler.trim().slice(0, 90)}`)
    }
  }

  check('FormModal', 'onSubmit')
  check('ConfirmDialog', 'onConfirm')
}

console.log(problems === 0
  ? `\n  ${checked} save and delete handlers all reach a store.\n`
  : `\n  ${problems} of ${checked} handlers do not write.\n`)
process.exit(problems === 0 ? 0 : 1)
