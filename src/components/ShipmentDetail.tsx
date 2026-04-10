import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Plane,
  Truck,
  ChevronDown,
  Plus,
  UserCheck,
  FileText,
  Check,
  Boxes,
  AlertCircle,
} from "lucide-react";
import Badge from "./Badge";
import InvoiceGenerator from "./InvoiceGenerator";

// Types
interface OrderLine {
  plant: string;
  qtyOrdered: number;
  qtyPacked: number;
  pricePerUnit: number;
}

interface PackedBox {
  id: string;
  barcode: string;
  boxNumber: number;
  plant: string;
  bed: string;
  size: string;
  packingType: string;
  bundleSize: number;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  worker: string;
  workerId: string;
}

interface Shipment {
  id: string;
  customer: string;
  orderNumber: string;
  date: string;
  carrier: string;
  awb: string;
  status: string;
  orderLines: OrderLine[];
  boxes: PackedBox[];
}

// Dummy data
const plants = [
  "Pothos / Hawaiian",
  "Pothos / Marble Queen",
  "Pothos / Jade",
  "Pothos / N'Joy",
  "Pothos / Golden Glen",
];
const beds = [
  { id: "bed-3a", label: "Bed 3-A", shadehouse: "SH North" },
  { id: "bed-1b", label: "Bed 1-B", shadehouse: "SH North" },
  { id: "bed-5c", label: "Bed 5-C", shadehouse: "SH South" },
];
const sizes = ["Petit", "Mini Petit", "Small", "Medium", "California", "Large", "Extra Large"];
const workers = [
  { name: "Carlos M.", id: "W001" },
  { name: "Maria L.", id: "W002" },
  { name: "Juan P.", id: "W003" },
  { name: "Ana R.", id: "W004" },
];

interface ShipmentDetailProps {
  shipment: Shipment;
  onBack: () => void;
  onUpdate: (shipment: Shipment) => void;
}

export default function ShipmentDetail({
  shipment,
  onBack,
  onUpdate,
}: ShipmentDetailProps) {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState<Set<string>>(new Set());
  const [assignWorker, setAssignWorker] = useState("");

  // Add group form state
  const [groupPlant, setGroupPlant] = useState("");
  const [groupBed, setGroupBed] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [groupType, setGroupType] = useState("BNDL");
  const [groupBundle, setGroupBundle] = useState(3);
  const [groupQty, setGroupQty] = useState(2000);
  const [groupGW, setGroupGW] = useState(8);
  const [groupNW, setGroupNW] = useState(7);
  const [groupCount, setGroupCount] = useState(1);

  // Fulfillment calc
  const totalOrdered = shipment.orderLines.reduce((s, l) => s + l.qtyOrdered, 0);
  const totalPacked = shipment.boxes.reduce((s, b) => s + b.quantity, 0);
  const fulfillmentPct = totalOrdered > 0 ? Math.min(100, Math.round((totalPacked / totalOrdered) * 100)) : 0;
  const totalBoxes = shipment.boxes.length;
  const totalGW = shipment.boxes.reduce((s, b) => s + b.grossWeight, 0);
  const totalNW = shipment.boxes.reduce((s, b) => s + b.netWeight, 0);

  // Per-plant fulfillment
  const plantFulfillment = shipment.orderLines.map((line) => {
    const packed = shipment.boxes
      .filter((b) => b.plant === line.plant)
      .reduce((s, b) => s + b.quantity, 0);
    return { ...line, qtyPacked: packed, pct: Math.min(100, Math.round((packed / line.qtyOrdered) * 100)) };
  });

  const handleAddBoxes = () => {
    if (!groupPlant || !groupBed || !groupSize || groupCount < 1) return;

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const startNum = shipment.boxes.length + 1;
    const bedObj = beds.find((b) => b.id === groupBed);

    const newBoxes: PackedBox[] = Array.from({ length: groupCount }, (_, i) => {
      const num = startNum + i;
      return {
        id: `BX-${String(num).padStart(3, "0")}`,
        barcode: `HN${today}${String(num).padStart(3, "0")}`,
        boxNumber: num,
        plant: groupPlant,
        bed: bedObj?.label || groupBed,
        size: groupSize,
        packingType: groupType,
        bundleSize: groupType === "BNDL" ? groupBundle : 0,
        quantity: groupQty,
        grossWeight: groupGW,
        netWeight: groupNW,
        worker: "",
        workerId: "",
      };
    });

    onUpdate({
      ...shipment,
      boxes: [...shipment.boxes, ...newBoxes],
    });

    setShowAddGroup(false);
    setGroupPlant("");
    setGroupBed("");
    setGroupSize("");
    setGroupCount(1);
  };

  const handleAssignWorker = () => {
    if (!assignWorker || selectedBoxes.size === 0) return;
    const w = workers.find((w) => w.name === assignWorker);
    const updated = shipment.boxes.map((b) =>
      selectedBoxes.has(b.id)
        ? { ...b, worker: assignWorker, workerId: w?.id || "" }
        : b
    );
    onUpdate({ ...shipment, boxes: updated });
    setSelectedBoxes(new Set());
    setAssignWorker("");
  };

  const toggleBox = (id: string) => {
    const next = new Set(selectedBoxes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBoxes(next);
  };

  const selectAllUnassigned = () => {
    const unassigned = shipment.boxes.filter((b) => !b.worker).map((b) => b.id);
    setSelectedBoxes(new Set(unassigned));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-sand-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-navy-700" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-navy-900">
              {shipment.customer}
            </h2>
            <Badge variant={shipment.status === "In Progress" ? "amber" : shipment.status === "Packed" ? "green" : "gray"}>
              {shipment.status}
            </Badge>
          </div>
          <p className="text-sm text-navy-500">
            {shipment.orderNumber} — {shipment.date} — {shipment.carrier}{shipment.awb ? ` (${shipment.awb})` : ""}
          </p>
        </div>
        {shipment.boxes.length > 0 && (
          <button
            onClick={() => setShowInvoice(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-navy-900
                       bg-lime-400 rounded-lg hover:bg-lime-300 transition-colors cursor-pointer shadow-sm shrink-0"
          >
            <FileText className="w-4 h-4" />
            Generate Invoice
          </button>
        )}
      </div>

      {/* Invoice Generator Modal */}
      <AnimatePresence>
        {showInvoice && (
          <InvoiceGenerator
            shipment={shipment}
            onClose={() => setShowInvoice(false)}
            onGenerate={(invoice) => {
              console.log("Invoice generated:", invoice);
              setShowInvoice(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Fulfillment progress */}
      <div className="bg-white rounded-xl border border-sand-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-navy-900">Order Fulfillment</p>
          <span className="text-sm font-bold text-navy-700">{fulfillmentPct}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-sand-100 overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fulfillmentPct}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${
              fulfillmentPct >= 100 ? "bg-green-500" : fulfillmentPct >= 50 ? "bg-lime-500" : "bg-amber-400"
            }`}
          />
        </div>

        {/* Per-plant breakdown */}
        <div className="space-y-2">
          {plantFulfillment.map((line) => (
            <div key={line.plant} className="flex items-center gap-3 text-sm">
              <p className="flex-1 text-navy-800 truncate">{line.plant}</p>
              <div className="w-32 h-2 rounded-full bg-sand-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${line.pct >= 100 ? "bg-green-500" : "bg-lime-400"}`}
                  style={{ width: `${line.pct}%` }}
                />
              </div>
              <p className="text-xs text-navy-500 w-28 text-right">
                {line.qtyPacked.toLocaleString()} / {line.qtyOrdered.toLocaleString()}
              </p>
              {line.pct >= 100 && <Check className="w-4 h-4 text-green-500" />}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-sand-100">
          <div>
            <p className="text-xs text-green-500">Boxes</p>
            <p className="text-sm font-semibold text-navy-900">{totalBoxes}</p>
          </div>
          <div>
            <p className="text-xs text-green-500">Total Stems</p>
            <p className="text-sm font-semibold text-navy-900">{totalPacked.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-green-500">Gross Weight</p>
            <p className="text-sm font-semibold text-navy-900">{totalGW} kg</p>
          </div>
          <div>
            <p className="text-xs text-green-500">Net Weight</p>
            <p className="text-sm font-semibold text-navy-900">{totalNW} kg</p>
          </div>
        </div>
      </div>

      {/* Add boxes */}
      <AnimatePresence mode="wait">
        {showAddGroup ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-xl border border-sand-200 p-5"
          >
            <p className="text-sm font-semibold text-navy-900 mb-4">Add Boxes</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Plant *</label>
                <select value={groupPlant} onChange={(e) => setGroupPlant(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-sand-200 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-300">
                  <option value="">Select...</option>
                  {plants.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Bed *</label>
                <select value={groupBed} onChange={(e) => setGroupBed(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-sand-200 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-300">
                  <option value="">Select...</option>
                  {beds.map((b) => <option key={b.id} value={b.id}>{b.label} ({b.shadehouse})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Size *</label>
                <select value={groupSize} onChange={(e) => setGroupSize(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-sand-200 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-300">
                  <option value="">Select...</option>
                  {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Type</label>
                <div className="flex gap-1.5">
                  {["BNDL", "IND"].map((t) => (
                    <button key={t} onClick={() => setGroupType(t)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                        groupType === t ? "bg-navy-700 text-white border-green-700" : "bg-white text-navy-700 border-sand-200"
                      }`}>{t === "BNDL" ? "Bundle" : "Individual"}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {groupType === "BNDL" && (
                <div>
                  <label className="block text-xs font-medium text-navy-700 mb-1">Bundle</label>
                  <div className="flex gap-1.5">
                    {[3, 5].map((s) => (
                      <button key={s} onClick={() => setGroupBundle(s)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                          groupBundle === s ? "bg-navy-700 text-white border-green-700" : "bg-white text-navy-700 border-sand-200"
                        }`}>x{s}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">Stems/box</label>
                <input type="number" value={groupQty} onChange={(e) => setGroupQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-sand-200 focus:outline-none focus:ring-2 focus:ring-green-300
                             [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">GW (kg)</label>
                <input type="number" value={groupGW} onChange={(e) => setGroupGW(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-sand-200 focus:outline-none focus:ring-2 focus:ring-green-300
                             [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">NW (kg)</label>
                <input type="number" value={groupNW} onChange={(e) => setGroupNW(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-sand-200 focus:outline-none focus:ring-2 focus:ring-green-300
                             [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1 font-bold">Boxes *</label>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setGroupCount(Math.max(1, groupCount - 1))}
                    className="w-9 h-9 rounded-lg border border-sand-200 text-navy-700 font-bold hover:bg-sand-50 cursor-pointer">-</button>
                  <input type="number" value={groupCount} onChange={(e) => setGroupCount(Math.max(1, Number(e.target.value)))}
                    className="w-14 text-center text-lg font-bold text-navy-900 border border-sand-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-green-300
                               [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button onClick={() => setGroupCount(groupCount + 1)}
                    className="w-9 h-9 rounded-lg border border-sand-200 text-navy-700 font-bold hover:bg-sand-50 cursor-pointer">+</button>
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-green-500">Quick:</span>
              {[5, 10, 13, 17, 20, 25, 38, 50].map((n) => (
                <button key={n} onClick={() => setGroupCount(n)}
                  className={`px-2 py-1 text-xs rounded-md border cursor-pointer ${
                    groupCount === n ? "bg-navy-700 text-white border-green-700" : "bg-white text-navy-500 border-sand-200 hover:border-green-300"
                  }`}>{n}</button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button onClick={() => setShowAddGroup(false)} className="text-sm text-navy-500 hover:text-navy-800 cursor-pointer">Cancel</button>
              <button onClick={handleAddBoxes}
                disabled={!groupPlant || !groupBed || !groupSize}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-navy-700 text-white rounded-lg hover:bg-green-600 disabled:bg-sand-200 disabled:text-green-400 cursor-pointer disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />
                Add {groupCount} box{groupCount > 1 ? "es" : ""}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddGroup(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-green-300
                       text-navy-500 text-sm font-medium hover:border-green-400 hover:bg-green-50 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add boxes to this shipment
          </motion.button>
        )}
      </AnimatePresence>

      {/* Worker assignment bar */}
      {selectedBoxes.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 z-10 flex items-center gap-3 p-3 bg-navy-800 rounded-xl shadow-lg text-white"
        >
          <UserCheck className="w-5 h-5 text-lime-400 shrink-0" />
          <span className="text-sm font-medium">{selectedBoxes.size} box{selectedBoxes.size > 1 ? "es" : ""} selected</span>
          <select value={assignWorker} onChange={(e) => setAssignWorker(e.target.value)}
            className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-navy-700 text-white border border-green-600 cursor-pointer focus:outline-none">
            <option value="">Assign to...</option>
            {workers.map((w) => <option key={w.id} value={w.name}>{w.name} ({w.id})</option>)}
          </select>
          <button onClick={handleAssignWorker}
            disabled={!assignWorker}
            className="px-4 py-1.5 text-sm font-medium bg-lime-500 text-navy-900 rounded-lg hover:bg-lime-400 disabled:opacity-50 cursor-pointer">
            Assign
          </button>
          <button onClick={() => setSelectedBoxes(new Set())}
            className="px-3 py-1.5 text-sm text-green-300 hover:text-white cursor-pointer">
            Clear
          </button>
        </motion.div>
      )}

      {/* Boxes table */}
      {shipment.boxes.length > 0 && (
        <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-sand-100">
            <p className="text-sm font-semibold text-navy-900">
              Packed Boxes ({shipment.boxes.length})
            </p>
            <button onClick={selectAllUnassigned}
              className="text-xs text-navy-500 hover:text-navy-800 cursor-pointer">
              Select all unassigned
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-100">
                  <th className="px-4 py-2.5 text-left w-8"></th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy-500 uppercase">Box</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy-500 uppercase">Barcode</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy-500 uppercase">Plant</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy-500 uppercase">Bed</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy-500 uppercase">Size</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy-500 uppercase">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy-500 uppercase">Qty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy-500 uppercase">GW</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-navy-500 uppercase">Worker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {shipment.boxes.map((box) => (
                  <tr
                    key={box.id}
                    className={`transition-colors ${
                      selectedBoxes.has(box.id) ? "bg-green-50" : "hover:bg-sand-50"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedBoxes.has(box.id)}
                        onChange={() => toggleBox(box.id)}
                        className="w-4 h-4 rounded border-sand-300 text-navy-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-navy-900">{box.id}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-navy-500">{box.barcode}</td>
                    <td className="px-4 py-2.5 text-navy-900">{box.plant}</td>
                    <td className="px-4 py-2.5 text-navy-700">{box.bed}</td>
                    <td className="px-4 py-2.5"><Badge variant="blue">{box.size}</Badge></td>
                    <td className="px-4 py-2.5">
                      <Badge variant={box.packingType === "BNDL" ? "green" : "gray"}>
                        {box.packingType}{box.packingType === "BNDL" ? ` x${box.bundleSize}` : ""}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-navy-900">{box.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-navy-700">{box.grossWeight}kg</td>
                    <td className="px-4 py-2.5">
                      {box.worker ? (
                        <span className="flex items-center gap-1 text-navy-700">
                          <UserCheck className="w-3.5 h-3.5 text-green-500" />
                          {box.worker}
                        </span>
                      ) : (
                        <span className="text-amber-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
