import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Check,
  ChevronDown,
  DollarSign,
  Calculator,
  Upload,
  Mail,
  AlertCircle,
  X,
} from "lucide-react";
import Badge from "./Badge";

// Types matching our schema
interface PackedBox {
  id: string;
  plant: string;
  bed: string;
  size: string;
  packingType: string;
  bundleSize: number;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  worker: string;
}

interface Shipment {
  id: string;
  customer: string;
  orderNumber: string;
  date: string;
  carrier: string;
  awb: string;
  boxes: PackedBox[];
}

interface CAINumber {
  number: string;
  sequence: number;
  used: boolean;
  usedFor?: string;
}

interface InvoiceGeneratorProps {
  shipment: Shipment;
  onClose: () => void;
  onGenerate: (invoice: GeneratedInvoice) => void;
}

interface GeneratedInvoice {
  invoiceNumber: string;
  customer: string;
  date: string;
  dueDate: string;
  weekNumber: number;
  etd: string;
  carrier: string;
  awb: string;
  lines: InvoiceLine[];
  subtotal: number;
  isvRate: number;
  isvAmount: number;
  total: number;
  exchangeRate: number;
  totalHNL: number;
  bancoUrl?: string;
  jasonUrl?: string;
}

interface InvoiceLine {
  boxRange: string;
  grossWeight: number;
  netWeight: number;
  boxes: number;
  pack: number;
  quantity: number;
  description: string;
  customer: string;
  pricePerUnit: number;
  amount: number;
}

// Dummy CAI numbers
const caiNumbers: CAINumber[] = Array.from({ length: 70 }, (_, i) => ({
  number: `000-001-01-${String(1461 + i).padStart(8, "0")}`,
  sequence: 1461 + i,
  used: i === 0, // first one already used
  usedFor: i === 0 ? "Export Invoice (BANCO)" : undefined,
}));

// Dummy price lookup
const priceMap: Record<string, { ext: number; int: number }> = {
  "Pothos / Hawaiian": { ext: 0.020, int: 5.00 },
  "Pothos / Marble Queen": { ext: 0.020, int: 5.00 },
  "Pothos / Jade": { ext: 0.018, int: 4.50 },
  "Pothos / N'Joy": { ext: 0.022, int: 6.00 },
  "Pothos / Golden Glen": { ext: 0.020, int: 5.00 },
  "Sansevieria / Sansevieria": { ext: 0.035, int: 8.00 },
};

function getWeekNumber(date: string): number {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function InvoiceGenerator({
  shipment,
  onClose,
  onGenerate,
}: InvoiceGeneratorProps) {
  const [exchangeRate, setExchangeRate] = useState(26.5455);
  const [step, setStep] = useState<"review" | "generating" | "done">("review");
  const [selectedCAI, setSelectedCAI] = useState(() => {
    const next = caiNumbers.find((c) => !c.used);
    return next?.number || "";
  });

  // Aggregate boxes into invoice lines (group by plant variety)
  const invoiceLines = useMemo((): InvoiceLine[] => {
    const groups = new Map<string, PackedBox[]>();
    shipment.boxes.forEach((box) => {
      const key = `${box.plant}|${box.size}|${box.packingType}|${box.bundleSize}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(box);
    });

    let boxCounter = 0;
    const lines: InvoiceLine[] = [];
    groups.forEach((boxes, key) => {
      const first = boxes[0];
      const startBox = boxCounter + 1;
      const endBox = boxCounter + boxes.length;
      boxCounter = endBox;

      const price = priceMap[first.plant]?.ext || 0.020;
      const totalQty = boxes.reduce((s, b) => s + b.quantity, 0);

      const bundleStr = first.packingType === "BNDL" ? ` ${first.bundleSize} BNDL` : "";
      const description = `${first.plant} URC L/E ${first.size.toUpperCase()}${bundleStr}`;

      lines.push({
        boxRange: startBox === endBox
          ? String(startBox).padStart(2, "0")
          : `${String(startBox).padStart(2, "0")}-${String(endBox).padStart(2, "0")}`,
        grossWeight: first.grossWeight,
        netWeight: first.netWeight,
        boxes: boxes.length,
        pack: first.quantity,
        quantity: totalQty,
        description,
        customer: shipment.customer.substring(0, 20),
        pricePerUnit: price,
        amount: totalQty * price,
      });
    });

    return lines;
  }, [shipment]);

  const subtotal = invoiceLines.reduce((s, l) => s + l.amount, 0);
  const isvRate = 0.18;
  const isvAmount = subtotal * isvRate;
  const total = subtotal + isvAmount;
  const totalHNL = total * exchangeRate;
  const totalBoxes = shipment.boxes.length;
  const totalGW = invoiceLines.reduce((s, l) => s + l.grossWeight * l.boxes, 0);
  const totalNW = invoiceLines.reduce((s, l) => s + l.netWeight * l.boxes, 0);
  const totalStems = invoiceLines.reduce((s, l) => s + l.quantity, 0);

  const handleGenerate = () => {
    setStep("generating");
    setTimeout(() => {
      const invoice: GeneratedInvoice = {
        invoiceNumber: selectedCAI,
        customer: shipment.customer,
        date: shipment.date,
        dueDate: addDays(shipment.date, 30),
        weekNumber: getWeekNumber(shipment.date),
        etd: shipment.date,
        carrier: shipment.carrier,
        awb: shipment.awb,
        lines: invoiceLines,
        subtotal,
        isvRate,
        isvAmount,
        total,
        exchangeRate,
        totalHNL,
      };
      onGenerate(invoice);
      setStep("done");
    }, 2000);
  };

  const nextAvailable = caiNumbers.filter((c) => !c.used);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[4vh] px-4 overflow-y-auto"
    >
      <div className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-sand-200/80 mb-8 z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-800">
              <FileText className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-900">Generate Invoice</h2>
              <p className="text-[12px] text-navy-400">{shipment.customer} — {shipment.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-sand-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === "review" && (
            <>
              {/* CAI Number selection */}
              <div>
                <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-[0.1em] mb-2">
                  Fiscal — CAI Number
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select
                      value={selectedCAI}
                      onChange={(e) => setSelectedCAI(e.target.value)}
                      className="w-full px-3 py-2.5 text-[13px] font-mono rounded-lg border border-sand-200 bg-white
                                 text-navy-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400/30"
                    >
                      {nextAvailable.slice(0, 10).map((c) => (
                        <option key={c.number} value={c.number}>{c.number}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300 pointer-events-none" />
                  </div>
                  <div className="text-[11px] text-navy-400">
                    <span className="font-semibold text-navy-700">{nextAvailable.length}</span> available
                  </div>
                </div>
              </div>

              {/* Exchange rate */}
              <div>
                <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-[0.1em] mb-2">
                  Exchange Rate (HNL / USD)
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    step="0.0001"
                    className="w-40 px-3 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-white text-navy-900
                               focus:outline-none focus:ring-2 focus:ring-lime-400/30
                               [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[11px] text-navy-400">Source: Honduras Central Bank</span>
                </div>
              </div>

              {/* Invoice preview table */}
              <div>
                <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-[0.1em] mb-2">
                  Invoice Lines (BANCO — Export Prices)
                </p>
                <div className="overflow-x-auto rounded-lg border border-sand-200/80">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-sand-50/50 border-b border-sand-100">
                        <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase">Bx #</th>
                        <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase">GW</th>
                        <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase">NW</th>
                        <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase">Bx Qty</th>
                        <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase">Pack</th>
                        <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase">Qty</th>
                        <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase">Description</th>
                        <th className="px-3 py-2 text-right text-[9px] font-semibold text-navy-400 uppercase">$/Unit</th>
                        <th className="px-3 py-2 text-right text-[9px] font-semibold text-navy-400 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-100/80">
                      {invoiceLines.map((line, i) => (
                        <tr key={i} className="hover:bg-sand-50/50">
                          <td className="px-3 py-2 font-mono text-navy-700">{line.boxRange}</td>
                          <td className="px-3 py-2 text-navy-600">{line.grossWeight.toFixed(1)}</td>
                          <td className="px-3 py-2 text-navy-600">{line.netWeight.toFixed(1)}</td>
                          <td className="px-3 py-2 text-navy-700 font-medium">{line.boxes}</td>
                          <td className="px-3 py-2 text-navy-600">{line.pack.toLocaleString()}</td>
                          <td className="px-3 py-2 text-navy-700 font-medium">{line.quantity.toLocaleString()}</td>
                          <td className="px-3 py-2 text-navy-800 font-medium">{line.description}</td>
                          <td className="px-3 py-2 text-right text-navy-600">{line.pricePerUnit.toFixed(3)}</td>
                          <td className="px-3 py-2 text-right text-navy-900 font-semibold">{line.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left: shipment summary */}
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-navy-400">Total Boxes</span>
                    <span className="font-semibold text-navy-900">{totalBoxes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-400">Total Stems</span>
                    <span className="font-semibold text-navy-900">{totalStems.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-400">Gross Weight</span>
                    <span className="font-semibold text-navy-900">{totalGW.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-400">Net Weight</span>
                    <span className="font-semibold text-navy-900">{totalNW.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-400">Due Date</span>
                    <span className="font-semibold text-navy-900">{addDays(shipment.date, 30)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-400">Week</span>
                    <span className="font-semibold text-navy-900">{getWeekNumber(shipment.date)}</span>
                  </div>
                </div>

                {/* Right: financial summary */}
                <div className="bg-sand-50 rounded-xl p-4 space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-navy-400">Subtotal</span>
                    <span className="text-navy-900">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-400">ISV 18%</span>
                    <span className="text-navy-900">${isvAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-sand-200">
                    <span className="font-bold text-navy-900">Total (USD)</span>
                    <span className="font-bold text-navy-900 text-lg">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-navy-400">Exchange Rate</span>
                    <span className="text-navy-600">L {exchangeRate.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-navy-900">Total (HNL)</span>
                    <span className="font-bold text-navy-900">L {totalHNL.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* What will be generated */}
              <div className="bg-lime-50/50 rounded-xl p-4 border border-lime-200/50">
                <p className="text-[11px] font-semibold text-navy-700 mb-2">This will generate:</p>
                <div className="flex gap-6 text-[11px] text-navy-600">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-green-600" />
                    <span><strong>BANCO</strong> PDF (export prices, USD)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span><strong>JASON</strong> PDF (internal prices, HNL)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-navy-500" />
                    <span>Upload to SharePoint</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-navy-500" />
                    <span>Email notification</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-sand-200 border-t-lime-400 mb-6"
              />
              <p className="text-[14px] font-semibold text-navy-900 mb-2">Generating Invoice</p>
              <div className="space-y-1 text-[12px] text-navy-400 text-center">
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  Creating BANCO PDF (export prices)...
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                  Creating JASON PDF (internal prices)...
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
                  Uploading to SharePoint...
                </motion.p>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-16">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-6"
              >
                <Check className="w-8 h-8 text-green-600" />
              </motion.div>
              <p className="text-[16px] font-bold text-navy-900 mb-1">Invoice Generated</p>
              <p className="text-[13px] text-navy-400 mb-6">{selectedCAI}</p>
              <div className="flex gap-3">
                <Badge variant="green">BANCO PDF ready</Badge>
                <Badge variant="blue">JASON PDF ready</Badge>
                <Badge variant="gray">Uploaded to SharePoint</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-sand-100 bg-sand-50/50 rounded-b-2xl">
          {step === "review" && (
            <>
              <div className="flex items-center gap-2 text-[11px] text-navy-400">
                <Calculator className="w-3.5 h-3.5" />
                <span>Tax: 18% ISV · Due: 30 days · 2 PDFs (BANCO + JASON)</span>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2.5 text-[13px] text-navy-500 hover:text-navy-700 cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!selectedCAI || shipment.boxes.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-navy-900 bg-lime-400 rounded-lg
                             hover:bg-lime-300 disabled:bg-sand-200 disabled:text-navy-400 cursor-pointer shadow-sm"
                >
                  <DollarSign className="w-4 h-4" />
                  Generate Invoice
                </button>
              </div>
            </>
          )}
          {step === "done" && (
            <div className="flex w-full justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-[13px] font-semibold text-navy-900 bg-lime-400 rounded-lg hover:bg-lime-300 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
