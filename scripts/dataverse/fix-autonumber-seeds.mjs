/**
 * Sets each autonumber's next value to one past the highest already issued.
 *
 * Resetting a seed to 1 on a table that already holds rows makes the next
 * record repeat an identifier that is already in use — Dataverse does not
 * enforce uniqueness on an autonumber, so it simply issues the duplicate.
 */
import { readFileSync } from 'node:fs'
import { resolveToken } from './auth.mjs'
const ORG='https://enterprisedev.crm16.dynamics.com'
const t=await resolveToken(ORG)
const H={Authorization:`Bearer ${t}`,'Content-Type':'application/json',Accept:'application/json'}
const schema=JSON.parse(readFileSync('dataverse/farmtrack.dataverse.schema.json','utf8'))

// logical name -> entity set, from metadata rather than guessed pluralisation
const defs=await (await fetch(`${ORG}/api/data/v9.2/EntityDefinitions?$select=LogicalName,EntitySetName`,{headers:H})).json()
const setOf=Object.fromEntries(defs.value.map(e=>[e.LogicalName,e.EntitySetName]))

let ok=0, skipped=0
for(const table of schema.tables){
  const col=table.columns.find(c=>c.isPrimaryName && c.autoNumberFormat)
  if(!col) continue
  const logical=table.schemaName.toLowerCase()
  const set=setOf[logical]
  const attr=col.schemaName.toLowerCase()
  if(!set){ console.log(`  ${logical.padEnd(26)} SKIPPED — not in this environment`); skipped++; continue }

  // Read every value and take the max here: $orderby on an autonumber column
  // is rejected, and the numeric tail is what matters, not string order.
  const r=await fetch(`${ORG}/api/data/v9.2/${set}?$select=${attr}`,{headers:H})
  if(!r.ok){ console.log(`  ${logical.padEnd(26)} SKIPPED — query ${r.status}`); skipped++; continue }
  const rows=(await r.json()).value
  const highest=rows.reduce((max,row)=>{
    const n=Number(String(row[attr]??'').split('-').pop())
    return Number.isFinite(n)&&n>max?n:max
  },0)
  const next=highest+1
  const res=await fetch(`${ORG}/api/data/v9.2/SetAutoNumberSeed`,{method:'POST',headers:H,
    body:JSON.stringify({EntityName:logical,AttributeName:attr,Value:next})})
  console.log(`  ${logical.padEnd(26)} ${String(rows.length).padStart(4)} rows, next=${String(next).padEnd(5)} ${res.ok?'':'FAILED'}`)
  if(res.ok) ok++
}
console.log(`\n  ${ok} corrected, ${skipped} skipped`)
