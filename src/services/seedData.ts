/**
 * Seed data for all tables — used for local development and demos.
 * Based on real Broton Verde / AGRIGENTUM data.
 */

// ===================== INFRASTRUCTURE =====================

export const seedShadehouses = [
  { id: "sh-1", name: "Shadehouse 1", code: "SH-1", location: "El Olvido, Santa Cruz de Yojoa", coordinates: "14.9700, -87.8500", length: 80, width: 80, capacity: 120, active: true },
];

export const seedFields = [
  { id: "fl-E3", code: "E3", shadehouse: "Shadehouse 1", season: "2026-S1", position: "NW — 33 beds × 1.20m", notes: "" },
  { id: "fl-C3", code: "C3", shadehouse: "Shadehouse 1", season: "2026-S1", position: "NE — 27 beds × 1.80m", notes: "" },
  { id: "fl-E1", code: "E1", shadehouse: "Shadehouse 1", season: "2026-S1", position: "SW — 33 beds × 1.20m", notes: "" },
  { id: "fl-C1", code: "C1", shadehouse: "Shadehouse 1", season: "2026-S1", position: "SE — 27 beds × 1.80m", notes: "" },
];

// ===================== PLANT CATALOG =====================

export const seedPlants = [
  { id: "pl-1", code: "PTH-HW", name: "Pothos", latin: "Epipremnum aureum", variety: "Hawaiian", invoiceName: "Pothos / Hawaiian", patent: "Yes", patentNum: "PP32456", active: true },
  { id: "pl-2", code: "PTH-HC", name: "Pothos", latin: "Epipremnum aureum", variety: "High Color", invoiceName: "Pothos / High Color", patent: "No", patentNum: "", active: true },
  { id: "pl-3", code: "PTH-NJ", name: "Pothos", latin: "Epipremnum aureum", variety: "N'Joy", invoiceName: "Pothos / N'Joy", patent: "Yes", patentNum: "PP33012", active: true },
  { id: "pl-4", code: "PTH-NE", name: "Pothos", latin: "Epipremnum aureum", variety: "Neon", invoiceName: "Pothos / Neon", patent: "No", patentNum: "", active: true },
  { id: "pl-5", code: "PTH-JD", name: "Pothos", latin: "Epipremnum aureum", variety: "Jade", invoiceName: "Pothos / Jade", patent: "No", patentNum: "", active: true },
  { id: "pl-6", code: "PTH-MQ", name: "Pothos", latin: "Epipremnum aureum", variety: "Marble Queen", invoiceName: "Pothos / Marble Queen", patent: "No", patentNum: "", active: true },
  { id: "pl-7", code: "PTH-GG", name: "Pothos", latin: "Epipremnum aureum", variety: "Golden Glen", invoiceName: "Pothos / Golden Glen", patent: "No", patentNum: "", active: true },
  { id: "pl-8", code: "SNS-SN", name: "Sansevieria", latin: "Dracaena trifasciata", variety: "Sansevieria", invoiceName: "Sansevieria / Sansevieria", patent: "No", patentNum: "", active: true },
];

export const seedSeasons = [
  { id: "se-1", name: "2026-S1", start: "2026-01-01", end: "2026-06-30", description: "First season 2026 — peak demand May-July", active: true },
  { id: "se-2", name: "2025-S2", start: "2025-07-01", end: "2025-12-31", description: "Second season 2025", active: false },
];

export const seedInputs = [
  { id: "in-1", name: "Neem Oil", category: "Pesticide", method: "Foliar Spray", safety: "7", brand: "BioGrow", composition: "Azadirachtin 0.3%", nPct: 0, pPct: 0, kPct: 0, caPct: 0 },
  { id: "in-2", name: "Copper Fungicide", category: "Fungicide", method: "Soil Drench", safety: "14", brand: "CupraSol", composition: "Copper hydroxide 77%", nPct: 0, pPct: 0, kPct: 0, caPct: 0 },
  { id: "in-3", name: "NPK 20-20-20", category: "Fertilizer", method: "Drip", safety: "", brand: "NutriMax", composition: "N-P-K balanced", nPct: 20, pPct: 20, kPct: 20, caPct: 0 },
  { id: "in-4", name: "Calcium Nitrate", category: "Fertilizer", method: "Drip", safety: "", brand: "YaraLiva", composition: "Ca(NO3)2", nPct: 15.5, pPct: 0, kPct: 0, caPct: 19 },
  { id: "in-5", name: "MKP (Mono-Potassium Phosphate)", category: "Fertilizer", method: "Foliar Spray", safety: "", brand: "Haifa", composition: "KH2PO4", nPct: 0, pPct: 52, kPct: 34, caPct: 0 },
];

export const seedPrices = [
  { id: "pr-1", plant: "Pothos / Hawaiian", season: "2026-S1", customer: "Base", priceExt: "0.020", priceInt: "0.015", from: "2026-01-01", to: "2026-12-31", active: true },
  { id: "pr-2", plant: "Pothos / High Color", season: "2026-S1", customer: "Base", priceExt: "0.020", priceInt: "0.015", from: "2026-01-01", to: "2026-12-31", active: true },
  { id: "pr-3", plant: "Pothos / N'Joy", season: "2026-S1", customer: "Base", priceExt: "0.022", priceInt: "0.017", from: "2026-01-01", to: "2026-12-31", active: true },
  { id: "pr-4", plant: "Pothos / Neon", season: "2026-S1", customer: "Base", priceExt: "0.020", priceInt: "0.015", from: "2026-01-01", to: "2026-12-31", active: true },
  { id: "pr-5", plant: "Pothos / Jade", season: "2026-S1", customer: "Base", priceExt: "0.018", priceInt: "0.013", from: "2026-01-01", to: "2026-12-31", active: true },
  { id: "pr-6", plant: "Pothos / Marble Queen", season: "2026-S1", customer: "Base", priceExt: "0.020", priceInt: "0.015", from: "2026-01-01", to: "2026-12-31", active: true },
  { id: "pr-7", plant: "Pothos / Golden Glen", season: "2026-S1", customer: "Base", priceExt: "0.020", priceInt: "0.015", from: "2026-01-01", to: "2026-12-31", active: true },
  { id: "pr-8", plant: "Sansevieria / Sansevieria", season: "2026-S1", customer: "Base", priceExt: "0.035", priceInt: "0.028", from: "2026-01-01", to: "2026-12-31", active: true },
  { id: "pr-9", plant: "Pothos / Hawaiian", season: "2026-S1", customer: "The Plant Company", priceExt: "0.019", priceInt: "—", from: "2026-04-01", to: "2026-06-30", active: true },
];

// ===================== COMMERCIAL =====================

export const seedCustomers = [
  { id: "cu-1", code: "VA24477", name: "The Plant Company, LLC", contact: "Frank Paul", email: "frank@theplantcompany.com", phone: "+1(440) 458 0177", address: "3038 Stuarts Draft Highway\nStuarts Draft, VA 24477, USA", taxId: "85-1008901", deliverToName: "The Plant Company, LLC", deliverToAddress: "3038 Stuarts Draft Highway\nStuarts Draft, VA 24477, USA", terms: "CIF", active: true, notes: "" },
  { id: "cu-2", code: "FL33101", name: "Green Gardens Inc.", contact: "Sarah Kim", email: "sarah@greengardens.com", phone: "+1(305) 555 1234", address: "1200 NW 78th Ave\nMiami, FL 33126, USA", taxId: "65-4321098", deliverToName: "", deliverToAddress: "", terms: "FOB", active: true, notes: "" },
];

// ===================== WORKERS =====================

export const seedWorkers = [
  { id: "wk-1", name: "Carlos Martinez", code: "W001", role: "Harvester", phone: "+504 9812 1001", identity: "0801-1990-12345", hireDate: "2024-03-15", hourlyRate: 45, pieceRate: 15, active: true, notes: "" },
  { id: "wk-2", name: "Maria Lopez", code: "W002", role: "Packer", phone: "+504 9812 1002", identity: "0801-1992-23456", hireDate: "2024-06-01", hourlyRate: 42, pieceRate: 12, active: true, notes: "" },
  { id: "wk-3", name: "Juan Perez", code: "W003", role: "Field Worker", phone: "+504 9812 1003", identity: "0801-1988-34567", hireDate: "2023-01-10", hourlyRate: 40, pieceRate: 14, active: true, notes: "Also handles irrigation" },
  { id: "wk-4", name: "Ana Rodriguez", code: "W004", role: "Packer", phone: "+504 9812 1004", identity: "0801-1995-45678", hireDate: "2025-01-15", hourlyRate: 42, pieceRate: 12, active: true, notes: "" },
  { id: "wk-5", name: "Pedro Hernandez", code: "W005", role: "Irrigator", phone: "+504 9812 1005", identity: "0801-1991-56789", hireDate: "2024-09-01", hourlyRate: 43, pieceRate: 0, active: true, notes: "Irrigation specialist" },
];

// ===================== SUPPLIERS =====================

export const seedSuppliers = [
  { id: "su-1", name: "AgroSupply HN", code: "SUP-001", category: "Chemicals / Inputs", contact: "Roberto Mendez", phone: "+504 9812 3456", email: "roberto@agrosupply.hn", taxId: "08019012345678", terms: "Net 30", active: true, notes: "" },
  { id: "su-2", name: "DHL Express", code: "SUP-002", category: "Logistics / Freight", contact: "Ana Torres", phone: "+504 2231 4567", email: "ana.torres@dhl.com", taxId: "", terms: "Cash", active: true, notes: "Primary carrier for USA shipments" },
  { id: "su-3", name: "TecniAgua", code: "SUP-003", category: "Maintenance", contact: "Mario Reyes", phone: "+504 9745 6789", email: "info@tecniagua.hn", taxId: "05019087654321", terms: "Net 15", active: true, notes: "Irrigation system maintenance" },
  { id: "su-4", name: "NutriMax Honduras", code: "SUP-004", category: "Chemicals / Inputs", contact: "Laura Gomez", phone: "+504 9923 4567", email: "ventas@nutrimax.hn", taxId: "08019098765432", terms: "Net 30", active: true, notes: "NPK fertilizers" },
  { id: "su-5", name: "PackBox Central", code: "SUP-005", category: "Packaging", contact: "Carlos Mejia", phone: "+504 9634 5678", email: "carlos@packbox.hn", taxId: "", terms: "Cash", active: true, notes: "Cardboard boxes and packaging materials" },
];

// ===================== FISCAL =====================

export const seedFiscalAuth = [
  { id: "fa-1", name: "CAI 2026", cai: "4ED113-4AB1C5-B6B9E0-63BE03-090919-95", rtn: "05019011379855", rangeStart: "000-001-01-00001461", rangeEnd: "000-001-01-00001530", expiry: "2027-04-06", total: 70, next: 1462, requestDate: "2026-04-06", active: true },
];
