import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Boxes,
  ChevronDown,
  Zap,
  Check,
  AlertCircle,
} from "lucide-react";

interface PackingEntry {
  id: string;
  barcode: string;
  boxNumber: number;
  plant: string;
  bed: string;
  shadehouse: string;
  size: string;
  packingType: string;
  bundleSize: number;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  packedBy: string;
  workerId: string;
  productType: string;
  cuttingType: string;
  completed: boolean;
}

interface QuickPackFormProps {
  onGenerate: (entries: PackingEntry[]) => void;
  onCancel: () => void;
  existingBoxCount?: number;
}

// Dummy data for dropdowns
const plants = [
  "Pothos / Hawaiian",
  "Pothos / Marble Queen",
  "Pothos / Jade",
  "Pothos / N'Joy",
  "Pothos / Golden Glen",
];

const beds = [
  { id: "bed-3a", label: "Bed 3-A", batch: "B-2026-N1", shadehouse: "Shadehouse North" },
  { id: "bed-1b", label: "Bed 1-B", batch: "B-2026-N2", shadehouse: "Shadehouse North" },
  { id: "bed-5c", label: "Bed 5-C", batch: "B-2026-S1", shadehouse: "Shadehouse South" },
  { id: "bed-2a", label: "Bed 2-A", batch: "B-2026-S1", shadehouse: "Shadehouse South" },
  { id: "bed-4b", label: "Bed 4-B", batch: "B-2026-E1", shadehouse: "Shadehouse East" },
];

const sizes = ["Petit", "Mini Petit", "Small", "Medium", "California", "Large", "Extra Large"];
const workers = [
  { name: "Carlos M.", id: "W001" },
  { name: "Maria L.", id: "W002" },
  { name: "Juan P.", id: "W003" },
  { name: "Ana R.", id: "W004" },
];

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-navy-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-sand-200 bg-white
                     appearance-none focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400
                     text-navy-900 cursor-pointer"
        >
          <option value="">Select...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300 pointer-events-none" />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  placeholder = "",
  suffix = "",
  required = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  placeholder?: string;
  suffix?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-navy-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-sand-200 bg-white
                     focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400
                     text-navy-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-navy-300">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function QuickPackForm({
  onGenerate,
  onCancel,
  existingBoxCount = 0,
}: QuickPackFormProps) {
  const [plant, setPlant] = useState("");
  const [bed, setBed] = useState("");
  const [size, setSize] = useState("");
  const [packingType, setPackingType] = useState("BNDL");
  const [bundleSize, setBundleSize] = useState(3);
  const [productType, setProductType] = useState("URC");
  const [cuttingType, setCuttingType] = useState("L/E");
  const [quantity, setQuantity] = useState(2000);
  const [grossWeight, setGrossWeight] = useState(8);
  const [netWeight, setNetWeight] = useState(7);
  const [worker, setWorker] = useState("");
  const [boxCount, setBoxCount] = useState(1);
  const [generated, setGenerated] = useState(false);

  const selectedBed = beds.find((b) => b.id === bed);
  const selectedWorker = workers.find((w) => w.name === worker);

  const isValid = plant && bed && size && boxCount > 0 && quantity > 0 && worker;

  const totalStems = boxCount * quantity;
  const totalGW = boxCount * grossWeight;
  const totalNW = boxCount * netWeight;
  const startBox = existingBoxCount + 1;
  const endBox = existingBoxCount + boxCount;
  const boxRange = boxCount === 1
    ? String(startBox).padStart(2, "0")
    : `${String(startBox).padStart(2, "0")}-${String(endBox).padStart(2, "0")}`;

  const handleGenerate = () => {
    if (!isValid) return;

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const entries: PackingEntry[] = Array.from({ length: boxCount }, (_, i) => {
      const num = existingBoxCount + i + 1;
      return {
        id: `BX-${String(num).padStart(3, "0")}`,
        barcode: `HN${today}${String(num).padStart(3, "0")}`,
        boxNumber: num,
        plant,
        bed: selectedBed?.label || bed,
        shadehouse: selectedBed?.shadehouse || "",
        size,
        packingType,
        bundleSize: packingType === "BNDL" ? bundleSize : 0,
        quantity,
        grossWeight,
        netWeight,
        packedBy: worker,
        workerId: selectedWorker?.id || "",
        productType,
        cuttingType,
        completed: false,
      };
    });

    setGenerated(true);
    setTimeout(() => {
      onGenerate(entries);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-white rounded-2xl border border-sand-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-navy-800 to-navy-700">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Quick Pack</h3>
          <p className="text-xs text-navy-400">
            Fill once, generate multiple boxes
          </p>
        </div>
      </div>

      <div className="p-6">
        {/* Product section */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3">
            Product
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Plant / Variety"
              value={plant}
              onChange={setPlant}
              options={plants.map((p) => ({ value: p, label: p }))}
              required
            />
            <SelectField
              label="Source Bed"
              value={bed}
              onChange={setBed}
              options={beds.map((b) => ({
                value: b.id,
                label: `${b.label} (${b.shadehouse})`,
              }))}
              required
            />
            <SelectField
              label="Size"
              value={size}
              onChange={setSize}
              options={sizes.map((s) => ({ value: s, label: s }))}
              required
            />
          </div>
          {selectedBed && (
            <p className="text-xs text-navy-400 mt-2">
              {selectedBed.shadehouse} / {selectedBed.batch} / {selectedBed.label}
            </p>
          )}
        </div>

        {/* Packing details */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3">
            Packing Details
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SelectField
              label="Product Type"
              value={productType}
              onChange={setProductType}
              options={[{ value: "URC", label: "URC (Unrooted Cutting)" }]}
            />
            <SelectField
              label="Cutting Type"
              value={cuttingType}
              onChange={setCuttingType}
              options={[{ value: "L/E", label: "L/E (Leaf & Eye)" }]}
            />
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">
                Packing Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {["BNDL", "IND"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setPackingType(t)}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                      packingType === t
                        ? "bg-navy-700 text-white border-navy-700"
                        : "bg-white text-navy-700 border-sand-200 hover:border-lime-300"
                    }`}
                  >
                    {t === "BNDL" ? "Bundle" : "Individual"}
                  </button>
                ))}
              </div>
            </div>
            {packingType === "BNDL" && (
              <div>
                <label className="block text-xs font-medium text-navy-700 mb-1">
                  Bundle Size
                </label>
                <div className="flex gap-2">
                  {[3, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setBundleSize(s)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                        bundleSize === s
                          ? "bg-navy-700 text-white border-navy-700"
                          : "bg-white text-navy-700 border-sand-200 hover:border-lime-300"
                      }`}
                    >
                      x{s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Box details */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3">
            Box Details
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NumberField
              label="Stems per Box"
              value={quantity}
              onChange={setQuantity}
              min={1}
              required
            />
            <NumberField
              label="Gross Weight"
              value={grossWeight}
              onChange={setGrossWeight}
              min={0}
              suffix="kg"
            />
            <NumberField
              label="Net Weight"
              value={netWeight}
              onChange={setNetWeight}
              min={0}
              suffix="kg"
            />
            <SelectField
              label="Packed By"
              value={worker}
              onChange={setWorker}
              options={workers.map((w) => ({
                value: w.name,
                label: `${w.name} (${w.id})`,
              }))}
              required
            />
          </div>
        </div>

        {/* Box count — the hero input */}
        <div className="mb-6 p-5 bg-lime-50/50 rounded-xl border border-lime-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-navy-800 mb-2">
                How many boxes?
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBoxCount(Math.max(1, boxCount - 1))}
                  className="w-10 h-10 rounded-lg border border-lime-300 bg-white text-navy-700
                             text-lg font-bold hover:bg-lime-50 transition-colors cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  value={boxCount}
                  onChange={(e) => setBoxCount(Math.max(1, Number(e.target.value)))}
                  className="w-20 text-center text-2xl font-bold text-navy-900 bg-white
                             border border-lime-300 rounded-lg py-1.5 focus:outline-none focus:ring-2
                             focus:ring-lime-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setBoxCount(boxCount + 1)}
                  className="w-10 h-10 rounded-lg border border-lime-300 bg-white text-navy-700
                             text-lg font-bold hover:bg-lime-50 transition-colors cursor-pointer"
                >
                  +
                </button>
                {/* Quick presets */}
                <div className="flex gap-1.5 ml-3">
                  {[5, 10, 17, 25, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBoxCount(n)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                        boxCount === n
                          ? "bg-navy-700 text-white border-navy-700"
                          : "bg-white text-navy-500 border-green-200 hover:border-lime-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview summary */}
        <AnimatePresence>
          {isValid && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-4 bg-sand-50 rounded-xl border border-sand-200">
                <p className="text-xs font-semibold text-navy-700 uppercase tracking-wider mb-3">
                  Preview — {boxCount} box{boxCount > 1 ? "es" : ""} will be created
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-navy-400">Box Range</p>
                    <p className="font-semibold text-navy-900">{boxRange}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-400">Total Stems</p>
                    <p className="font-semibold text-navy-900">
                      {totalStems.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-400">Total Gross Weight</p>
                    <p className="font-semibold text-navy-900">{totalGW} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-400">Total Net Weight</p>
                    <p className="font-semibold text-navy-900">{totalNW} kg</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-white rounded-lg border border-sand-100 text-xs text-navy-700 font-mono">
                  {plant} {productType} {cuttingType} {size.toUpperCase()}{" "}
                  {packingType === "BNDL" ? `${bundleSize} BNDL` : "IND"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-navy-500 hover:text-navy-800
                       transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={!isValid || generated}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg
                        transition-all cursor-pointer ${
                          generated
                            ? "bg-lime-500 text-white"
                            : isValid
                            ? "bg-navy-700 text-white hover:bg-navy-600 shadow-sm hover:shadow-md"
                            : "bg-sand-200 text-navy-300 cursor-not-allowed"
                        }`}
          >
            {generated ? (
              <>
                <Check className="w-4 h-4" />
                {boxCount} Boxes Generated!
              </>
            ) : (
              <>
                <Boxes className="w-4 h-4" />
                Generate {boxCount} Box{boxCount > 1 ? "es" : ""}
              </>
            )}
          </button>
        </div>

        {!isValid && plant && (
          <div className="flex items-center gap-2 mt-3 text-xs text-amber-600">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Fill all required fields to generate boxes</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
