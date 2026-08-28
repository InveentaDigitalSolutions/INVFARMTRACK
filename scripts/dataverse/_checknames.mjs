import { resolveToken } from './auth.mjs'
const ORG = 'https://enterprisedev.crm16.dynamics.com'
const t = await resolveToken(ORG)
const probes = [
  ['bv_beds','bv_bedname'], ['bv_harvests','bv_harvestname'],
  ['bv_irrigations','bv_irrigationname'], ['bv_treatments','bv_treatmentname'],
  ['bv_plantings','bv_plantingdescription'], ['bv_timesheets','bv_timesheetname'],
  ['bv_customers','bv_customername'], ['bv_plants','bv_plantname'],
]
for (const [set, name] of probes) {
  const r = await fetch(`${ORG}/api/data/v9.2/${set}?$select=${name}&$top=300`,
    { headers: { Authorization: `Bearer ${t}`, Accept: 'application/json' } })
  if (!r.ok) { console.log(`  ${set.padEnd(16)} query failed ${r.status}`); continue }
  const j = await r.json()
  const blank = j.value.filter(v => !v[name]).length
  const flag = blank ? '  <-- blank names' : ''
  console.log(`  ${set.padEnd(16)} ${String(j.value.length).padStart(4)} rows, ${blank} blank${flag}`)
}
