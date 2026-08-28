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
  /**
   * The table's primary name column, when no app field already writes to it.
   *
   * Every table here declares its name column ApplicationRequired, which the
   * Web API does not enforce — so a create that omits it succeeds and leaves
   * the record nameless. That is invisible inside this app, which addresses
   * rows by id, and very visible everywhere else: Dataverse views, Advanced
   * Find, and any lookup pointing at the row all display the primary name, so
   * the row shows up blank.
   *
   * Reference tables (plants, customers) already map a `name` field and need
   * nothing here. Transaction tables (a harvest, an irrigation run) have no
   * natural name, so `nameFrom` builds one from the fields that identify the
   * record to a person.
   */
  primaryName?: string;
  /** App fields joined to build `primaryName`; first non-empty values win. */
  nameFrom?: string[];
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
      fieldCapacity: "bv_fieldcapacity",
      active: "bv_isactive",
    },
  },
  fields: {
    dataSource: "bv_fields",
    primaryKey: "bv_fieldid",
    fields: {
      code: "bv_fieldcode",
      name: "bv_fieldname",
      notes: "bv_notes",
      rows: "bv_rowcount",
      shadehouse: "_bv_shadehouseid_value",
    },
  },
  beds: {
    dataSource: "bv_beds",
    primaryKey: "bv_bedid",
    fields: {
      name: "bv_bedname",
      active: "bv_isactive",
      location: "bv_location",
      type: "bv_type",
      level: "bv_level",
      soilType: "bv_soiltype",
      drainage: "bv_drainage",
      irrigationType: "bv_irrigationtype",
      field: "_bv_fieldid_value",
      // Capacity is not a property of the bed: it depends on the variety and
      // grade planted, so it lives in bv_BedCapacity, one row per pairing.
    },
  },
  bedCapacities: {
    dataSource: "bv_bedcapacities",
    primaryKey: "bv_bedcapacityid",
    fields: {
      bed: "_bv_bedid_value",
      plant: "_bv_plantid_value",
      size: "bv_size",
      capacity: "bv_capacity",
      notes: "bv_notes",
    },
    primaryName: "bv_bedcapacityname",
    nameFrom: ["bed", "plant", "size"],
  },
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
  plantings: {
    dataSource: "bv_plantings",
    primaryKey: "bv_plantingid",
    fields: {
      date: "bv_plantingdate", qty: "bv_quantity",
      // Lookup display text arrives via the formatted annotation on the
      // _value column, which DataverseStore unwraps.
      plant: "_bv_plantid_value", bed: "_bv_bedid_value", season: "_bv_seasonid_value",
    },
    primaryName: "bv_plantingdescription",
    nameFrom: ["plant", "bed", "date"],
  },
  treatments: {
    dataSource: "bv_treatments",
    primaryKey: "bv_treatmentid",
    fields: {
      date: "bv_date", type: "bv_type", worker: "bv_worker",
      temp: "bv_temperaturec", humidity: "bv_humidity", ph: "bv_ph",
      bed: "_bv_bedid_value", input: "_bv_inputid_value",
    },
    primaryName: "bv_treatmentname",
    nameFrom: ["bed", "date", "type"],
  },
  irrigation: {
    dataSource: "bv_irrigations",
    primaryKey: "bv_irrigationid",
    fields: {
      date: "bv_date", liters: "bv_amountliters", method: "bv_method",
      bed: "_bv_bedid_value",
    },
    primaryName: "bv_irrigationname",
    nameFrom: ["bed", "date", "method"],
  },
  harvest: {
    dataSource: "bv_harvests",
    primaryKey: "bv_harvestid",
    fields: {
      date: "bv_date", qty: "bv_quantityharvested",
      quality: "bv_quality", worker: "bv_worker", bed: "_bv_bedid_value",
    },
    primaryName: "bv_harvestname",
    nameFrom: ["bed", "date", "quality"],
  },
  tasks: {
    dataSource: "bv_tasks",
    primaryKey: "bv_taskid",
    fields: {
      title: "bv_tasktitle",
      type: "bv_tasktype",
      due: "bv_duedate",
      assigned: "bv_assignedto",
      priority: "bv_priority",
      status: "bv_status",
      notes: "bv_notes",
    },
  },
  pruning: {
    dataSource: "bv_prunings",
    primaryKey: "bv_pruningid",
    fields: {
      date: "bv_date",
      bed: "_bv_bedid_value",
      week: "bv_weeknumber",
      bedsPruned: "bv_bedspruned",
      cuttingsEstimated: "bv_cuttingsestimated",
      worker: "bv_worker",
    },
    primaryName: "bv_pruningname",
    nameFrom: ["bed", "date"],
  },
  curve: {
    dataSource: "bv_pruningcurves",
    primaryKey: "bv_pruningcurveid",
    fields: {
      season: "_bv_seasonid_value",
      week: "bv_weeknumber",
      plannedBeds: "bv_plannedbeds",
      actualBeds: "bv_actualbeds",
      plannedCuttings: "bv_plannedcuttings",
      actualCuttings: "bv_actualcuttings",
    },
    primaryName: "bv_pruningcurvename",
    nameFrom: ["season", "week"],
  },
  fertilization: {
    dataSource: "bv_fertilizations",
    primaryKey: "bv_fertilizationid",
    fields: {
      date: "bv_date",
      bed: "_bv_bedid_value",
      input: "_bv_inputid_value",
      qtyKg: "bv_quantity_kg",
      method: "bv_method",
      worker: "bv_worker",
      // nKg/pKg/kKg/caKg are derived from the input's composition by
      // services/nutrients.ts, not stored here — the standing record of
      // nutrients applied is bv_NutrientBalance.
    },
    primaryName: "bv_fertilizationname",
    nameFrom: ["bed", "input", "date"],
  },
  projections: {
    dataSource: "bv_availabilities",
    primaryKey: "bv_availabilityid",
    fields: {
      plant: "_bv_plantid_value",
      season: "_bv_seasonid_value",
      week: "bv_shipmentweek",
      size: "bv_size",
      projectedQty: "bv_projectedqty",
      orderedQty: "bv_orderedqty",
      confirmedQty: "bv_confirmedqty",
      surplus: "bv_surplusqty",
      shortfall: "bv_shortfallqty",
      status: "bv_status",
    },
    primaryName: "bv_availabilityname",
    nameFrom: ["plant", "size", "week"],
  },
  balance: {
    dataSource: "bv_nutrientbalances",
    primaryKey: "bv_nutrientbalanceid",
    fields: {
      bed: "_bv_bedid_value",
      week: "bv_weeknumber",
      nApplied: "bv_n_applied", pApplied: "bv_p_applied",
      kApplied: "bv_k_applied", caApplied: "bv_ca_applied",
      nExtracted: "bv_n_extracted", pExtracted: "bv_p_extracted",
      kExtracted: "bv_k_extracted", caExtracted: "bv_ca_extracted",
      dryMatterPct: "bv_drymatterpct",
    },
    primaryName: "bv_nutrientbalancename",
    nameFrom: ["bed", "week"],
  },
  soil: {
    dataSource: "bv_soilanalysises",
    primaryKey: "bv_soilanalysisid",
    fields: {
      sampleDate: "bv_sampledate", reportDate: "bv_reportdate",
      lab: "bv_lab", labCode: "bv_labcode", reportNumber: "bv_reportnumber",
      crop: "bv_crop", bed: "_bv_bedid_value", texture: "bv_texture",
      sand: "bv_sand_pct", silt: "bv_silt_pct", clay: "bv_clay_pct",
      ph: "bv_ph", organicCarbon: "bv_organiccarbon_pct",
      organicMatter: "bv_organicmatter_pct", nTotal: "bv_n_total_pct",
      al: "bv_al_cmol", alSaturation: "bv_al_saturation_pct",
      ce: "bv_ce_ds", cl: "bv_cl_mg", cic: "bv_cic",
      ca: "bv_ca_mg", mg: "bv_mg_mg", k: "bv_k_mg", na: "bv_na_mg",
      cice: "bv_cice", caSat: "bv_ca_sat_pct", mgSat: "bv_mg_sat_pct",
      kSat: "bv_k_sat_pct", caMg: "bv_camg_ratio", mgK: "bv_mgk_ratio",
      caK: "bv_cak_ratio", caMgK: "bv_camgk_ratio",
      cu: "bv_cu_mg", fe: "bv_fe_mg", mn: "bv_mn_mg", zn: "bv_zn_mg",
      b: "bv_b_mg", s: "bv_s_mg", p: "bv_p_mg",
    },
    primaryName: "bv_soilanalysisname",
    nameFrom: ["bed", "sampleDate"],
  },
  foliar: {
    dataSource: "bv_foliaranalysises",
    primaryKey: "bv_foliaranalysisid",
    fields: {
      sampleDate: "bv_sampledate", reportDate: "bv_reportdate",
      lab: "bv_lab", labCode: "bv_labcode", crop: "bv_crop",
      bed: "_bv_bedid_value",
      n: "bv_n_pct", p: "bv_p_pct", k: "bv_k_pct",
      ca: "bv_ca_pct", mg: "bv_mg_pct",
      fe: "bv_fe_ppm", zn: "bv_zn_ppm", mn: "bv_mn_ppm",
      cu: "bv_cu_ppm", b: "bv_b_ppm", s: "bv_s_ppm",
    },
    primaryName: "bv_foliaranalysisname",
    nameFrom: ["bed", "sampleDate"],
  },
  weight: {
    dataSource: "bv_boxweights",
    primaryKey: "bv_boxweightid",
    fields: {
      date: "bv_date",
      packingBox: "_bv_packingid_value",
      awb: "bv_awbnumber",
      avgLeafWeight: "bv_avgleafweight_g",
      netWeight: "bv_netweight_kg",
      grossWeight: "bv_grossweight_kg",
      dryMatterPct: "bv_drymatterpct",
      notes: "bv_notes",
    },
    primaryName: "bv_boxweightname",
    nameFrom: ["awb", "date"],
  },
  orders: {
    dataSource: "bv_orders",
    primaryKey: "bv_orderid",
    fields: {
      number: "bv_ordernumber",
      customer: "_bv_customerid_value",
      date: "bv_orderdate",
      delivery: "bv_requesteddeliverydate",
      status: "bv_status",
      total: "bv_totalamount",
      // `items` is a line count. Lines live in bv_OrderItem, which the app
      // does not read yet, so the number is app-only and does not persist.
    },
  },
  prices: {
    dataSource: "bv_plantprices",
    primaryKey: "bv_plantpriceid",
    fields: {
      plant: "_bv_plantid_value",
      season: "_bv_seasonid_value",
      customer: "_bv_customerid_value",
      priceExt: "bv_priceext",
      priceInt: "bv_priceint",
      from: "bv_effectivefrom",
      to: "bv_effectiveto",
      active: "bv_isactive",
    },
    primaryName: "bv_plantpricename",
    nameFrom: ["plant", "customer", "from"],
  },
  invoices: {
    dataSource: "bv_invoices",
    primaryKey: "bv_invoiceid",
    fields: {
      number: "bv_invoicenumber",
      customer: "_bv_customerid_value",
      date: "bv_invoicedate",
      dueDate: "bv_duedate",
      week: "bv_weeknumber",
      subtotal: "bv_subtotal",
      // The app carries one ISV figure; Dataverse separates the 15% and 18%
      // bands. Honduras applies 15% to this business, so the app's `isv`
      // maps to the 15% column and bv_isv18 stays unused for now.
      isv: "bv_isv15",
      total: "bv_totalamount",
      balance: "bv_balance",
      status: "bv_status",
      // `currency` has no column — bv_Invoice models value in the invoice
      // currency plus bv_exchangerate and bv_totalamounthnl. Wiring that up
      // is Phase 2; until then the currency is app-only.
    },
  },
  expenses: {
    dataSource: "bv_expenses",
    primaryKey: "bv_expenseid",
    fields: {
      name: "bv_expensename",
      date: "bv_date",
      category: "bv_category",
      amount: "bv_amount",
      currency: "bv_currency",
      vendor: "bv_vendor",
      status: "bv_status",
      notes: "bv_notes",
      // `bankAccount` has no column — bank accounts are not modelled yet.
    },
  },
  purchaseOrders: {
    dataSource: "bv_purchaseorders",
    primaryKey: "bv_purchaseorderid",
    fields: {
      number: "bv_ponumber",
      supplier: "_bv_supplierid_value",
      date: "bv_orderdate",
      delivery: "bv_expecteddelivery",
      description: "bv_description",
      amount: "bv_amount",
      currency: "bv_currency",
      status: "bv_status",
      notes: "bv_notes",
    },
  },
  // ---- Accounting, added 2026-08-28 --------------------------------------
  bankAccounts: {
    dataSource: "bv_bankaccounts",
    primaryKey: "bv_bankaccountid",
    fields: {
      code: "bv_bankaccountcode",
      name: "bv_bankaccountname",
      bank: "bv_bank",
      accountNumber: "bv_accountnumber",
      currency: "bv_currency",
      openingBalance: "bv_openingbalance",
      active: "bv_isactive",
      notes: "bv_notes",
    },
  },
  payments: {
    dataSource: "bv_payments",
    primaryKey: "bv_paymentid",
    fields: {
      code: "bv_paymentcode",
      type: "bv_type",
      date: "bv_date",
      counterparty: "bv_counterparty",
      amount: "bv_amount",
      currency: "bv_currency",
      reference: "bv_reference",
      method: "bv_method",
      status: "bv_status",
      notes: "bv_notes",
      bankAccount: "_bv_bankaccountid_value",
      invoice: "_bv_invoiceid_value",
    },
  },
  bills: {
    dataSource: "bv_bills",
    primaryKey: "bv_billid",
    fields: {
      number: "bv_billnumber",
      poRef: "bv_poref",
      rtn: "bv_rtn",
      date: "bv_date",
      dueDate: "bv_duedate",
      subtotal: "bv_subtotal",
      isv: "bv_isv",
      total: "bv_totalamount",
      paid: "bv_paidamount",
      balance: "bv_balance",
      currency: "bv_currency",
      status: "bv_status",
      notes: "bv_notes",
      supplier: "_bv_supplierid_value",
      purchaseOrder: "_bv_purchaseorderid_value",
    },
  },
  statements: {
    dataSource: "bv_bankstatementlines",
    primaryKey: "bv_bankstatementlineid",
    fields: {
      code: "bv_bankstatementlinecode",
      date: "bv_date",
      description: "bv_description",
      amount: "bv_amount",
      balance: "bv_runningbalance",
      reconciled: "bv_isreconciled",
      notes: "bv_notes",
      bankAccount: "_bv_bankaccountid_value",
      matchedTo: "_bv_paymentid_value",
    },
  },

  exchangeRates: {
    dataSource: "bv_exchangerates",
    primaryKey: "bv_exchangerateid",
    fields: {
      code: "bv_exchangeratecode",
      date: "bv_ratedate",
      value: "bv_value",
      source: "bv_source",
      notes: "bv_notes",
    },
  },
  caiNumbers: {
    dataSource: "bv_cainumbers",
    primaryKey: "bv_cainumberid",
    fields: {
      name: "bv_cainumbername",
      sequence: "bv_sequencenumber",
      used: "bv_isused",
      usedDate: "bv_useddate",
      notes: "bv_notes",
      fiscalAuth: "_bv_fiscalauthid_value",
      invoice: "_bv_invoiceid_value",
    },
  },

  // ---- Bed substrate composition -----------------------------------------
  substrateMaterials: {
    dataSource: "bv_substratematerials",
    primaryKey: "bv_substratematerialid",
    fields: {
      name: "bv_substratematerialname",
      category: "bv_category",
      waterRetention: "bv_waterretention",
      active: "bv_isactive",
      notes: "bv_notes",
    },
  },
  bedCompositions: {
    dataSource: "bv_bedcompositions",
    primaryKey: "bv_bedcompositionid",
    fields: {
      bed: "_bv_bedid_value",
      material: "_bv_substratematerialid_value",
      percentage: "bv_percentage",
      notes: "bv_notes",
    },
    primaryName: "bv_bedcompositionname",
    nameFrom: ["bed", "material"],
  },

  timesheets: {
    dataSource: "bv_timesheets",
    primaryKey: "bv_timesheetid",
    fields: {
      date: "bv_date", activity: "bv_activitytype", hours: "bv_hoursworked",
      pieces: "bv_piececount", boxes: "bv_boxespacked", cost: "bv_laborcost",
      notes: "bv_notes", worker: "_bv_workerid_value", bed: "_bv_bedid_value",
    },
    primaryName: "bv_timesheetname",
    nameFrom: ["worker", "date", "activity"],
  },
  fiscal: {
    dataSource: "bv_fiscalauthorizations",
    primaryKey: "bv_fiscalauthorizationid",
    fields: {
      name: "bv_fiscalauthname",
      cai: "bv_cai",
      rtn: "bv_rtn",
      rangeStart: "bv_rangestart",
      rangeEnd: "bv_rangeend",
      expiry: "bv_expirationdate",
      total: "bv_totalauthorized",
      next: "bv_nextnumber",
      requestDate: "bv_requestdate",
      active: "bv_isactive",
    },
  },
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
  "fields",
  "beds",
  "plantings",
  "irrigation",
  "treatments",
  "harvest",
  "timesheets",
  // Batch 1 — commercial. Enabled 2026-08-28.
  "orders",
  "prices",
  "invoices",
  "fiscal",
  "expenses",
  "purchaseOrders",
  "weight",
  // Batch 2 — agronomy. Enabled 2026-08-28.
  "pruning",
  "curve",
  "fertilization",
  "soil",
  "foliar",
  "balance",
  // Batch 3 — planning. Enabled 2026-08-28.
  "tasks",
  "projections",
  // Phase 2 — accounting and bed composition. Enabled 2026-08-28.
  "bankAccounts",
  "payments",
  "bills",
  "statements",
  "substrateMaterials",
  "bedCompositions",
  "caiNumbers",
  "exchangeRates",
  "bedCapacities",
]);

/**
 * Which hosting model this build is running under.
 *
 * "player"     — inside the Power Apps host, which supplies the Dataverse
 *                session. Sandboxed: no WebGL workers, no outbound fetch.
 * "standalone" — hosted on Azure, signing in with MSAL and calling the
 *                Dataverse Web API directly. No sandbox.
 * "demo"       — neither is configured; everything stays on LocalStore.
 */
export type HostingMode = "player" | "standalone" | "demo";

export function hostingMode(): HostingMode {
  if (import.meta.env.VITE_ENTRA_CLIENT_ID && import.meta.env.VITE_ENTRA_TENANT_ID) {
    return "standalone";
  }
  if (import.meta.env.VITE_DATAVERSE_URL) return "player";
  return "demo";
}

/** Dataverse is only usable when the app has a session of some kind. */
export function dataverseConfigured(): boolean {
  return hostingMode() !== "demo";
}
