/**
 * Maps the app's table keys (as passed to useRecords) onto Dataverse.
 *
 * Explicit rather than derived: the app's names and Dataverse's do not line up
 * one-to-one — "curve" is bv_pruningcurves, "projections" is bv_availabilities
 * — and a wrong guess would silently read the wrong table.
 *
 * A key absent from this map has no Dataverse table yet and stays on
 * LocalStore, so the app keeps working while tables are migrated one at a time.
 */

export interface DataverseBinding {
  /** dataSource name in power.config.json, e.g. "bv_plants" */
  dataSource: string;
  /** Dataverse primary key column, e.g. "bv_plantid" */
  primaryKey: string;
  /**
   * App field name -> Dataverse column. The app's own names are short and
   * table-local ("code", "name"); Dataverse prefixes everything and spells
   * some differently ("bv_plantcode", "bv_patentnumber"). Without this the
   * rows arrive intact but every cell reads undefined — which renders as a
   * table full of blank rows rather than an error.
   *
   * Fields absent from the map pass through untouched.
   */
  fields?: Record<string, string>;
}

export const DATAVERSE_TABLES: Record<string, DataverseBinding> = {
  plants: {
    dataSource: "bv_plants",
    primaryKey: "bv_plantid",
    fields: {
      code: "bv_plantcode",
      name: "bv_plantname",
      latin: "bv_latinname",
      variety: "bv_variety",
      invoiceName: "bv_invoicename",
      patentNum: "bv_patentnumber",
      active: "bv_isactive",
    },
  },
  shadehouses: {
    dataSource: "bv_shadehouses",
    primaryKey: "bv_shadehouseid",
    fields: {
      name: "bv_shadehousename",
      code: "bv_code",
      location: "bv_location",
      coordinates: "bv_coordinates",
      length: "bv_length",
      width: "bv_width",
      capacity: "bv_capacity",
      active: "bv_isactive",
    },
  },
  fields: { dataSource: "bv_fields", primaryKey: "bv_fieldid" },
  beds: { dataSource: "bv_beds", primaryKey: "bv_bedid" },
  seasons: {
    dataSource: "bv_seasons",
    primaryKey: "bv_seasonid",
    fields: {
      name: "bv_seasonname",
      start: "bv_startdate",
      end: "bv_enddate",
      description: "bv_description",
      active: "bv_isactive",
    },
  },
  inputs: {
    dataSource: "bv_inputs",
    primaryKey: "bv_inputid",
    fields: {
      name: "bv_inputname",
      category: "bv_inputcategory",
      method: "bv_applicationmethod",
      safety: "bv_safetyintervaldays",
      brand: "bv_brand",
      composition: "bv_composition",
    },
  },
  workers: {
    dataSource: "bv_workers",
    primaryKey: "bv_workerid",
    fields: {
      name: "bv_workername",
      code: "bv_workercode",
      role: "bv_role",
      phone: "bv_phone",
      identity: "bv_identitynumber",
      hireDate: "bv_hiredate",
      hourlyRate: "bv_hourlyrate",
      pieceRate: "bv_piecerate",
      active: "bv_isactive",
      notes: "bv_notes",
    },
  },
  suppliers: {
    dataSource: "bv_suppliers",
    primaryKey: "bv_supplierid",
    fields: {
      name: "bv_suppliername",
      code: "bv_suppliercode",
      category: "bv_category",
      contact: "bv_contactname",
      phone: "bv_phone",
      email: "bv_email",
      taxId: "bv_taxid",
      terms: "bv_paymentterms",
      active: "bv_isactive",
      notes: "bv_notes",
    },
  },
  customers: {
    dataSource: "bv_customers",
    primaryKey: "bv_customerid",
    fields: {
      code: "bv_customercode",
      name: "bv_customername",
      contact: "bv_contactname",
      email: "bv_email",
      terms: "bv_paymentterms",
    },
  },
  plantings: { dataSource: "bv_plantings", primaryKey: "bv_plantingid" },
  treatments: { dataSource: "bv_treatments", primaryKey: "bv_treatmentid" },
  irrigation: { dataSource: "bv_irrigations", primaryKey: "bv_irrigationid" },
  harvest: { dataSource: "bv_harvests", primaryKey: "bv_harvestid" },
  tasks: { dataSource: "bv_tasks", primaryKey: "bv_taskid" },
  pruning: { dataSource: "bv_prunings", primaryKey: "bv_pruningid" },
  curve: { dataSource: "bv_pruningcurves", primaryKey: "bv_pruningcurveid" },
  fertilization: { dataSource: "bv_fertilizations", primaryKey: "bv_fertilizationid" },
  projections: { dataSource: "bv_availabilities", primaryKey: "bv_availabilityid" },
  balance: { dataSource: "bv_nutrientbalances", primaryKey: "bv_nutrientbalanceid" },
  soil: { dataSource: "bv_soilanalyses", primaryKey: "bv_soilanalysisid" },
  foliar: { dataSource: "bv_foliaranalyses", primaryKey: "bv_foliaranalysisid" },
  weight: { dataSource: "bv_boxweights", primaryKey: "bv_boxweightid" },
  orders: { dataSource: "bv_orders", primaryKey: "bv_orderid" },
  prices: { dataSource: "bv_plantprices", primaryKey: "bv_plantpriceid" },
  invoices: { dataSource: "bv_invoices", primaryKey: "bv_invoiceid" },
  expenses: { dataSource: "bv_expenses", primaryKey: "bv_expenseid" },
  purchaseOrders: { dataSource: "bv_purchaseorders", primaryKey: "bv_purchaseorderid" },
  timesheets: { dataSource: "bv_timesheets", primaryKey: "bv_timesheetid" },
  fiscal: { dataSource: "bv_fiscalauthorizations", primaryKey: "bv_fiscalauthorizationid" },
};

/**
 * Which bindings are live. Starts as one table so the SDK auth path, the
 * identity mapping and the token flow are proven on a small surface before
 * twenty-nine tables depend on them. Add keys here as each is verified.
 */
export const ENABLED_TABLES = new Set<string>([
  "plants",
  "shadehouses",
  "seasons",
  "inputs",
  "workers",
  "suppliers",
  "customers",
]);

/** Dataverse is only usable when the app has a session — locally that means dev:dv. */
export function dataverseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_DATAVERSE_URL);
}
