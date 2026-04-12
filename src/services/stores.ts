/**
 * Store Registry — centralized access to all data stores.
 * Each store is a singleton that persists to localStorage.
 */

import { LocalStore } from "./DataService";
import {
  seedShadehouses, seedFields, seedPlants, seedSeasons, seedInputs,
  seedPrices, seedCustomers, seedWorkers, seedSuppliers, seedFiscalAuth,
} from "./seedData";

// Create singleton stores — initialized once with seed data
export const stores = {
  shadehouses: new LocalStore("shadehouses", seedShadehouses),
  fields: new LocalStore("fields", seedFields),
  plants: new LocalStore("plants", seedPlants),
  seasons: new LocalStore("seasons", seedSeasons),
  inputs: new LocalStore("inputs", seedInputs),
  prices: new LocalStore("prices", seedPrices),
  customers: new LocalStore("customers", seedCustomers),
  workers: new LocalStore("workers", seedWorkers),
  suppliers: new LocalStore("suppliers", seedSuppliers),
  fiscalAuth: new LocalStore("fiscalAuth", seedFiscalAuth),
  // Transactional tables — start empty, populated by user actions
  plantings: new LocalStore("plantings", []),
  treatments: new LocalStore("treatments", []),
  irrigation: new LocalStore("irrigation", []),
  harvest: new LocalStore("harvest", []),
  tasks: new LocalStore("tasks", []),
  pruning: new LocalStore("pruning", []),
  fertilization: new LocalStore("fertilization", []),
  pruningCurve: new LocalStore("pruningCurve", []),
  availability: new LocalStore("availability", []),
  orders: new LocalStore("orders", []),
  shipments: new LocalStore("shipments", []),
  packing: new LocalStore("packing", []),
  invoices: new LocalStore("invoices", []),
  caiNumbers: new LocalStore("caiNumbers", []),
  expenses: new LocalStore("expenses", []),
  purchaseOrders: new LocalStore("purchaseOrders", []),
  timesheets: new LocalStore("timesheets", []),
  beds: new LocalStore("beds", []),
};

export type StoreKey = keyof typeof stores;
