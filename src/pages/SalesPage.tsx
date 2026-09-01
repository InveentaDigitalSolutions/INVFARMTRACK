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
import { useFormModal, useConfirmDialog, withEdited, withoutPending } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import { salesSummary } from "../services/salesInsight";
import ExcelImport from "../components/ExcelImport";
import { Upload } from "lucide-react";
import { useInvoiceNumber } from "../hooks/useInvoiceNumber";
import { COUNTRIES } from "../services/countries.generated";
import { countryFor } from "../services/tariff";
import { closuresInWeek, type HolidayRow } from "../services/workingDays";
import { portDistanceKm, type PortRow } from "../services/portPicker";
import { formatKm } from "../services/geo";
import { toGrid, toRecords, weeksIn, type ForecastRecord, type ForecastRow } from "../services/demandForecast";
import type { CustomersRow, OrdersRow, PackingRow, ShipmentsRow } from "../services/rowTypes.generated";
import {
  assembleShipments, matchesShipment, nextStatus,
  SHIPMENT_FLOW, type Shipment,
} from "../services/shipmentModel";

const tabs = [
  { id: "shipments", label: "Shipments" },
  // One module, not two. A demand forecast and an order are the same thing at
  // this nursery — a customer asking for so many cuttings of a variety in a
  // given week — and keeping them apart meant an empty Orders tab beside a
  // book of a million cuttings. The bv_Order table stays for the invoicing
  // chain to hang off; nobody types into it.
  { id: "forecast", label: "Orders" },
  { id: "customers", label: "Customers" },
  // Both sit here because price is keyed on the destination and this is where
  // prices are kept. They are one table — a place goods can be delivered to —
  // but nobody thinks about them together: everything flies today, and a list
  // that mixes 3,348 harbours into the airport you are looking for is no list.
  { id: "ports", label: "Seaports" },
  { id: "airports", label: "Airports" },
];

const initialShipments: ShipmentsRow[] = [];

const initialOrders: OrdersRow[] = [];

const initialCustomers: CustomersRow[] = [];

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
    { key: "contactEmail", label: "Invoicing Email", type: "text" as const, placeholder: "invoices@company.com" },
    { key: "phone", label: "Phone", type: "text" as const },
    { key: "terms", label: "Incoterms", type: "select" as const, options: termsOptions },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
  // The invoice prints these. Without them it has to leave the buying party's
  // address and tax id blank.
  { title: "Billing", columns: 2 as const, fields: [
    { key: "taxId", label: "Tax ID / RTN", type: "text" as const },
    // Picked from the ISO list rather than typed: it decides the currency on
    // their paperwork and which public holidays shut their customs hall, and
    // neither works on "Netherland".
    { key: "country", label: "Country", type: "select" as const, searchable: true,
      options: COUNTRIES.map((c) => ({ value: c.name, label: `${c.name} (${c.code})` })),
      below: (v: Record<string, unknown>) => {
        const found = countryFor(v.country);
        return found?.currency
          ? <p className="mt-1 text-[11px] text-navy-400">Trades in {found.currency}</p>
          : null;
      } },
    { key: "address", label: "Billing Address", type: "textarea" as const, span: 2 as const },
    { key: "deliverToName", label: "Deliver To", type: "text" as const },
    { key: "deliverToAddress", label: "Delivery Address", type: "textarea" as const, span: 2 as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const initPorts: Record<string, unknown>[] = [];

/** Customers that can actually be bound to: a nameless row is not a choice. */
const customerOptions = (rows: { name?: string }[]) =>
  rows.filter((c): c is { name: string } => Boolean(c.name)).map((c) => ({ value: c.name, label: c.name }));

/** No fallback list. These names come from the table the lookup points at;
 *  a hand-written stand-in offered workers and varieties that do not exist,
 *  and picking one saved the record with the lookup empty. */

/**
 * A price is keyed on more than the variety.
 *
 * Customer, port and product all move it — the freight differs by port, and
 * only L&E is sold today but E, Bulbs and Tips are coming. Any of them may be
 * left blank, meaning "any", so a general figure can be set once and overridden
 * where something was actually negotiated. The most specific row wins.
 */
const portFields = [
  { title: "Port", columns: 2 as const, fields: [
    { key: "code", label: "Port ID", type: "text" as const, readOnly: true, placeholder: "PRT-001 (auto)" },
    { key: "kind", label: "Kind", type: "toggle" as const, options: [
      { value: "Airport", label: "Airport" },
      { value: "Seaport", label: "Seaport" },
    ] },
    { key: "name", label: "Name", type: "text" as const, required: true,
      placeholder: "MIA · Miami International Airport, United States" },
    // What the airway bill carries, and what people search by.
    { key: "locator", label: "IATA / LOCODE", type: "text" as const, placeholder: "MIA, NLRTM" },
    { key: "country", label: "Country", type: "select" as const, searchable: true,
      options: COUNTRIES.map((c) => ({ value: c.name, label: `${c.name} (${c.code})` })) },
    { key: "latitude", label: "Latitude", type: "text" as const, placeholder: "25.7932" },
    { key: "longitude", label: "Longitude", type: "text" as const, placeholder: "-80.2906" },
    { key: "active", label: "Shipping there", type: "boolean" as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const, rows: 2 },
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
  const customerForm = useFormModal(initialCustomers[0]);
  const portForm = useFormModal(initPorts[0]);
  const portConfirm = useConfirmDialog();
  const customerConfirm = useConfirmDialog();
  const [ports, setPorts] = useRecords("ports", initPorts);

  // Kept for the open-orders KPI and the packing screen's lookup; the book
  // itself lives in the forecast records now.
  const [orders] = useRecords("orders", initialOrders);
  const [forecastYear, setForecastYear] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [customers, setCustomers] = useRecords("customers", initialCustomers);
  const [holidays] = useRecords<HolidayRow>("holidays", []);

  const handleCustomerSave = (values: Record<string, unknown>) => {
    if (customerForm.isEdit) {
      setCustomers(withEdited(customers, customerForm, values) as typeof initialCustomers);
    } else {
      setCustomers((prev) => [values as typeof initialCustomers[0], ...prev]);
    }
    customerForm.close();
  };

  const handlePortSave = (values: Record<string, unknown>) => {
    if (portForm.isEdit) {
      setPorts(withEdited(ports, portForm, values) as never[]);
    } else {
      setPorts([...ports, values as never]);
    }
    portForm.close();
  };

  const handlePortDelete = () => {
    if (portConfirm.pending) {
      setPorts(ports.filter((_, i) => i !== portConfirm.pending!.index));
    }
    portConfirm.close();
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

  /**
   * Which year's book is on screen.
   *
   * Week numbers repeat, so a grid that ignores the year adds 2026 week 38 to
   * 2027 week 38 and shows a number nobody ordered.
   */
  const forecastYears = useMemo(
    () => [...new Set(forecastRecords.map((r) => r.year).filter(Boolean) as number[])].sort(),
    [forecastRecords]
  );
  const activeYear = forecastYear || forecastYears[0] || new Date().getFullYear();
  const yearRecords = useMemo(
    () => forecastRecords.filter((r) => r.year === activeYear),
    [forecastRecords, activeYear]
  );
  const forecastData = useMemo(
    () => toGrid(yearRecords, activeCustomer || undefined),
    [yearRecords, activeCustomer]
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

  /**
   * Deleting a shipment takes its boxes with it.
   *
   * It used to refuse, through a browser alert, and tell you to remove ten
   * boxes first — with no way offered to do that. A packed box has no meaning
   * without the shipment it was packed for, so the honest options are "delete
   * both" or "don't", and the dialog says how many are going.
   *
   * The boxes must be gone from Dataverse, not merely from React state,
   * before the shipment is attempted: the relationship is cascade-restrict, so
   * a shipment deleted in the same breath is refused and quietly comes back.
   */
  const [shipmentToDelete, setShipmentToDelete] = useState<Shipment | null>(null);

  const handleDeleteShipment = (s: Shipment) => setShipmentToDelete(s);

  const deleteShipmentAndBoxes = async (s: Shipment) => {
    setShipmentToDelete(null);
    if (s.boxes.length > 0) {
      const doomed = new Set(s.boxes.map((b) => b.id));
      await setPackingRows((prev) => prev.filter((r) => !doomed.has(r.id)));
    }
    await setShipmentRows((prev) => prev.filter((r) => r.id !== s.id));
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
                  <select
                    value={String(activeYear)}
                    onChange={(e) => setForecastYear(Number(e.target.value))}
                    aria-label="Year"
                    className="px-2 py-1 text-[12px] rounded-lg border border-sand-200 bg-white
                               text-navy-800 cursor-pointer focus:outline-none
                               focus:ring-2 focus:ring-lime-400/30"
                  >
                    {(forecastYears.length ? forecastYears : [activeYear]).map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[12px] text-navy-400">
                  {forecastData.length} order line{forecastData.length === 1 ? "" : "s"}
                  {forecastWeeks.length > 0 &&
                    ` · weeks ${forecastWeeks[0]}–${forecastWeeks[forecastWeeks.length - 1]}`}
                  {` · ${forecastData
                    .reduce((sum, r) => sum + ((r.total as number) || 0), 0)
                    .toLocaleString()} cuttings`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* A customer cannot be removed while its lines point at it, so
                    the lines have to be removable from where they are read. */}
                <button
                  onClick={() => setConfirmClear(true)}
                  disabled={forecastData.length === 0}
                  className="px-3 py-2 text-[12px] font-medium rounded-lg border border-red-200
                             text-red-600 hover:bg-red-50 disabled:opacity-40
                             disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Delete {activeYear} lines
                </button>
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-navy-900
                             btn-primary rounded-lg cursor-pointer shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Import Excel
                </button>
              </div>
            </div>

            {/* Weekly volume chart */}
            {(() => {
              // The columns were fixed at weeks 14–18 whatever was loaded, so
              // a book running weeks 8 to 44 showed five empty columns and
              // read as "no data".
              const weeks = forecastWeeks.map((w) => `wk${w}`);
              const labels = forecastWeeks.map((w) => `Wk ${w}`);
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
                      {forecastWeeks.map((w) => {
                        // A week with a holiday in it is a week with fewer
                        // working days, and the person promising it should see
                        // that while they are looking at the number.
                        const shut = closuresInWeek(
                          holidays, activeYear, w,
                          (customers.find((c) => String((c as { name?: string }).name) === activeCustomer) as
                            { country?: string } | undefined)?.country
                        );
                        return (
                          <th
                            key={w}
                            title={shut.length ? shut.map((c) => `${c.name} — ${c.country}`).join(" · ") : undefined}
                            className="px-4 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase min-w-[80px]"
                          >
                            Wk {w}
                            {shut.length > 0 && (
                              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
                            )}
                          </th>
                        );
                      })}
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
                        {forecastWeeks.map((w) => {
                          const wk = `wk${w}`;
                          return (
                            <td key={wk} className={`px-3 py-2 text-center font-mono ${
                              (row[wk] as number) > 0 ? "text-navy-800 font-medium" : "text-navy-200"
                            }`}>
                              {(row[wk] as number) > 0 ? (row[wk] as number).toLocaleString() : "—"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-mono font-bold text-navy-900 bg-lime-50/30">
                          {((row.total as number) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-navy-50/50 border-t-2 border-navy-200">
                      <td colSpan={3} className="px-4 py-2 font-bold text-navy-900 sticky left-0 bg-navy-50/50 z-10">Total</td>
                      {forecastWeeks.map((w) => {
                        const wk = `wk${w}`;
                        return (
                          <td key={wk} className="px-3 py-2 text-center font-mono font-bold text-navy-900">
                            {forecastData.reduce((s, r) => s + ((r[wk] as number) || 0), 0).toLocaleString()}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-mono font-bold text-lime-700 bg-lime-50/50">
                        {forecastData.reduce((s, r) => s + ((r.total as number) || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <ConfirmDialog
              open={confirmClear}
              onClose={() => setConfirmClear(false)}
              title={`Delete ${activeYear} lines`}
              message={`Remove all ${forecastData.length} ${activeCustomer} lines for ${activeYear}? A customer cannot be deleted while any of its lines remain.`}
              onConfirm={() => {
                // By identity, and only the lines on screen: the customer's
                // other years are a different book and stay where they are.
                const doomed = new Set(
                  yearRecords
                    .filter((r) => !activeCustomer || r.customer === activeCustomer)
                    .map((r) => r.id)
                );
                setForecastRecords(forecastRecords.filter((r) => !doomed.has(r.id)));
                setConfirmClear(false);
              }}
            />

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
              onEdit={(row, i) => customerForm.openEdit(row as never, i)}
              onDelete={(row, i) => customerConfirm.requestDelete(row, i)}
              addLabel="Add Customer"
              searchPlaceholder="Search customers..."
            />
            <FormModal
              open={customerForm.open}
              onClose={customerForm.close}
              title={customerForm.isEdit ? "Edit Customer" : "New Customer"}
              subtitle={customerForm.isEdit
                ? "Correct the directory — country decides their currency and holidays"
                : "Add a new customer to the directory"}
              groups={customerFields}
              values={customerForm.values}
              onChange={customerForm.onChange}
              isEdit={customerForm.isEdit}
              submitLabel={customerForm.isEdit ? "Save" : "Create Customer"}
              onSubmit={handleCustomerSave}
            />
            <ConfirmDialog
              open={customerConfirm.open}
              onClose={customerConfirm.close}
              title="Delete Customer"
              message="Remove this customer from the directory?"
              onConfirm={() => {
                setCustomers(withoutPending(customers, customerConfirm.pending) as typeof initialCustomers);
                customerConfirm.close();
              }}
            />
          </>
        );

      case "ports":
      case "airports": {
        const wantAirports = tab === "airports";
        const kind = wantAirports ? "Airport" : "Seaport";
        const shown = (ports as PortRow[]).filter(
          (p) => String((p as Record<string, unknown>).kind ?? "") === kind
        );
        return (
          <>
            <div className="mb-3 text-[12px] text-navy-500 bg-sand-50 border border-sand-200 rounded-lg px-3.5 py-2.5">
              {wantAirports
                ? `Every airport with an IATA code and scheduled service — ${shown.length.toLocaleString()} of them, from OurAirports. Everything ships by air today, so this is the list that matters. Search by code: SAP, XPL, MIA.`
                : `Every seaport the UN issues a code for — ${shown.length.toLocaleString()} of them, from the World Port Index. Kept for the day something goes by sea; the price list can already tell the two apart.`}
            </div>
            <DataTable
              columns={[
                { key: "locator", label: wantAirports ? "IATA" : "LOCODE", render: (r) => (
                  <span className="font-mono text-navy-700">{String(r.locator ?? "—")}</span>
                ) },
                { key: "name", label: "Name" },
                { key: "country", label: "Country" },
                { key: "distance", label: "From the nursery", render: (r) => {
                  const km = portDistanceKm(ports as PortRow[], r.name);
                  return km === null
                    ? <span className="text-navy-300">—</span>
                    : <span className="font-mono tabular-nums text-navy-600">{formatKm(km)}</span>;
                } },
                { key: "active", label: "Shipping there", render: (r) => (
                  <Badge variant={r.active === false ? "gray" : "green"}>
                    {r.active === false ? "No" : "Yes"}
                  </Badge>
                ) },
              ]}
              data={shown as Record<string, unknown>[]}
              onAdd={() => portForm.openCreateWith({ kind })}
              onEdit={(row, i) => portForm.openEdit(row as never, i)}
              onDelete={(row, i) => portConfirm.requestDelete(row, i)}
              addLabel={wantAirports ? "Add Airport" : "Add Seaport"}
              searchPlaceholder={wantAirports ? "Search airports…" : "Search seaports…"}
            />
            <FormModal
              open={portForm.open} onClose={portForm.close}
              title={portForm.isEdit ? "Edit Port" : "Add Port"}
              groups={portFields} values={portForm.values}
              onChange={portForm.onChange} isEdit={portForm.isEdit}
              onSubmit={handlePortSave}
            />
            <ConfirmDialog
              open={portConfirm.open} onClose={portConfirm.close} title="Delete Port"
              message="Delete this port?" onConfirm={handlePortDelete}
            />
          </>
        );
      }
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

      <ConfirmDialog
        open={shipmentToDelete !== null}
        onClose={() => setShipmentToDelete(null)}
        title="Delete shipment"
        message={
          shipmentToDelete
            ? shipmentToDelete.boxes.length > 0
              ? `${shipmentToDelete.code ?? "This shipment"} and the ${shipmentToDelete.boxes.length} boxes packed against it will be deleted. A packed box has no meaning without its shipment.`
              : `Delete ${shipmentToDelete.code ?? "this shipment"}?`
            : ""
        }
        onConfirm={() => { if (shipmentToDelete) void deleteShipmentAndBoxes(shipmentToDelete); }}
      />
    </PageShell>
  );
}
