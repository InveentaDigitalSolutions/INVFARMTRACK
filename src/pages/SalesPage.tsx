import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Plane,
  Boxes,
  FileText,
  Users,
  Truck,
  Plus,
  ArrowRight,
} from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import MetricTile from "../components/MetricTile";
import RankedBars from "../components/RankedBars";
import ShipmentDetail from "../components/ShipmentDetail";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import { salesSummary } from "../services/salesInsight";
import ExcelImport from "../components/ExcelImport";
import { Upload } from "lucide-react";
import { useInvoiceNumber } from "../hooks/useInvoiceNumber";
import { toGrid, toRecords, weeksIn, type ForecastRecord, type ForecastRow } from "../services/demandForecast";
import type { CustomersRow, OrdersRow, PackingRow, PricesRow, ShipmentsRow } from "../services/rowTypes.generated";
import {
  assembleShipments, matchesShipment, nextStatus,
  SHIPMENT_FLOW, type Shipment,
} from "../services/shipmentModel";

const tabs = [
  { id: "shipments", label: "Shipments" },
  { id: "forecast", label: "Demand Forecast" },
  { id: "orders", label: "Orders" },
  { id: "customers", label: "Customers" },
  { id: "prices", label: "Price List" },
];

const initialShipments: ShipmentsRow[] = [];

const initialOrders: OrdersRow[] = [];

const initialCustomers: CustomersRow[] = [];

const orderStatusOptions = [
  { value: "Draft", label: "Draft" },
  { value: "In Packing", label: "In Packing" },
  { value: "Shipped", label: "Shipped" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
];

const orderFields = [
  { title: "Order Details", columns: 2 as const, fields: [
    { key: "number", label: "Order Number", type: "text" as const, readOnly: true, placeholder: "ORD-0001 (auto)" },
    { key: "customer", label: "Customer", type: "text" as const, required: true },
    { key: "date", label: "Order Date", type: "date" as const, required: true },
    { key: "delivery", label: "Delivery Date", type: "date" as const, required: true },
    { key: "items", label: "# Items", type: "number" as const, min: 1, required: true },
    { key: "total", label: "Total (USD)", type: "text" as const, placeholder: "$0.00" },
    { key: "status", label: "Status", type: "select" as const, options: orderStatusOptions, required: true },
  ]},
];

const termsOptions = [
  { value: "CIF", label: "CIF" }, { value: "FOB", label: "FOB" },
  { value: "EXW", label: "EXW" }, { value: "DDP", label: "DDP" }, { value: "DAP", label: "DAP" },
];

const customerFields = [
  { title: "Customer Details", columns: 2 as const, fields: [
    { key: "code", label: "Customer ID", type: "text" as const, readOnly: true, placeholder: "CUS-0001 (auto)" },
    { key: "name", label: "Company Name", type: "text" as const, required: true, span: 2 as const },
    { key: "contact", label: "Contact Person", type: "text" as const },
    { key: "email", label: "Email", type: "text" as const, placeholder: "name@company.com" },
    { key: "terms", label: "Incoterms", type: "select" as const, options: termsOptions },
  ]},
];

const initPrices: PricesRow[] = [];

/** Customers that can actually be bound to: a nameless row is not a choice. */
const customerOptions = (rows: { name?: string }[]) =>
  rows.filter((c): c is { name: string } => Boolean(c.name)).map((c) => ({ value: c.name, label: c.name }));

/** No fallback list. These names come from the table the lookup points at;
 *  a hand-written stand-in offered workers and varieties that do not exist,
 *  and picking one saved the record with the lookup empty. */
const plantNameOptionsFallback: { value: string; label: string }[] = [];
const priceSeasonOptionsFallback: { value: string; label: string }[] = [];
const priceCustomerOptionsFallback: { value: string; label: string }[] = [];

const priceFields = [
  { title: "Price Details", columns: 2 as const, fields: [
    { key: "plant", label: "Plant", type: "select" as const, options: plantNameOptionsFallback, optionsFrom: "plants", required: true },
    { key: "season", label: "Season", type: "select" as const, options: priceSeasonOptionsFallback, optionsFrom: "seasons", required: true },
    { key: "customer", label: "Customer", type: "select" as const, options: priceCustomerOptionsFallback, optionsFrom: "customers" },
    { key: "priceExt", label: "Price (USD)", type: "text" as const, required: true },
    { key: "priceInt", label: "Price (HNL)", type: "text" as const },
    { key: "from", label: "Valid From", type: "date" as const, required: true },
    { key: "to", label: "Valid To", type: "date" as const, required: true },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

const statusBadge = (s: string) => {
  const v = s === "Paid" || s === "Delivered" || s === "Shipped" ? "green" : s === "Sent" || s === "In Packing" || s === "In Progress" ? "amber" : s === "Overdue" ? "red" : "gray";
  return <Badge variant={v}>{s}</Badge>;
};

export default function SalesPage() {
  const [tab, setTab] = useState(tabs[0].id);
  // Two tables, one screen. The header is a shipment row; each box is a
  // packing row that carries the bed it was cut from.
  const [shipmentRows, setShipmentRows] = useRecords<ShipmentsRow>("shipments", initialShipments);
  const [packingRows, setPackingRows] = useRecords<PackingRow>("packing", []);
  const [activeShipment, setActiveShipment] = useState<string | null>(null);
  const [shipmentQuery, setShipmentQuery] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("");

  const shipments = useMemo(
    () => assembleShipments(shipmentRows as never, packingRows as never),
    [shipmentRows, packingRows]
  );
  const visibleShipments = useMemo(
    () => shipments.filter((s) => matchesShipment(s, shipmentQuery, shipmentStatus)),
    [shipments, shipmentQuery, shipmentStatus]
  );
  const [showImport, setShowImport] = useState(false);
  const [prices, setPrices] = useRecords("prices", initPrices);
  const priceForm = useFormModal(initPrices[0]);
  const priceConfirm = useConfirmDialog();

  const [orders, setOrders] = useRecords("orders", initialOrders);
  const [customers, setCustomers] = useRecords("customers", initialCustomers);
  const orderForm = useFormModal({
    number: "",
    customer: "",
    date: new Date().toISOString().slice(0, 10),
    delivery: new Date().toISOString().slice(0, 10),
    items: 1,
    total: "",
    status: "Draft",
  });
  const customerForm = useFormModal({
    code: "",
    name: "",
    contact: "",
    email: "",
    terms: "CIF",
  });

  const handleOrderSave = (values: Record<string, unknown>) => {
    setOrders((prev) => [values as typeof initialOrders[0], ...prev]);
    orderForm.close();
  };

  const handleCustomerSave = (values: Record<string, unknown>) => {
    setCustomers((prev) => [values as typeof initialCustomers[0], ...prev]);
    customerForm.close();
  };

  const handlePriceSave = (values: Record<string, unknown>) => {
    if (priceForm.isEdit && priceForm.editIndex !== null) {
      const updated = [...prices];
      updated[priceForm.editIndex] = values as any;
      setPrices(updated);
    } else {
      setPrices([...prices, values as any]);
    }
    priceForm.close();
  };

  const handlePriceDelete = () => {
    if (priceConfirm.pending) {
      setPrices(prices.filter((_, i) => i !== priceConfirm.pending!.index));
    }
  };

  // Stored per variety, size and week — the grain everything else asks about.
  // The screen shows it as a grid, so it is converted on the way in and out.
  // It used to live in component state and never reach Dataverse at all,
  // which meant importing a customer's spreadsheet persisted nothing.
  const [forecastRecords, setForecastRecords] = useRecords<ForecastRecord>("demandForecasts", []);
  // Whose forecast is on screen. Defaults to the first customer on file
  // rather than a hardcoded name — the previous default, "The Plant Company,
  // LLC", is not a customer that exists, so a sheet imported under it would
  // have been filed against nobody.
  const [forecastCustomer, setForecastCustomer] = useState("");
  const activeCustomer = forecastCustomer || String((customers[0] as { name?: string })?.name ?? "");
  const forecastData = useMemo(
    () => toGrid(forecastRecords, activeCustomer || undefined),
    [forecastRecords, activeCustomer]
  );
  const forecastWeeks = useMemo(() => weeksIn(forecastData), [forecastData]);
  const { next: nextInvoice, claim: claimInvoiceNumber } = useInvoiceNumber();
  const shipmentForm = useFormModal({
    customer: "",
    invoiceNumber: nextInvoice?.invoiceNumber || "",
    carrier: "DHL",
    awb: "",
    date: new Date().toISOString().slice(0, 10),
  });

  // Put the next free number in the form as it opens, and again if the
  // authorization reloads underneath it.
  useEffect(() => {
    if (shipmentForm.open && !shipmentForm.isEdit && nextInvoice && !nextInvoice.problem) {
      shipmentForm.onChange("invoiceNumber", nextInvoice.invoiceNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentForm.open, nextInvoice?.invoiceNumber]);

  const currentShipment = shipments.find((s) => s.id === activeShipment);

  const handleSaveShipment = (values: Record<string, unknown>) => {
    const invoiceNum = String(values.invoice ?? "");

    // Refuse to ship against an authorization that cannot legally issue a
    // number — an expired or exhausted CAI is not a formatting problem.
    if (!shipmentForm.isEdit && nextInvoice?.problem) {
      alert(nextInvoice.problem);
      return;
    }
    // Record the number as issued before the shipment exists, so it can never
    // be handed to a second invoice.
    if (!shipmentForm.isEdit && invoiceNum) claimInvoiceNumber(invoiceNum);

    // No client-minted id. Dataverse assigns both the key and the SHP- code,
    // and a row carrying an id the store never issued used to be treated as an
    // edit to a record that does not exist — so nothing was written at all.
    const row: Partial<ShipmentsRow> = {
      customer: String(values.customer ?? ""),
      order: values.order ? String(values.order) : undefined,
      invoice: invoiceNum || undefined,
      date: String(values.date ?? ""),
      etd: values.etd ? String(values.etd) : undefined,
      eta: values.eta ? String(values.eta) : undefined,
      carrier: String(values.carrier ?? ""),
      awb: String(values.awb ?? ""),
      status: String(values.status ?? "Draft"),
      notes: String(values.notes ?? ""),
    };

    if (shipmentForm.isEdit && values.id) {
      setShipmentRows((prev) =>
        prev.map((r) => (r.id === values.id ? ({ ...r, ...row } as ShipmentsRow) : r))
      );
    } else {
      setShipmentRows((prev) => [...prev, row as ShipmentsRow]);
    }
    shipmentForm.close();
  };

  const handleDeleteShipment = (s: Shipment) => {
    if (s.boxes.length > 0) {
      alert(`${s.code ?? "This shipment"} still has ${s.boxes.length} boxes packed against it. Remove them first.`);
      return;
    }
    setShipmentRows((prev) => prev.filter((r) => r.id !== s.id));
    if (activeShipment === s.id) setActiveShipment(null);
  };

  const advanceShipment = (s: Shipment) => {
    const to = nextStatus(s.status);
    if (!to) return;
    setShipmentRows((prev) =>
      prev.map((r) => (r.id === s.id ? ({ ...r, status: to } as ShipmentsRow) : r))
    );
  };

  /**
   * The detail screen hands back the whole shipment. Split it: header fields
   * go to the shipment row, boxes to their own packing rows.
   */
  const handleUpdateShipment = (updated: Shipment) => {
    const { boxes, packed, grossWeight, netWeight, unassigned, ...header } = updated;
    void packed; void grossWeight; void netWeight; void unassigned;

    setShipmentRows((prev) =>
      prev.map((r) => (r.id === updated.id ? ({ ...r, ...header } as ShipmentsRow) : r))
    );

    const code = String(updated.code ?? "");
    if (!code) return;
    const mine = new Set(packingRows.filter((p) => String(p.shipment ?? "") === code).map((p) => p.id));
    const kept = boxes.map((b) => ({ ...b, shipment: code } as unknown as PackingRow));
    setPackingRows((prev) => [...prev.filter((p) => !mine.has(p.id)), ...kept]);
  };

  const boxesInProgress = shipments
    .filter((s) => s.status !== "Delivered" && s.status !== "Cancelled")
    .reduce((sum, s) => sum + s.boxes.length, 0);

  /**
   * The order book in five figures. "Active Customers" counted every customer
   * ever created, which only ever goes up; what matters is how much is
   * promised, how late it is, and how much of it rests on one buyer.
   */
  const sales = useMemo(
    () => salesSummary({ orders: orders as never, shipments: shipments as never }),
    [orders, shipments]
  );

  const renderTab = () => {
    if (activeShipment && currentShipment && tab === "shipments") {
      return (
        <ShipmentDetail
          shipment={currentShipment}
          onBack={() => setActiveShipment(null)}
          onUpdate={handleUpdateShipment}
        />
      );
    }

    switch (tab) {
      case "shipments":
        return (
          <div className="space-y-4">
            {/* Filters. The list had none, so a season's shipments could only
                be found by scrolling. */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={shipmentQuery}
                onChange={(e) => setShipmentQuery(e.target.value)}
                placeholder="Search shipment, customer, AWB…"
                className="flex-1 min-w-[220px] text-[12px] px-3 py-2 rounded-lg border border-sand-200
                           bg-white text-navy-800 placeholder:text-navy-300 focus:outline-none
                           focus:border-navy-400"
              />
              <select
                value={shipmentStatus}
                onChange={(e) => setShipmentStatus(e.target.value)}
                className="text-[12px] px-3 py-2 rounded-lg border border-sand-200 bg-white text-navy-700
                           cursor-pointer focus:outline-none"
              >
                <option value="">All statuses</option>
                {[...SHIPMENT_FLOW, "Cancelled"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <button onClick={shipmentForm.openCreate} className="btn-primary text-[12px] px-3 py-2 rounded-lg
                                 inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> New shipment
              </button>
            </div>

            {shipments.length === 0 ? (
              <div className="bg-white rounded-xl border border-sand-200/80 p-10 text-center shadow-sm">
                <p className="text-[13px] text-navy-500">No shipments yet.</p>
                <p className="text-[12px] text-navy-400 mt-1">
                  Create one, then pack boxes against it — each box records the bed it was cut from.
                </p>
              </div>
            ) : visibleShipments.length === 0 ? (
              <p className="text-[12px] text-navy-400 py-8 text-center">
                No shipment matches that filter.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleShipments.map((s) => {
                  const to = nextStatus(s.status);
                  return (
                    <motion.div
                      key={s.id}
                      whileHover={{ y: -2 }}
                      className="bg-white rounded-xl border border-sand-200 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-navy-900 truncate">
                              {s.customer || "No customer"}
                            </p>
                            {statusBadge(s.status ?? "Draft")}
                          </div>
                          <p className="text-xs text-navy-500 truncate">
                            {[s.code, s.invoice, s.awb].filter(Boolean).join(" · ") || "Not yet numbered"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-navy-300 shrink-0">
                          {s.carrier === "DHL" || s.carrier === "FedEx" ? (
                            <Plane className="w-4 h-4" />
                          ) : (
                            <Truck className="w-4 h-4" />
                          )}
                          <span className="text-xs">{s.carrier || "—"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 mb-4">
                        {[
                          { label: "Boxes", value: String(s.boxes.length) },
                          { label: "Cuttings", value: s.packed.toLocaleString() },
                          { label: "Net kg", value: s.netWeight ? String(s.netWeight) : "—" },
                          { label: "Ship date", value: s.date ? String(s.date).slice(5) : "—" },
                        ].map((f) => (
                          <div key={f.label}>
                            <p className="text-[10px] uppercase tracking-wide text-navy-400">{f.label}</p>
                            <p className="text-[14px] font-semibold text-navy-900 tabular-nums">{f.value}</p>
                          </div>
                        ))}
                      </div>

                      {s.unassigned > 0 && (
                        <p className="text-[11px] text-amber-700 mb-3">
                          {s.unassigned} {s.unassigned === 1 ? "box has" : "boxes have"} nobody assigned
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setActiveShipment(s.id)}
                          className="btn-primary text-[11px] px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1"
                        >
                          Open <ArrowRight className="w-3 h-3" />
                        </button>
                        {to && (
                          <button
                            onClick={() => advanceShipment(s)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg border border-sand-200
                                       text-navy-700 hover:bg-sand-50"
                          >
                            Mark {to}
                          </button>
                        )}
                        <button
                          onClick={() => { shipmentForm.openEdit(s as never, 0); }}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg border border-sand-200
                                     text-navy-700 hover:bg-sand-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteShipment(s)}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg border border-sand-200
                                     text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <FormModal
              open={shipmentForm.open}
              onClose={shipmentForm.close}
              title={shipmentForm.isEdit ? "Edit shipment" : "New shipment"}
              subtitle={nextInvoice
                ? `CAI: ${nextInvoice.cai.slice(0, 14)}… · ${nextInvoice.remaining} invoices remaining · Exp. ${nextInvoice.expiry}`
                : "Create a shipment for a customer"}
              groups={[{
                title: "Shipment Details", columns: 2 as const, fields: [
                  { key: "customer", label: "Customer", type: "select" as const,
                    options: customerOptions(customers), optionsFrom: "customers", required: true },
                  { key: "invoice", label: "Invoice Number (CAI)", type: "text" as const,
                    placeholder: "Auto-assigned from CAI range" },
                  { key: "order", label: "Order", type: "select" as const, options: [], optionsFrom: "orders" },
                  { key: "date", label: "Ship Date", type: "date" as const, required: true },
                  { key: "etd", label: "ETD", type: "date" as const },
                  { key: "eta", label: "ETA", type: "date" as const },
                  { key: "carrier", label: "Carrier", type: "select" as const, options: [
                    { value: "DHL", label: "DHL" }, { value: "FedEx", label: "FedEx" },
                    { value: "UPS", label: "UPS" }, { value: "Other", label: "Other" },
                  ]},
                  { key: "awb", label: "AWB / BL Number", type: "text" as const,
                    placeholder: "Air waybill or bill of lading" },
                  { key: "status", label: "Status", type: "select" as const,
                    options: [...SHIPMENT_FLOW, "Cancelled"].map((v) => ({ value: v, label: v })) },
                  { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
                ],
              }]}
              values={shipmentForm.values}
              onChange={shipmentForm.onChange}
              isEdit={shipmentForm.isEdit}
              submitLabel={shipmentForm.isEdit ? "Save" : "Create shipment"}
              onSubmit={handleSaveShipment}
            />
          </div>
        );

      case "forecast":
        return (
          <div className="space-y-4">
            {/* Import button + summary */}
            <div className="flex items-center justify-between">
              <div>
                {/* Customer and weeks come from the records, not a heading
                    typed once: this said "Q2 2026 — The Plant Company · Weeks
                    14–18" whatever was actually loaded. */}
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-navy-900">Demand forecast</h3>
                  <select
                    value={activeCustomer}
                    onChange={(e) => setForecastCustomer(e.target.value)}
                    aria-label="Customer"
                    className="px-2 py-1 text-[12px] rounded-lg border border-sand-200 bg-white
                               text-navy-800 cursor-pointer focus:outline-none
                               focus:ring-2 focus:ring-lime-400/30"
                  >
                    {(customers as { name?: string }[]).map((c) => (
                      <option key={c.name} value={String(c.name)}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[12px] text-navy-400">
                  {forecastData.length} order line{forecastData.length === 1 ? "" : "s"}
                  {forecastWeeks.length > 0 &&
                    ` · weeks ${forecastWeeks[0]}–${forecastWeeks[forecastWeeks.length - 1]}`}
                </p>
              </div>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-navy-900
                           btn-primary rounded-lg cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Import Excel
              </button>
            </div>

            {/* Weekly volume chart */}
            {(() => {
              const weeks = ["wk14", "wk15", "wk16", "wk17", "wk18"] as const;
              const labels = ["Wk 14", "Wk 15", "Wk 16", "Wk 17", "Wk 18"];
              const totals = weeks.map((w) =>
                forecastData.reduce((s, r) => s + ((r[w] as number) || 0), 0),
              );
              const max = Math.max(1, ...totals);
              return (
                <div className="bg-white rounded-xl border border-sand-200/80 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] font-semibold text-navy-700">Weekly Demand</p>
                    <p className="text-[11px] text-navy-400">Stems · {totals.reduce((s, v) => s + v, 0).toLocaleString()} total</p>
                  </div>
                  <div className="flex items-end justify-between gap-2 h-36">
                    {totals.map((v, i) => (
                      <div key={labels[i]} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-mono font-semibold text-navy-700">
                          {v > 0 ? v.toLocaleString() : "—"}
                        </span>
                        <div
                          className="w-full bg-gradient-to-t from-lime-500 to-lime-300 rounded-t-md min-h-[2px] transition-all"
                          style={{ height: `${(v / max) * 100}%` }}
                          title={`${labels[i]}: ${v.toLocaleString()}`}
                        />
                        <span className="text-[10px] font-semibold text-navy-500 uppercase tracking-wide">{labels[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Forecast grid */}
            <div className="bg-white rounded-xl border border-sand-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto" style={{ scrollbarGutter: "stable" }}>
                <table className="text-[12px] w-full" style={{ minWidth: "max-content" }}>
                  <thead>
                    <tr className="bg-sand-50/50 border-b border-sand-100">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-navy-400 uppercase sticky left-0 bg-sand-50/50 z-10">Variety</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-navy-400 uppercase">Size</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-navy-400 uppercase">Type</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase min-w-[80px]">Wk 14</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase min-w-[80px]">Wk 15</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase min-w-[80px]">Wk 16</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase min-w-[80px]">Wk 17</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase min-w-[80px]">Wk 18</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-lime-600 uppercase bg-lime-50/50">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100/80">
                    {forecastData.map((row, i) => (
                      <tr key={i} className="hover:bg-sand-50/50">
                        <td className="px-4 py-2 font-medium text-navy-800 sticky left-0 bg-white z-10">{row.variety as string}</td>
                        <td className="px-3 py-2 text-navy-600">{row.size as string}</td>
                        <td className="px-3 py-2">
                          <Badge variant={(row.type as string) === "Current Order" ? "green" : "amber"}>{row.type as string}</Badge>
                        </td>
                        {["wk14", "wk15", "wk16", "wk17", "wk18"].map((wk) => (
                          <td key={wk} className={`px-3 py-2 text-center font-mono ${
                            (row[wk] as number) > 0 ? "text-navy-800 font-medium" : "text-navy-200"
                          }`}>
                            {(row[wk] as number) > 0 ? (row[wk] as number).toLocaleString() : "—"}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-mono font-bold text-navy-900 bg-lime-50/30">
                          {((row.total as number) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-navy-50/50 border-t-2 border-navy-200">
                      <td colSpan={3} className="px-4 py-2 font-bold text-navy-900 sticky left-0 bg-navy-50/50 z-10">Total</td>
                      {["wk14", "wk15", "wk16", "wk17", "wk18"].map((wk) => (
                        <td key={wk} className="px-3 py-2 text-center font-mono font-bold text-navy-900">
                          {forecastData.reduce((s, r) => s + ((r[wk] as number) || 0), 0).toLocaleString()}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-mono font-bold text-lime-700 bg-lime-50/50">
                        {forecastData.reduce((s, r) => s + ((r.total as number) || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Excel import modal */}
            <AnimatePresence>
              {showImport && (
                <ExcelImport
                  customer={activeCustomer}
                  year={new Date().getFullYear()}
                  onImport={(result) => {
                    // Convert imported rows to flat forecast data
                    const newData = result.rows.map((row) => {
                      const weekData: Record<string, unknown> = {};
                      let total = 0;
                      result.weekNumbers.forEach((wk) => {
                        weekData[`wk${wk}`] = row.weeks[wk] || 0;
                        total += row.weeks[wk] || 0;
                      });
                      return {
                        variety: row.variety,
                        size: row.size,
                        type: row.requestType,
                        ...weekData,
                        total,
                      };
                    });
                    // Replace this customer's lines for the batch, then add
                    // the sheet's. A re-import of a corrected sheet should not
                    // leave the previous version's weeks behind.
                    const customer = result.customer;
                    const year = new Date().getFullYear();
                    const kept = forecastRecords.filter((r) => r.customer !== customer);
                    const added = toRecords(newData as ForecastRow[], {
                      customer,
                      year,
                      batch: result.fileName,
                    }).map((r) => ({ ...r, id: "" }) as ForecastRecord);
                    setForecastRecords([...kept, ...added]);
                  }}
                  onClose={() => setShowImport(false)}
                />
              )}
            </AnimatePresence>
          </div>
        );

      case "orders":
        return (
          <>
            <DataTable
              columns={[
                { key: "number", label: "Order #" },
                { key: "customer", label: "Customer" },
                { key: "date", label: "Date" },
                { key: "delivery", label: "Delivery" },
                { key: "items", label: "Items" },
                { key: "status", label: "Status", render: (r) => statusBadge(r.status as string) },
                { key: "total", label: "Total" },
              ]}
              data={orders}
              onAdd={orderForm.openCreate}
              addLabel="New Order"
              searchPlaceholder="Search orders..."
            />
            <FormModal
              open={orderForm.open}
              onClose={orderForm.close}
              title="New Order"
              subtitle="Create a customer order"
              groups={[{
                ...orderFields[0],
                fields: orderFields[0].fields.map((f) =>
                  f.key === "customer"
                    ? { ...f, type: "select" as const, options: customerOptions(customers) }
                    : f,
                ),
              }]}
              values={orderForm.values}
              onChange={orderForm.onChange}
              submitLabel="Create Order"
              onSubmit={handleOrderSave}
            />
          </>
        );

      case "customers":
        return (
          <>
            <DataTable
              columns={[
                { key: "code", label: "Code" },
                { key: "name", label: "Company" },
                { key: "contact", label: "Contact" },
                { key: "email", label: "Email" },
                { key: "terms", label: "Terms", render: (r) => <Badge variant="gray">{r.terms as string}</Badge> },
              ]}
              data={customers}
              onAdd={customerForm.openCreate}
              addLabel="Add Customer"
              searchPlaceholder="Search customers..."
            />
            <FormModal
              open={customerForm.open}
              onClose={customerForm.close}
              title="New Customer"
              subtitle="Add a new customer to the directory"
              groups={customerFields}
              values={customerForm.values}
              onChange={customerForm.onChange}
              submitLabel="Create Customer"
              onSubmit={handleCustomerSave}
            />
          </>
        );

      case "prices":
        return (
          <>
            <DataTable
              columns={[
                { key: "plant", label: "Plant" },
                { key: "season", label: "Season" },
                { key: "customer", label: "Customer", render: (r) => <Badge variant={r.customer === "Base" ? "gray" : "blue"}>{r.customer as string}</Badge> },
                { key: "priceExt", label: "Export (USD)" },
                { key: "priceInt", label: "Internal (USD)" },
                { key: "from", label: "From" },
                { key: "to", label: "To" },
                { key: "active", label: "Active", render: (r) => (
                  <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Expired"}</Badge>
                )},
              ]}
              data={prices}
              onAdd={priceForm.openCreate}
              onEdit={(row, i) => priceForm.openEdit(row as any, i)}
              onDelete={(row, i) => priceConfirm.requestDelete(row, i)}
              addLabel="Set Price"
              searchPlaceholder="Search prices..."
            />
            <FormModal
              open={priceForm.open}
              onClose={priceForm.close}
              title={priceForm.isEdit ? "Edit Price" : "Set Price"}
              groups={priceFields}
              values={priceForm.values}
              onChange={priceForm.onChange}
              isEdit={priceForm.isEdit}
              onSubmit={handlePriceSave}
            />
            <ConfirmDialog
              open={priceConfirm.open}
              onClose={priceConfirm.close}
              title="Delete Price"
              message="Delete this price entry?"
              onConfirm={handlePriceDelete}
            />
          </>
        );
    }
  };

  return (
    <PageShell title="Sales & Shipping" subtitle="Customers, orders, shipments and packing" icon={ShoppingCart}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-5"
      >
        <MetricTile
          label="Open order book"
          value={sales.openValue ? `$${sales.openValue.toLocaleString()}` : "—"}
          icon={FileText}
          series={sales.valueSeries}
          context={{ label: "orders open", value: String(sales.openOrders) }}
        />
        <MetricTile
          label="Shipped this month"
          value={sales.shippedThisMonth ? `$${sales.shippedThisMonth.toLocaleString()}` : "—"}
          icon={Plane}
          comparison={
            sales.shippedChange === undefined ? undefined : {
              label: "vs last month",
              value: `${sales.shippedChange > 0 ? "+" : ""}${sales.shippedChange}%`,
              direction: sales.shippedChange > 0 ? "up" : sales.shippedChange < 0 ? "down" : "flat",
            }
          }
          tone="good"
        />
        <MetricTile
          label="Past their delivery date"
          value={String(sales.lateOrders)}
          icon={Boxes}
          tone={sales.lateOrders > 0 ? "bad" : "good"}
          context={{ label: "boxes packed, in progress", value: String(boxesInProgress) }}
        />
        <MetricTile
          label="Average order"
          value={sales.averageOrder ? `$${sales.averageOrder.toLocaleString()}` : "—"}
          icon={Users}
          context={{ label: "customers ordering", value: String(sales.customers) }}
        />
        <MetricTile
          label="Largest customer"
          value={sales.topCustomer ?? "—"}
          icon={Users}
          // One buyer carrying most of the book is the risk nobody sees in a
          // list sorted by date.
          tone={sales.topShare >= 60 ? "warn" : "default"}
          context={{ label: "of the open book", value: sales.topShare ? `${sales.topShare}%` : "—" }}
        />
      </motion.div>

      {(sales.byCustomer.length > 0 || sales.byStatus.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
          {sales.byCustomer.length > 0 && (
            <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
              <h4 className="text-[13px] font-semibold text-navy-900">Open value by customer</h4>
              <p className="text-[11px] text-navy-400 mb-4">What is promised and not yet shipped</p>
              <RankedBars rows={sales.byCustomer} format={(v) => `$${v.toLocaleString()}`} />
            </div>
          )}
          {sales.byStatus.length > 0 && (
            <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
              <h4 className="text-[13px] font-semibold text-navy-900">Where the orders sit</h4>
              <p className="text-[11px] text-navy-400 mb-4">Orders at each stage of the pipeline</p>
              <RankedBars rows={sales.byStatus} format={(v) => `${v}`} showAverage={false} />
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <TabBar tabs={tabs} active={tab} onChange={(t) => { setTab(t); setActiveShipment(null); }} />
      </div>

      <motion.div
        key={`${tab}-${activeShipment}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
