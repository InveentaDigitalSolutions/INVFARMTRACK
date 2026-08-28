/**
 * seed-data.mjs — populate the Dataverse tables with the app's demo data.
 *
 * Reads the same seed arrays the app ships with, so a freshly provisioned
 * environment looks like the local demo rather than 36 empty tables.
 *
 * Idempotent by name: a record whose primary-name value already exists is
 * skipped, so re-running tops up rather than duplicating.
 *
 * Usage:
 *   node scripts/dataverse/seed-data.mjs --dry-run
 *   DATAVERSE_URL=https://enterprisedev.crm16.dynamics.com node scripts/dataverse/seed-data.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveToken } from './auth.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DV_URL = (process.env.DATAVERSE_URL || 'https://enterprisedev.crm16.dynamics.com').replace(/\/+$/, '')
const DRY_RUN = process.argv.includes('--dry-run')

const schema = JSON.parse(readFileSync(join(REPO_ROOT, 'dataverse', 'farmtrack.dataverse.schema.json'), 'utf8'))
let token = ''

async function api(method, path, body) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(`${DV_URL}/api/data/v9.2/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          Prefer: 'return=representation',
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      const payload = text ? JSON.parse(text) : null
      if (!res.ok) {
        const err = new Error(payload?.error?.message ?? res.statusText)
        err.status = res.status
        throw err
      }
      return payload
    } catch (err) {
      // Same flaky host as the schema apply; retry transient faults only.
      const transient = /fetch failed/i.test(err.message) || ['ETIMEDOUT', 'ECONNRESET'].includes(err?.cause?.code)
      if (!transient || attempt === 6) throw err
      await new Promise((r) => setTimeout(r, Math.min(30_000, 1_500 * 2 ** (attempt - 1))))
    }
  }
}

/**
 * Seed plan, in dependency order.
 *
 * `rows` may be an array or a function, so the large generated sets (120 beds)
 * do not have to be written out. A `_ref` entry names a parent by its
 * descriptive value; the parent's GUID is resolved after that table is seeded
 * and bound via @odata.bind, which is how Dataverse sets a lookup.
 */
const PLOTS = [
  { code: 'E3', beds: 33, width: 1.2 },
  { code: 'C3', beds: 27, width: 1.8 },
  { code: 'E1', beds: 33, width: 1.2 },
  { code: 'C1', beds: 27, width: 1.8 },
]

const SEED_PLAN = [
  { table: 'bv_shadehouse', nameField: 'bv_shadehousename', rows: [
    { bv_shadehousename: 'Shadehouse 1', bv_location: 'El Olvido, Santa Cruz de Yojoa', bv_coordinates: '14.97,-87.85', bv_length: 80, bv_width: 75, bv_capacity: 120, bv_isactive: true },
  ]},
  { table: 'bv_season', nameField: 'bv_seasonname', rows: [
    { bv_seasonname: '2026-S1', bv_startdate: '2026-01-05', bv_enddate: '2026-06-28', bv_isactive: true },
  ]},
  { table: 'bv_plant', nameField: 'bv_variety', rows: [
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: 'Hawaiian' },
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: 'Marble Queen' },
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: 'Jade' },
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: "N'Joy" },
    { bv_plantname: 'Sansevieria', bv_latinname: 'Dracaena trifasciata', bv_variety: 'Sansevieria' },
  ]},
  { table: 'bv_component', nameField: 'bv_componentname', rows: [
    { bv_componentname: 'Nitrogen', bv_symbol: 'N', bv_elementsymbol: 'N', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Phosphorus pentoxide', bv_symbol: 'P2O5', bv_elementsymbol: 'P', bv_elementalfactor: 0.4364, bv_isnutrient: true },
    { bv_componentname: 'Potassium oxide', bv_symbol: 'K2O', bv_elementsymbol: 'K', bv_elementalfactor: 0.8301, bv_isnutrient: true },
    { bv_componentname: 'Calcium', bv_symbol: 'Ca', bv_elementsymbol: 'Ca', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Magnesium', bv_symbol: 'Mg', bv_elementsymbol: 'Mg', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Iron', bv_symbol: 'Fe', bv_elementsymbol: 'Fe', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Azadirachtin', bv_symbol: 'AZA', bv_isnutrient: false },
  ]},
  { table: 'bv_input', nameField: 'bv_inputname', rows: [
    { bv_inputname: 'NPK 20-20-20', bv_brand: 'NutriMax', bv_composition: '20% N, 20% P2O5, 20% K2O' },
    { bv_inputname: 'Neem Oil', bv_brand: 'BioGrow', bv_composition: 'Azadirachtin 0.3%' },
    { bv_inputname: 'Copper Fungicide', bv_brand: 'CupraSol', bv_composition: 'Copper hydroxide 77%' },
  ]},
  { table: 'bv_worker', nameField: 'bv_workername', rows: [
    { bv_workername: 'Carlos Martinez', bv_hourlyrate: 45, bv_isactive: true },
    { bv_workername: 'Maria Lopez', bv_hourlyrate: 42, bv_isactive: true },
    { bv_workername: 'Juan Perez', bv_hourlyrate: 40, bv_isactive: true },
    { bv_workername: 'Ana Rodriguez', bv_hourlyrate: 42, bv_isactive: true },
    { bv_workername: 'Pedro Hernandez', bv_hourlyrate: 40, bv_isactive: true },
  ]},
  { table: 'bv_supplier', nameField: 'bv_suppliername', rows: [
    { bv_suppliername: 'AgroSupply HN', bv_isactive: true },
    { bv_suppliername: 'DHL Express', bv_isactive: true },
    { bv_suppliername: 'TecniAgua', bv_isactive: true },
  ]},
  { table: 'bv_customer', nameField: 'bv_customername', rows: [
    { bv_customername: 'The Plant Company' },
    { bv_customername: 'Green Gardens Inc.' },
  ]},

  // Plots. Each belongs to the single shadehouse and the current season.
  { table: 'bv_field', nameField: 'bv_fieldname', rows: () =>
    PLOTS.map((p) => ({
      bv_fieldname: `Plot ${p.code}`,
      bv_fieldcode: undefined,
      _ref: {
        bv_ShadehouseId: ['bv_shadehouse', 'Shadehouse 1'],
        bv_SeasonId: ['bv_season', '2026-S1'],
      },
    })),
  },

  // 120 ground beds, PLOT-NN, matching the layout and the 3D view.
  { table: 'bv_bed', nameField: 'bv_bedname', rows: () =>
    PLOTS.flatMap((p) =>
      Array.from({ length: p.beds }, (_, i) => ({
        bv_bedname: `${p.code}-${String(i + 1).padStart(2, '0')}`,
        bv_capacity: Math.round(37.2 / 0.45),
        bv_isactive: true,
        _ref: { bv_FieldId: ['bv_field', `Plot ${p.code}`] },
      }))
    ),
  },

  // ── Operational records ────────────────────────────────────────────────
  // Enough to exercise every screen and give the 3D view real occupancy,
  // without pretending to be a data migration.
  { table: 'bv_planting', nameField: 'bv_plantingdescription', rows: () => {
      const varieties = ['Hawaiian', 'Marble Queen', 'Jade', "N'Joy", 'Sansevieria']
      const out = []
      let n = 0
      for (const plot of PLOTS) {
        // Roughly two thirds of each plot planted, as in the layout.
        const planted = Math.round(plot.beds * 0.66)
        for (let i = 1; i <= planted; i++) {
          const bed = `${plot.code}-${String(i).padStart(2, '0')}`
          const variety = varieties[n % varieties.length]
          out.push({
            bv_plantingdescription: `${variety} — ${bed}`,
            bv_plantingdate: `2026-0${1 + (n % 4)}-${String(3 + (n % 25)).padStart(2, '0')}`,
            bv_quantity: 800 + (n % 9) * 150,
            bv_currentplanting: true,
            _ref: {
              bv_PlantId: ['bv_plant', variety],
              bv_BedId: ['bv_bed', bed],
              bv_SeasonId: ['bv_season', '2026-S1'],
            },
          })
          n++
        }
      }
      return out
    },
  },

  { table: 'bv_irrigation', nameField: 'bv_irrigationname', rows: () => {
      const out = []
      let n = 0
      for (const plot of PLOTS) {
        for (let i = 1; i <= 6; i++) {
          const bed = `${plot.code}-${String(i).padStart(2, '0')}`
          const day = String(10 + (n % 15)).padStart(2, '0')
          out.push({
            bv_irrigationname: `Irrigation ${bed} 2026-04-${day}`,
            bv_date: `2026-04-${day}`,
            bv_amountliters: 120 + (n % 6) * 25,
            bv_method: 187460000,          // Drip
            bv_status: 121320101,          // Completed
            bv_source: 121320111,          // Manual
            _ref: { bv_BedId: ['bv_bed', bed] },
          })
          n++
        }
      }
      return out
    },
  },

  { table: 'bv_treatment', nameField: 'bv_treatmentname', rows: () => {
      const inputs = ['Neem Oil', 'Copper Fungicide']
      const out = []
      for (let n = 0; n < 12; n++) {
        const plot = PLOTS[n % PLOTS.length]
        const bed = `${plot.code}-${String(1 + (n % 8)).padStart(2, '0')}`
        out.push({
          bv_treatmentname: `Treatment ${bed} #${n + 1}`,
          bv_date: `2026-04-${String(2 + n).padStart(2, '0')}`,
          bv_type: n % 2 === 0 ? 187460000 : 187460001,   // Insecticide / Fungicide
          bv_worker: ['Carlos Martinez', 'Maria Lopez', 'Juan Perez'][n % 3],
          bv_dose: 1.5 + (n % 4) * 0.5,
          _ref: { bv_BedId: ['bv_bed', bed], bv_InputId: ['bv_input', inputs[n % 2]] },
        })
      }
      return out
    },
  },

  { table: 'bv_harvest', nameField: 'bv_harvestname', rows: () => {
      const out = []
      for (let n = 0; n < 15; n++) {
        const plot = PLOTS[n % PLOTS.length]
        const bed = `${plot.code}-${String(1 + (n % 10)).padStart(2, '0')}`
        out.push({
          bv_harvestname: `Harvest ${bed} #${n + 1}`,
          bv_date: `2026-04-${String(1 + n).padStart(2, '0')}`,
          bv_quantityharvested: 900 + (n % 7) * 220,
          bv_worker: ['Carlos Martinez', 'Maria Lopez', 'Ana Rodriguez'][n % 3],
          _ref: { bv_BedId: ['bv_bed', bed] },
        })
      }
      return out
    },
  },

  { table: 'bv_timesheet', nameField: 'bv_timesheetname', rows: () => {
      const workers = ['Carlos Martinez', 'Maria Lopez', 'Juan Perez', 'Ana Rodriguez', 'Pedro Hernandez']
      const activities = [187460001, 187460002, 187460003, 187460004]  // Harvest, Pack, Treat, Irrigate
      const out = []
      for (let n = 0; n < 20; n++) {
        const worker = workers[n % workers.length]
        const day = String(6 + Math.floor(n / 5)).padStart(2, '0')
        out.push({
          bv_timesheetname: `${worker} 2026-04-${day}`,
          bv_date: `2026-04-${day}`,
          bv_activitytype: activities[n % activities.length],
          bv_hoursworked: 6 + (n % 3),
          bv_boxespacked: (n % 4) * 6,
          bv_laborcost: (6 + (n % 3)) * 42,
          _ref: { bv_WorkerId: ['bv_worker', worker] },
        })
      }
      return out
    },
  },

  { table: 'bv_availability', nameField: 'bv_availabilityname', rows: () => {
      const varieties = ['Hawaiian', 'Marble Queen', 'Jade', "N'Joy"]
      const out = []
      for (let n = 0; n < 16; n++) {
        const variety = varieties[n % varieties.length]
        const week = 14 + Math.floor(n / 4)
        const projected = 800 + (n % 5) * 300
        out.push({
          bv_availabilityname: `${variety} W${week}`,
          bv_shipmentweek: week,
          bv_generateddate: '2026-04-01',
          bv_projectedqty: projected,
          bv_confirmedqty: projected - (n % 3) * 100,
          bv_status: n % 3 === 0 ? 187460000 : 187460002,
          bv_size: [187460002, 187460003][n % 2],   // Small / Medium
          _ref: { bv_PlantId: ['bv_plant', variety], bv_SeasonId: ['bv_season', '2026-S1'] },
        })
      }
      return out
    },
  },

  // ---- Batch 1: commercial ----------------------------------------------
  // Choice values are the integers Dataverse stores; the label is in the
  // comment. Regenerate src/services/choiceMap.generated.ts if these move.

  { table: 'bv_plantprice', nameField: 'bv_plantpricename', rows: () => {
      const varieties = ['Hawaiian', 'Marble Queen', 'Jade', "N'Joy", 'Sansevieria']
      const ext = [3.20, 3.60, 3.10, 3.85, 4.40]
      return varieties.map((v, i) => ({
        bv_plantpricename: `${v} — export 2026`,
        bv_priceext: ext[i],
        bv_priceint: Number((ext[i] * 0.82).toFixed(2)),
        bv_effectivefrom: '2026-01-05',
        bv_effectiveto: '2026-12-31',
        bv_isactive: true,
        _ref: { bv_PlantId: ['bv_plant', v], bv_SeasonId: ['bv_season', '2026-S1'] },
      }))
    },
  },

  { table: 'bv_order', dedupeField: 'bv_orderdate', nameField: 'bv_ordernumber', rows: [
    { bv_orderdate: '2026-08-03', bv_requesteddeliverydate: '2026-08-17', bv_status: 187460004, bv_totalamount: 4820,
      bv_notes: 'Mixed pallet — Hawaiian and Marble Queen',
      _ref: { bv_CustomerId: ['bv_customer', 'The Plant Company'] } },
    { bv_orderdate: '2026-08-12', bv_requesteddeliverydate: '2026-08-26', bv_status: 187460002, bv_totalamount: 2310,
      _ref: { bv_CustomerId: ['bv_customer', 'Green Gardens Inc.'] } },
    { bv_orderdate: '2026-08-24', bv_requesteddeliverydate: '2026-09-07', bv_status: 187460001, bv_totalamount: 6150,
      _ref: { bv_CustomerId: ['bv_customer', 'The Plant Company'] } },
  ]},

  { table: 'bv_fiscalauthorization', nameField: 'bv_fiscalauthname', rows: [
    { bv_fiscalauthname: 'CAI 2026', bv_cai: '4ED113-4AB1C5-B6B9E0-63BE03-090919-95',
      bv_rtn: '05019011379855', bv_rangestart: '000-001-01-00001461',
      bv_rangeend: '000-001-01-00001530', bv_expirationdate: '2027-04-06',
      bv_totalauthorized: 70, bv_nextnumber: 1462, bv_requestdate: '2026-04-06', bv_isactive: true },
  ]},

  { table: 'bv_invoice', dedupeField: 'bv_invoicedate', nameField: 'bv_invoicenumber', rows: [
    { bv_invoicedate: '2026-08-05', bv_duedate: '2026-09-04', bv_weeknumber: 32,
      bv_subtotal: 1520, bv_isv15: 0, bv_totalamount: 1520, bv_balance: 1520, bv_status: 187460001, // Sent
      _ref: { bv_CustomerId: ['bv_customer', 'The Plant Company'],
              bv_FiscalAuthId: ['bv_fiscalauthorization', 'CAI 2026'] } },
    { bv_invoicedate: '2026-07-28', bv_duedate: '2026-08-27', bv_weeknumber: 31,
      bv_subtotal: 600, bv_isv15: 0, bv_totalamount: 600, bv_paidamount: 600, bv_balance: 0, bv_status: 187460003, // Paid
      _ref: { bv_CustomerId: ['bv_customer', 'Green Gardens Inc.'],
              bv_FiscalAuthId: ['bv_fiscalauthorization', 'CAI 2026'] } },
  ]},

  { table: 'bv_expense', nameField: 'bv_expensename', rows: [
    { bv_expensename: 'Office supplies — Librería Maya', bv_date: '2026-08-10', bv_category: 187460008, // Office
      bv_amount: 60, bv_currency: 187460001, bv_vendor: 'Librería Maya', bv_status: 187460003 },      // USD / Paid
    { bv_expensename: 'Fuel — pickup', bv_date: '2026-08-09', bv_category: 187460003,                 // Transportation
      bv_amount: 1200, bv_currency: 187460000, bv_vendor: 'UNO', bv_status: 187460003 },
    { bv_expensename: 'Electricity — ENEE', bv_date: '2026-08-16', bv_category: 187460004,            // Utilities
      bv_amount: 4250, bv_currency: 187460000, bv_vendor: 'ENEE', bv_status: 187460000 },             // Pending
    { bv_expensename: 'Irrigation repair', bv_date: '2026-08-04', bv_category: 187460007,             // Maintenance
      bv_amount: 2500, bv_currency: 187460000, bv_vendor: 'TecniAgua', bv_status: 187460003 },
  ]},

  { table: 'bv_purchaseorder', dedupeField: 'bv_orderdate', nameField: 'bv_ponumber', rows: [
    { bv_orderdate: '2026-08-02', bv_expecteddelivery: '2026-08-14', bv_description: 'NPK 20-20-20, 20 sacks',
      bv_amount: 18000, bv_currency: 187460000, bv_status: 187460003,                                 // HNL / Received
      _ref: { bv_SupplierId: ['bv_supplier', 'AgroSupply HN'] } },
    { bv_orderdate: '2026-08-19', bv_expecteddelivery: '2026-09-02', bv_description: 'Drip line replacement',
      bv_amount: 9400, bv_currency: 187460000, bv_status: 187460001,                                  // Sent
      _ref: { bv_SupplierId: ['bv_supplier', 'TecniAgua'] } },
  ]},


  // ---- Batch 2: agronomy -------------------------------------------------

  { table: 'bv_pruning', dedupeField: 'bv_pruningname', nameField: 'bv_pruningname', rows: () => {
      const beds = ['E3-01', 'E3-14', 'C3-05', 'C1-11', 'E1-22', 'C3-19']
      return beds.map((bed, i) => ({
        bv_pruningname: `${bed} · week ${30 + i}`,
        bv_date: `2026-0${7 + Math.floor(i / 4)}-${String(6 + i * 3).padStart(2, '0')}`,
        bv_weeknumber: 30 + i,
        bv_bedspruned: 1,
        bv_cuttingsestimated: 380 + i * 40,
        bv_worker: ['Carlos Martinez', 'Maria Lopez', 'Juan Perez'][i % 3],
        _ref: { bv_BedId: ['bv_bed', bed], bv_SeasonId: ['bv_season', '2026-S1'] },
      }))
    },
  },

  { table: 'bv_pruningcurve', dedupeField: 'bv_pruningcurvename', nameField: 'bv_pruningcurvename', rows: () =>
      Array.from({ length: 8 }, (_, i) => {
        const week = 28 + i
        const planned = 14 + (i % 4) * 3
        return {
          bv_pruningcurvename: `2026-S1 · week ${week}`,
          bv_weeknumber: week,
          bv_plannedbeds: planned,
          bv_actualbeds: planned - (i % 3),
          bv_plannedcuttings: planned * 400,
          bv_actualcuttings: (planned - (i % 3)) * 385,
          _ref: { bv_SeasonId: ['bv_season', '2026-S1'] },
        }
      }),
  },

  { table: 'bv_fertilization', dedupeField: 'bv_fertilizationname', nameField: 'bv_fertilizationname', rows: () => {
      const beds = ['E3-31', 'C3-20', 'E1-08', 'C1-03', 'E3-12']
      const methods = [187460001, 187460000, 187460003, 187460001, 187460002] // Soil Drench, Foliar Spray, Drip / Fertigation, Soil Drench, Granular
      return beds.map((bed, i) => ({
        bv_fertilizationname: `${bed} · NPK · 2026-08-${String(4 + i * 4).padStart(2, '0')}`,
        bv_date: `2026-08-${String(4 + i * 4).padStart(2, '0')}`,
        bv_quantity_kg: 4 + (i % 3),
        bv_method: methods[i],
        bv_worker: ['Carlos Martinez', 'Juan Perez', 'Maria Lopez'][i % 3],
        _ref: { bv_BedId: ['bv_bed', bed], bv_InputId: ['bv_input', 'NPK 20-20-20'] },
      }))
    },
  },

  { table: 'bv_nutrientbalance', dedupeField: 'bv_nutrientbalancename', nameField: 'bv_nutrientbalancename', rows: () => {
      const beds = ['E3-31', 'C3-20', 'E1-08', 'C1-03']
      return beds.flatMap((bed, i) =>
        [32, 34].map((week) => ({
          bv_nutrientbalancename: `${bed} · week ${week}`,
          bv_weeknumber: week,
          bv_n_applied: 1.0 + i * 0.2, bv_p_applied: 1.0 + i * 0.2,
          bv_k_applied: 1.0 + i * 0.2, bv_ca_applied: 0.4,
          bv_n_extracted: 0.72 + i * 0.1, bv_p_extracted: 0.21,
          bv_k_extracted: 0.86 + i * 0.1, bv_ca_extracted: 0.31,
          bv_drymatterpct: 12.4 + i * 0.3,
          _ref: { bv_BedId: ['bv_bed', bed], bv_SeasonId: ['bv_season', '2026-S1'] },
        }))
      )
    },
  },

  // Two real lab reports' worth of shape — enough to exercise the screen.
  { table: 'bv_soilanalysis', dedupeField: 'bv_soilanalysisname', nameField: 'bv_soilanalysisname', rows: [
    { bv_soilanalysisname: 'E3-31 · 2026-06-18', bv_sampledate: '2026-06-18', bv_reportdate: '2026-07-02',
      bv_lab: 'Laboratorio Químico Agrícola', bv_labcode: 'LQA', bv_reportnumber: 'S-2026-0418',
      bv_crop: 'Epipremnum aureum', bv_texture: 'Franco arcilloso',
      bv_sand_pct: 34, bv_silt_pct: 28, bv_clay_pct: 38, bv_ph: 6.2,
      bv_organiccarbon_pct: 1.9, bv_organicmatter_pct: 3.3, bv_n_total_pct: 0.17,
      bv_al_cmol: 0.1, bv_al_saturation_pct: 0.8, bv_ce_ds: 0.42, bv_cic: 18.4,
      bv_ca_mg: 1840, bv_mg_mg: 310, bv_k_mg: 240, bv_na_mg: 42, bv_cice: 12.6,
      bv_ca_sat_pct: 62, bv_mg_sat_pct: 17, bv_k_sat_pct: 5.1,
      bv_camg_ratio: 3.6, bv_mgk_ratio: 3.3, bv_cak_ratio: 12.1, bv_camgk_ratio: 15.7,
      bv_cu_mg: 3.1, bv_fe_mg: 84, bv_mn_mg: 26, bv_zn_mg: 4.2, bv_b_mg: 0.6,
      bv_s_mg: 14, bv_p_mg: 32,
      _ref: { bv_BedId: ['bv_bed', 'E3-31'] } },
    { bv_soilanalysisname: 'C3-20 · 2026-06-18', bv_sampledate: '2026-06-18', bv_reportdate: '2026-07-02',
      bv_lab: 'Laboratorio Químico Agrícola', bv_labcode: 'LQA', bv_reportnumber: 'S-2026-0419',
      bv_crop: 'Epipremnum aureum', bv_texture: 'Franco',
      bv_sand_pct: 41, bv_silt_pct: 33, bv_clay_pct: 26, bv_ph: 5.8,
      bv_organiccarbon_pct: 1.6, bv_organicmatter_pct: 2.8, bv_n_total_pct: 0.14,
      bv_al_cmol: 0.3, bv_al_saturation_pct: 2.4, bv_ce_ds: 0.38, bv_cic: 15.1,
      bv_ca_mg: 1420, bv_mg_mg: 265, bv_k_mg: 185, bv_na_mg: 38, bv_cice: 10.2,
      bv_ca_sat_pct: 57, bv_mg_sat_pct: 16, bv_k_sat_pct: 4.4,
      bv_camg_ratio: 3.3, bv_mgk_ratio: 3.5, bv_cak_ratio: 11.6, bv_camgk_ratio: 14.9,
      bv_cu_mg: 2.6, bv_fe_mg: 96, bv_mn_mg: 31, bv_zn_mg: 3.4, bv_b_mg: 0.4,
      bv_s_mg: 11, bv_p_mg: 24,
      _ref: { bv_BedId: ['bv_bed', 'C3-20'] } },
  ]},

  { table: 'bv_foliaranalysis', dedupeField: 'bv_foliaranalysisname', nameField: 'bv_foliaranalysisname', rows: [
    { bv_foliaranalysisname: 'E3-31 · 2026-07-14', bv_sampledate: '2026-07-14', bv_reportdate: '2026-07-25',
      bv_lab: 'Laboratorio Químico Agrícola', bv_labcode: 'LQA', bv_crop: 'Epipremnum aureum',
      bv_n_pct: 2.94, bv_p_pct: 0.28, bv_k_pct: 3.12, bv_ca_pct: 1.44, bv_mg_pct: 0.41,
      bv_fe_ppm: 118, bv_zn_ppm: 34, bv_mn_ppm: 62, bv_cu_ppm: 9, bv_b_ppm: 28, bv_s_ppm: 1900,
      _ref: { bv_BedId: ['bv_bed', 'E3-31'] } },
    { bv_foliaranalysisname: 'C1-03 · 2026-07-14', bv_sampledate: '2026-07-14', bv_reportdate: '2026-07-25',
      bv_lab: 'Laboratorio Químico Agrícola', bv_labcode: 'LQA', bv_crop: 'Dracaena trifasciata',
      bv_n_pct: 2.41, bv_p_pct: 0.22, bv_k_pct: 2.76, bv_ca_pct: 1.71, bv_mg_pct: 0.38,
      bv_fe_ppm: 96, bv_zn_ppm: 27, bv_mn_ppm: 54, bv_cu_ppm: 7, bv_b_ppm: 21, bv_s_ppm: 1640,
      _ref: { bv_BedId: ['bv_bed', 'C1-03'] } },
  ]},


  // ---- Batch 3: planning -------------------------------------------------

  { table: 'bv_task', dedupeField: 'bv_tasktitle', nameField: 'bv_tasktitle', rows: [
    { bv_tasktitle: 'Water Shadehouse 1', bv_tasktype: 187460000, bv_duedate: '2026-08-29T07:00:00Z',
      bv_status: 187460000, bv_priority: 187460002, bv_assignedto: 'Carlos Martinez' },
    { bv_tasktitle: 'Apply Neem Oil E3-01', bv_tasktype: 187460004, bv_duedate: '2026-08-29T07:00:00Z',
      bv_status: 187460000, bv_priority: 187460001, bv_assignedto: 'Maria Lopez',
      _ref: { bv_BedId: ['bv_bed', 'E3-01'] } },
    { bv_tasktitle: 'Harvest Pothos Hawaiian E3-14', bv_tasktype: 187460006, bv_duedate: '2026-08-30T07:00:00Z',
      bv_status: 187460001, bv_priority: 187460003, bv_assignedto: 'Juan Perez',
      _ref: { bv_BedId: ['bv_bed', 'E3-14'] } },
    { bv_tasktitle: 'Prune C3-05', bv_tasktype: 187460002, bv_duedate: '2026-09-01T07:00:00Z',
      bv_status: 187460000, bv_priority: 187460001, bv_assignedto: 'Carlos Martinez',
      _ref: { bv_BedId: ['bv_bed', 'C3-05'] } },
    { bv_tasktitle: 'Weekly bed inspection — Plot C1', bv_tasktype: 187460009, bv_duedate: '2026-08-31T07:00:00Z',
      bv_status: 187460000, bv_priority: 187460000, bv_assignedto: 'Maria Lopez' },
    { bv_tasktitle: 'Pack order ORD-0001', bv_tasktype: 187460008, bv_duedate: '2026-08-28T07:00:00Z',
      bv_completeddate: '2026-08-28T15:30:00Z', bv_status: 187460002, bv_priority: 187460002,
      bv_assignedto: 'Juan Perez' },
  ]},

]


/** entitySetName for a table, taken from power.config.json. */
const entitySets = (() => {
  const cfg = JSON.parse(readFileSync(join(REPO_ROOT, 'power.config.json'), 'utf8'))
  const sources = cfg.databaseReferences?.['default.cds']?.dataSources ?? {}
  const map = {}
  for (const v of Object.values(sources)) map[v.logicalName] = v.entitySetName
  return map
})()

/** Cache of seeded records per table: descriptive value -> GUID. */
const idIndex = new Map()

/** Dataverse names its key after the table: bv_bed -> bv_bedid. */
const keyOf = (logicalName) => `${logicalName}id`

async function indexTable(logicalName, nameField) {
  const set = entitySets[logicalName]
  const key = keyOf(logicalName)
  const found = await api('GET', `${set}?$select=${nameField},${key}`)
  const map = new Map()
  for (const r of found.value ?? []) map.set(String(r[nameField]), r[key])
  idIndex.set(logicalName, map)
  return map
}

/** Turn a row's `_ref` entries into @odata.bind bindings. */
function bindRefs(row, plannedTable) {
  const { _ref, ...rest } = row
  if (!_ref) return rest
  for (const [lookupColumn, [parentTable, parentName]] of Object.entries(_ref)) {
    const parents = idIndex.get(parentTable)
    const guid = parents?.get(parentName)
    if (!guid) {
      throw new Error(
        `${plannedTable}: cannot resolve ${lookupColumn} -> ${parentTable} "${parentName}". ` +
        `Seed ${parentTable} first.`
      )
    }
    rest[`${lookupColumn}@odata.bind`] = `/${entitySets[parentTable]}(${guid})`
  }
  return rest
}

async function seedTable(plan) {
  const { table, nameField } = plan
  // Tables whose primary column is an autonumber have no descriptive name in
  // the seed row — every row would key on "undefined", so the first is created
  // and the rest silently counted as duplicates. Such plans name a real column
  // to de-duplicate on instead.
  const dedupeField = plan.dedupeField ?? nameField
  const rows = typeof plan.rows === 'function' ? plan.rows() : plan.rows
  const set = entitySets[table]
  if (!set) {
    console.log(`  ${table}: not in power.config.json — skipped`)
    return 0
  }

  // The primary column is an autonumber, so de-duplication uses the
  // descriptive field instead — re-running tops up rather than duplicating.
  const existing = await indexTable(table, dedupeField)

  let created = 0
  let skipped = 0
  for (const row of rows) {
    const name = String(row[dedupeField])
    if (name === 'undefined') {
      throw new Error(
        `${table}: seed rows carry no ${dedupeField} to de-duplicate on. ` +
        `Add a dedupeField naming a column the rows actually set.`
      )
    }
    if (existing.has(name)) { skipped++; continue }
    if (DRY_RUN) { created++; continue }
    const body = bindRefs({ ...row }, table)
    for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k]
    const saved = await api('POST', set, body)
    if (saved?.[keyOf(table)]) existing.set(name, saved[keyOf(table)])
    created++
    if (created % 25 === 0) console.log(`    … ${created} of ${rows.length}`)
  }
  console.log(`  ${table}: +${created} created, ${skipped} already present`)
  return created
}

async function main() {
  console.log(`Seeding ${DV_URL}`)
  console.log(DRY_RUN ? 'MODE: dry run\n' : 'MODE: WRITE\n')

  token = await resolveToken(DV_URL)
  if (!token) {
    console.error('No Dataverse token. Run `az login` or set DATAVERSE_TOKEN.')
    process.exit(1)
  }
  await api('GET', 'WhoAmI')

  let created = 0
  // Order matters: a table's parents must be indexed before its refs resolve.
  for (const plan of SEED_PLAN) created += await seedTable(plan)

  console.log(`\nTotal records ${DRY_RUN ? 'that would be created' : 'created'}: ${created}`)
  if (!DRY_RUN) console.log('Autonumber IDs (SH-0001, PLT-0001 …) are assigned by Dataverse.')
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`)
  process.exit(1)
})
