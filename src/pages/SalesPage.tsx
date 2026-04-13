import { useState } from "react";
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
import StatCard from "../components/StatCard";
import ShipmentDetail from "../components/ShipmentDetail";
import FormModal from "../components/FormModal";
import { useFormModal } from "../hooks/useFormModal";
import ExcelImport from "../components/ExcelImport";
import { CalendarRange, Upload } from "lucide-react";

const tabs = [
  { id: "shipments", label: "Shipments" },
  { id: "forecast", label: "Demand Forecast" },
  { id: "orders", label: "Orders" },
  { id: "customers", label: "Customers" },
];

interface Shipment {
  id: string;
  customer: string;
  orderNumber: string;
  date: string;
  carrier: string;
  awb: string;
  status: string;
  orderLines: { plant: string; qtyOrdered: number; qtyPacked: number; pricePerUnit: number }[];
  boxes: {
    id: string; barcode: string; boxNumber: number; plant: string; bed: string;
    size: string; packingType: string; bundleSize: number; quantity: number;
    grossWeight: number; netWeight: number; worker: string; workerId: string;
  }[];
}

const initialShipments: Shipment[] = [
  {
    id: "SHP-2026-015",
    customer: "The Plant Company, LLC",
    orderNumber: "ORD-2026-042",
    date: "2026-04-10",
    carrier: "DHL",
    awb: "947-30055616",
    status: "In Progress",
    orderLines: [
      { plant: "Pothos / Hawaiian", qtyOrdered: 34000, qtyPacked: 0, pricePerUnit: 0.020 },
      { plant: "Pothos / Marble Queen", qtyOrdered: 26000, qtyPacked: 0, pricePerUnit: 0.020 },
      { plant: "Pothos / Jade", qtyOrdered: 10000, qtyPacked: 0, pricePerUnit: 0.018 },
      { plant: "Pothos / N'Joy", qtyOrdered: 2000, qtyPacked: 0, pricePerUnit: 0.020 },
      { plant: "Pothos / Golden Glen", qtyOrdered: 4000, qtyPacked: 0, pricePerUnit: 0.020 },
    ],
    boxes: [],
  },
  {
    id: "SHP-2026-014",
    customer: "Green Gardens Inc.",
    orderNumber: "ORD-2026-041",
    date: "2026-04-03",
    carrier: "FedEx",
    awb: "794-12345678",
    status: "Shipped",
    orderLines: [
      { plant: "Pothos / Hawaiian", qtyOrdered: 20000, qtyPacked: 20000, pricePerUnit: 0.020 },
      { plant: "Pothos / Marble Queen", qtyOrdered: 10000, qtyPacked: 10000, pricePerUnit: 0.020 },
    ],
    boxes: Array.from({ length: 15 }, (_, i) => ({
      id: `BX-${String(i + 1).padStart(3, "0")}`,
      barcode: `HN260403${String(i + 1).padStart(3, "0")}`,
      boxNumber: i + 1,
      plant: i < 10 ? "Pothos / Hawaiian" : "Pothos / Marble Queen",
      bed: i < 10 ? "E3-01" : "E1-05",
      size: "California",
      packingType: "BNDL",
      bundleSize: 3,
      quantity: 2000,
      grossWeight: 8,
      netWeight: 7,
      worker: i % 3 === 0 ? "Carlos M." : i % 3 === 1 ? "Maria L." : "Juan P.",
      workerId: i % 3 === 0 ? "W001" : i % 3 === 1 ? "W002" : "W003",
    })),
  },
];

const sampleOrders = [
  { number: "ORD-2026-042", customer: "The Plant Company, LLC", date: "2026-04-08", delivery: "2026-04-10", status: "In Packing", items: 5, total: "$1,520.00" },
  { number: "ORD-2026-041", customer: "Green Gardens Inc.", date: "2026-04-01", delivery: "2026-04-03", status: "Delivered", items: 2, total: "$600.00" },
];

const sampleCustomers = [
  { code: "VA24477", name: "The Plant Company, LLC", contact: "Frank Paul", email: "frank@theplantcompany.com", terms: "CIF" },
  { code: "FL33101", name: "Green Gardens Inc.", contact: "Sarah Kim", email: "sarah@greengardens.com", terms: "FOB" },
];

const statusBadge = (s: string) => {
  const v = s === "Paid" || s === "Delivered" || s === "Shipped" ? "green" : s === "Sent" || s === "In Packing" || s === "In Progress" ? "amber" : s === "Overdue" ? "red" : "gray";
  return <Badge variant={v}>{s}</Badge>;
};

export default function SalesPage() {
  const [tab, setTab] = useState("shipments");
  const [shipments, setShipments] = useState(initialShipments);
  const [activeShipment, setActiveShipment] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [forecastData, setForecastData] = useState<Record<string, unknown>[]>([
    { variety: "Pothos / Hawaiian", size: "9cm HQD Bowls", type: "Current Order", wk14: 10725, wk15: 7000, wk16: 11500, wk17: 12500, wk18: 11800, total: 53525 },
    { variety: "Pothos / Hawaiian", size: "9cm HQD Specialty", type: "Current Order", wk14: 0, wk15: 0, wk16: 0, wk17: 0, wk18: 1300, total: 1300 },
    { variety: "Pothos / Jade", size: "9cm HQD Bowls", type: "Current Order", wk14: 12000, wk15: 0, wk16: 14750, wk17: 12500, wk18: 0, total: 39250 },
    { variety: "Pothos / Marble Queen", size: "9cm HQD Bowls", type: "Current Order", wk14: 4000, wk15: 0, wk16: 21500, wk17: 52000, wk18: 25000, total: 102500 },
    { variety: "Pothos / N'Joy", size: "12cm Canopy", type: "Current Order", wk14: 0, wk15: 0, wk16: 2526, wk17: 0, wk18: 0, total: 2526 },
    { variety: "Pothos / Golden Glen", size: "17cm", type: "Current Order", wk14: 0, wk15: 2715, wk16: 0, wk17: 2650, wk18: 1000, total: 6365 },
  ]);
  const shipmentForm = useFormModal({ customer: "", orderNumber: "", carrier: "DHL", awb: "", date: new Date().toISOString().slice(0, 10) });

  const currentShipment = shipments.find((s) => s.id === activeShipment);

  const handleCreateShipment = (values: Record<string, unknown>) => {
    const num = shipments.length + 1;
    const newShipment: Shipment = {
      id: `SHP-2026-${String(num).padStart(3, "0")}`,
      customer: values.customer as string,
      orderNumber: values.orderNumber as string || `ORD-2026-${String(50 + num).padStart(3, "0")}`,
      date: values.date as string,
      carrier: values.carrier as string,
      awb: values.awb as string,
      status: "In Progress",
      orderLines: [],
      boxes: [],
    };
    setShipments((prev) => [newShipment, ...prev]);
    shipmentForm.close();
    setActiveShipment(newShipment.id);
  };

  const handleUpdateShipment = (updated: Shipment) => {
    setShipments((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const totalBoxesToday = shipments
    .filter((s) => s.status === "In Progress")
    .reduce((sum, s) => sum + s.boxes.length, 0);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shipments.map((s) => {
                const totalOrdered = s.orderLines.reduce((sum, l) => sum + l.qtyOrdered, 0);
                const totalPacked = s.boxes.reduce((sum, b) => sum + b.quantity, 0);
                const pct = totalOrdered > 0 ? Math.min(100, Math.round((totalPacked / totalOrdered) * 100)) : 0;

                return (
                  <motion.button
                    key={s.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setActiveShipment(s.id)}
                    className="bg-white rounded-xl border border-sand-200 p-5 text-left
                               hover:shadow-md hover:shadow-green-900/5 transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-navy-900">{s.customer}</p>
                          {statusBadge(s.status)}
                        </div>
                        <p className="text-xs text-navy-500">{s.id} — {s.orderNumber}</p>
                      </div>
                      <div className="flex items-center gap-1 text-navy-300">
                        {s.carrier === "DHL" || s.carrier === "FedEx" ? (
                          <Plane className="w-4 h-4" />
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}
                        <span className="text-xs">{s.carrier}</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-navy-500">Fulfillment</span>
                        <span className="font-medium text-navy-700">{pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-sand-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-lime-500" : "bg-amber-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-navy-500">
                        <span>{s.boxes.length} boxes</span>
                        <span>{totalPacked.toLocaleString()} stems</span>
                        <span>{s.date}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-navy-300" />
                    </div>
                  </motion.button>
                );
              })}

              <button
                onClick={shipmentForm.openCreate}
                className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed
                           border-lime-300 text-navy-400 hover:border-lime-400 hover:bg-green-50 transition-colors cursor-pointer"
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">New Shipment</span>
              </button>
            </div>

            <FormModal
              open={shipmentForm.open}
              onClose={shipmentForm.close}
              title="New Shipment"
              subtitle="Create a shipment for a customer"
              groups={[{
                title: "Shipment Details", columns: 2 as const, fields: [
                  { key: "customer", label: "Customer", type: "select" as const, options: sampleCustomers.map((c) => ({ value: c.name, label: c.name })), required: true },
                  { key: "orderNumber", label: "Order Number", type: "text" as const, placeholder: "Auto-generated if blank" },
                  { key: "date", label: "Ship Date", type: "date" as const, required: true },
                  { key: "carrier", label: "Carrier", type: "select" as const, options: [
                    { value: "DHL", label: "DHL" }, { value: "FedEx", label: "FedEx" },
                    { value: "UPS", label: "UPS" }, { value: "Other", label: "Other" },
                  ]},
                  { key: "awb", label: "AWB / BL Number", type: "text" as const, placeholder: "Air waybill or bill of lading" },
                ],
              }]}
              values={shipmentForm.values}
              onChange={shipmentForm.onChange}
              submitLabel="Create Shipment"
              onSubmit={handleCreateShipment}
            />
          </div>
        );

      case "forecast":
        return (
          <div className="space-y-4">
            {/* Import button + summary */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-navy-900">Q2 2026 — The Plant Company</h3>
                <p className="text-[12px] text-navy-400">{forecastData.length} order lines · Weeks 14–18</p>
              </div>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-navy-900
                           bg-lime-400 rounded-lg hover:bg-lime-300 cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Import Excel
              </button>
            </div>

            {/* Forecast grid */}
            <div className="bg-white rounded-xl border border-sand-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-sand-50/50 border-b border-sand-100">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-navy-400 uppercase sticky left-0 bg-sand-50/50 z-10">Variety</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-navy-400 uppercase">Size</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-navy-400 uppercase">Type</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase">Wk 14</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase">Wk 15</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase">Wk 16</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase">Wk 17</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-navy-400 uppercase">Wk 18</th>
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
                  customer="The Plant Company, LLC"
                  year={2026}
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
                    setForecastData(newData);
                  }}
                  onClose={() => setShowImport(false)}
                />
              )}
            </AnimatePresence>
          </div>
        );

      case "orders":
        return (
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
            data={sampleOrders}
            onAdd={() => {}}
            addLabel="New Order"
            searchPlaceholder="Search orders..."
          />
        );

      case "customers":
        return (
          <DataTable
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Company" },
              { key: "contact", label: "Contact" },
              { key: "email", label: "Email" },
              { key: "terms", label: "Terms", render: (r) => <Badge variant="gray">{r.terms as string}</Badge> },
            ]}
            data={sampleCustomers}
            onAdd={() => {}}
            addLabel="Add Customer"
            searchPlaceholder="Search customers..."
          />
        );
    }
  };

  return (
    <PageShell title="Sales & Shipping" subtitle="Customers, orders, shipments and packing" icon={ShoppingCart}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <StatCard label="Active Shipments" value={shipments.filter((s) => s.status === "In Progress").length} icon={Plane} color="green" />
        <StatCard label="Boxes Today" value={totalBoxesToday} icon={Boxes} color="amber" />
        <StatCard label="Open Orders" value={sampleOrders.filter((o) => o.status !== "Delivered").length} icon={FileText} color="blue" />
        <StatCard label="Active Customers" value={sampleCustomers.length} icon={Users} color="green" />
      </motion.div>

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
