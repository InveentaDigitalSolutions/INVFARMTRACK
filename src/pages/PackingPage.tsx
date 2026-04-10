import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Boxes,
  FileText,
  Users,
  Plane,
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

const tabs = [
  { id: "shipments", label: "Shipments" },
  { id: "orders", label: "Orders" },
  { id: "invoices", label: "Invoices" },
  { id: "customers", label: "Customers" },
  { id: "prices", label: "Price List" },
];

// Shipment type
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
      bed: i < 10 ? "Bed 3-A" : "Bed 1-B",
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

const sampleInvoices = [
  { number: "000-001-01-00001461", customer: "The Plant Company, LLC", date: "2026-04-08", week: 14, total: "$1,520.00", status: "Sent", balance: "$1,520.00" },
  { number: "000-001-01-00001460", customer: "Green Gardens Inc.", date: "2026-04-01", week: 13, total: "$600.00", status: "Paid", balance: "$0.00" },
];

const sampleCustomers = [
  { code: "VA24477", name: "The Plant Company, LLC", contact: "Frank Paul", email: "frank@theplantcompany.com", terms: "CIF" },
  { code: "FL33101", name: "Green Gardens Inc.", contact: "Sarah Kim", email: "sarah@greengardens.com", terms: "FOB" },
];

const samplePrices = [
  { plant: "Pothos / Hawaiian", season: "2026-S1", customer: "Base", priceExt: "$0.020", priceInt: "L 5.00", from: "2026-01-01", to: "2026-12-31", active: true },
  { plant: "Pothos / Marble Queen", season: "2026-S1", customer: "Base", priceExt: "$0.020", priceInt: "L 5.00", from: "2026-01-01", to: "2026-12-31", active: true },
  { plant: "Pothos / Jade", season: "2026-S1", customer: "Base", priceExt: "$0.018", priceInt: "L 4.50", from: "2026-01-01", to: "2026-12-31", active: true },
  { plant: "Pothos / Hawaiian", season: "2026-S1", customer: "The Plant Company", priceExt: "$0.019", priceInt: "—", from: "2026-04-01", to: "2026-06-30", active: true },
  { plant: "Sansevieria / Sansevieria", season: "2026-S1", customer: "Base", priceExt: "$0.035", priceInt: "L 8.00", from: "2026-01-01", to: "2026-12-31", active: true },
];

const statusBadge = (s: string) => {
  const v = s === "Paid" || s === "Delivered" || s === "Shipped" ? "green" : s === "Sent" || s === "In Packing" || s === "In Progress" ? "amber" : s === "Overdue" ? "red" : "gray";
  return <Badge variant={v}>{s}</Badge>;
};

export default function PackingPage() {
  const [tab, setTab] = useState("shipments");
  const [shipments, setShipments] = useState(initialShipments);
  const [activeShipment, setActiveShipment] = useState<string | null>(null);
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
    // If viewing a shipment detail
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
            {/* Active shipments */}
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

                    {/* Fulfillment bar */}
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

              {/* New shipment card */}
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

      case "invoices":
        return (
          <DataTable
            columns={[
              { key: "number", label: "Invoice #" },
              { key: "customer", label: "Customer" },
              { key: "date", label: "Date" },
              { key: "week", label: "Week" },
              { key: "total", label: "Total" },
              { key: "status", label: "Status", render: (r) => statusBadge(r.status as string) },
              { key: "balance", label: "Balance" },
            ]}
            data={sampleInvoices}
            onAdd={() => {}}
            addLabel="Generate Invoice"
            searchPlaceholder="Search invoices..."
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

      case "prices":
        return (
          <DataTable
            columns={[
              { key: "plant", label: "Plant" },
              { key: "season", label: "Season" },
              { key: "customer", label: "Customer", render: (r) => <Badge variant={r.customer === "Base" ? "gray" : "blue"}>{r.customer as string}</Badge> },
              { key: "priceExt", label: "EXT (USD)" },
              { key: "priceInt", label: "INT (HNL)" },
              { key: "from", label: "From" },
              { key: "to", label: "To" },
              { key: "active", label: "Active", render: (r) => (
                <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Expired"}</Badge>
              )},
            ]}
            data={samplePrices}
            onAdd={() => {}}
            addLabel="Set Price"
            searchPlaceholder="Search prices..."
          />
        );
    }
  };

  return (
    <PageShell
      title="Packing"
      subtitle="Shipments, orders, invoicing and customers"
      icon={Package}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <StatCard
          label="Active Shipments"
          value={shipments.filter((s) => s.status === "In Progress").length}
          icon={Plane}
          color="green"
        />
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
