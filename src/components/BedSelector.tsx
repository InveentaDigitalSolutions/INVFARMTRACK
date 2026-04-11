import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Warehouse, Layers, BedDouble, CheckSquare, Square } from "lucide-react";

// Nursery structure data — will come from Dataverse later
export interface BedOption {
  id: string;
  name: string;
  batchId: string;
  batchName: string;
  shadehouseId: string;
  shadehouseName: string;
  type: "Air" | "Ground";
  level: number;
  plant?: string;
}

// Full nursery structure with realistic bed numbering
const nurseryData: BedOption[] = [
  // Shadehouse North — Batch N-C1 (Beds 1-10), Batch N-C2 (Beds 11-20), Batch N-C3 (21-30), Batch N-C4 (31-40)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `SHN-C1-B${i + 1}`, name: `Bed ${i + 1}`, batchId: "N-C1", batchName: "Batch C1",
    shadehouseId: "SH-N", shadehouseName: "Shadehouse North", type: (i % 3 === 0 ? "Ground" : "Air") as "Air" | "Ground",
    level: i % 3 === 0 ? 0 : (i % 2 === 0 ? 2 : 1),
    plant: i < 5 ? "Pothos / Hawaiian" : i < 8 ? "Pothos / Marble Queen" : "",
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `SHN-C2-B${i + 11}`, name: `Bed ${i + 11}`, batchId: "N-C2", batchName: "Batch C2",
    shadehouseId: "SH-N", shadehouseName: "Shadehouse North", type: (i % 3 === 0 ? "Ground" : "Air") as "Air" | "Ground",
    level: i % 3 === 0 ? 0 : (i % 2 === 0 ? 2 : 1),
    plant: i < 4 ? "Pothos / Jade" : i < 7 ? "Pothos / N'Joy" : "",
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `SHN-C3-B${i + 21}`, name: `Bed ${i + 21}`, batchId: "N-C3", batchName: "Batch C3",
    shadehouseId: "SH-N", shadehouseName: "Shadehouse North", type: (i % 3 === 0 ? "Ground" : "Air") as "Air" | "Ground",
    level: i % 3 === 0 ? 0 : (i % 2 === 0 ? 2 : 1),
    plant: i < 6 ? "Pothos / High Color" : "",
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `SHN-C4-B${i + 31}`, name: `Bed ${i + 31}`, batchId: "N-C4", batchName: "Batch C4",
    shadehouseId: "SH-N", shadehouseName: "Shadehouse North", type: (i % 3 === 0 ? "Ground" : "Air") as "Air" | "Ground",
    level: i % 3 === 0 ? 0 : 1,
    plant: i < 3 ? "Pothos / Golden Glen" : i < 6 ? "Sansevieria / Sansevieria" : "",
  })),
  // Shadehouse South — Batch S-C1 (41-55), S-C2 (56-70), S-C3 (71-85), S-C4 (86-100)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `SHS-C1-B${i + 41}`, name: `Bed ${i + 41}`, batchId: "S-C1", batchName: "Batch C1",
    shadehouseId: "SH-S", shadehouseName: "Shadehouse South", type: (i % 3 === 0 ? "Ground" : "Air") as "Air" | "Ground",
    level: i % 3 === 0 ? 0 : 1,
    plant: i < 8 ? "Pothos / Hawaiian" : i < 12 ? "Pothos / Neon" : "",
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `SHS-C2-B${i + 56}`, name: `Bed ${i + 56}`, batchId: "S-C2", batchName: "Batch C2",
    shadehouseId: "SH-S", shadehouseName: "Shadehouse South", type: "Air" as const,
    level: i % 2 === 0 ? 1 : 2,
    plant: i < 10 ? "Pothos / Marble Queen" : "",
  })),
  // Shadehouse East — Batch E-C1 (101-115), E-C2 (116-130)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `SHE-C1-B${i + 101}`, name: `Bed ${i + 101}`, batchId: "E-C1", batchName: "Batch C1",
    shadehouseId: "SH-E", shadehouseName: "Shadehouse East", type: "Air" as const,
    level: i % 2 === 0 ? 1 : 2,
    plant: i < 5 ? "Pothos / Hawaiian" : "",
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `SHE-C2-B${i + 116}`, name: `Bed ${i + 116}`, batchId: "E-C2", batchName: "Batch C2",
    shadehouseId: "SH-E", shadehouseName: "Shadehouse East", type: "Ground" as const,
    level: 0,
    plant: "",
  })),
];

export function getAllBeds(): BedOption[] {
  return nurseryData;
}

interface BedSelectorProps {
  selected: string[];
  onChange: (beds: string[]) => void;
  multiSelect?: boolean;
  label?: string;
}

export default function BedSelector({
  selected,
  onChange,
  multiSelect = true,
  label = "Select Beds",
}: BedSelectorProps) {
  const [shadehouse, setShadehouse] = useState<string>("");
  const [batch, setBatch] = useState<string>("");

  // Unique shadehouses
  const shadehouses = useMemo(() => {
    const map = new Map<string, string>();
    nurseryData.forEach((b) => map.set(b.shadehouseId, b.shadehouseName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, []);

  // Batches for selected shadehouse
  const batches = useMemo(() => {
    if (!shadehouse) return [];
    const map = new Map<string, { name: string; bedCount: number; bedRange: string }>();
    const beds = nurseryData.filter((b) => b.shadehouseId === shadehouse);
    beds.forEach((b) => {
      if (!map.has(b.batchId)) {
        const batchBeds = beds.filter((bb) => bb.batchId === b.batchId);
        const nums = batchBeds.map((bb) => parseInt(bb.name.replace("Bed ", "")));
        map.set(b.batchId, {
          name: b.batchName,
          bedCount: batchBeds.length,
          bedRange: `${Math.min(...nums)}-${Math.max(...nums)}`,
        });
      }
    });
    return Array.from(map, ([id, data]) => ({ id, ...data }));
  }, [shadehouse]);

  // Beds for selected batch (or all in shadehouse if no batch)
  const availableBeds = useMemo(() => {
    if (!shadehouse) return [];
    let beds = nurseryData.filter((b) => b.shadehouseId === shadehouse);
    if (batch) beds = beds.filter((b) => b.batchId === batch);
    return beds;
  }, [shadehouse, batch]);

  // Reset batch when shadehouse changes
  useEffect(() => { setBatch(""); }, [shadehouse]);

  const toggleBed = (bedId: string) => {
    if (multiSelect) {
      const next = selected.includes(bedId)
        ? selected.filter((s) => s !== bedId)
        : [...selected, bedId];
      onChange(next);
    } else {
      onChange([bedId]);
    }
  };

  const selectAllVisible = () => {
    const ids = availableBeds.map((b) => b.id);
    const allSelected = ids.every((id) => selected.includes(id));
    if (allSelected) {
      onChange(selected.filter((s) => !ids.includes(s)));
    } else {
      onChange([...new Set([...selected, ...ids])]);
    }
  };

  const selectBatch = (batchId: string) => {
    const ids = nurseryData.filter((b) => b.batchId === batchId && b.shadehouseId === shadehouse).map((b) => b.id);
    const allSelected = ids.every((id) => selected.includes(id));
    if (allSelected) {
      onChange(selected.filter((s) => !ids.includes(s)));
    } else {
      onChange([...new Set([...selected, ...ids])]);
    }
  };

  const selectedCount = selected.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-medium text-navy-600">{label}</label>
        {selectedCount > 0 && (
          <span className="text-[11px] font-semibold text-lime-600">
            {selectedCount} bed{selectedCount > 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      {/* Shadehouse → Batch cascade */}
      <div className="grid grid-cols-2 gap-2">
        {/* Shadehouse dropdown */}
        <div className="relative">
          <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400 pointer-events-none" />
          <select
            value={shadehouse}
            onChange={(e) => setShadehouse(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-white text-navy-900
                       appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400"
          >
            <option value="">All Shadehouses</option>
            {shadehouses.map((sh) => (
              <option key={sh.id} value={sh.id}>{sh.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-300 pointer-events-none" />
        </div>

        {/* Batch dropdown */}
        <div className="relative">
          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400 pointer-events-none" />
          <select
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            disabled={!shadehouse}
            className="w-full pl-9 pr-8 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-white text-navy-900
                       appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400
                       disabled:bg-sand-50 disabled:text-navy-300"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name} (Beds {b.bedRange})</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-300 pointer-events-none" />
        </div>
      </div>

      {/* Quick batch select buttons */}
      {shadehouse && multiSelect && (
        <div className="flex flex-wrap gap-1.5">
          {batches.map((b) => {
            const batchBedIds = nurseryData.filter((bed) => bed.batchId === b.id && bed.shadehouseId === shadehouse).map((bed) => bed.id);
            const allInBatch = batchBedIds.every((id) => selected.includes(id));
            const someInBatch = batchBedIds.some((id) => selected.includes(id));
            return (
              <button
                key={b.id}
                onClick={() => selectBatch(b.id)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer ${
                  allInBatch
                    ? "bg-navy-700 text-white border-navy-700"
                    : someInBatch
                    ? "bg-lime-50 text-navy-700 border-lime-300"
                    : "bg-white text-navy-600 border-sand-200 hover:border-lime-300"
                }`}
              >
                {b.name} ({b.bedRange})
                {allInBatch && " ✓"}
              </button>
            );
          })}
          {availableBeds.length > 0 && (
            <button
              onClick={selectAllVisible}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-lime-300 text-lime-700
                         bg-lime-50 hover:bg-lime-100 transition-colors cursor-pointer"
            >
              {availableBeds.every((b) => selected.includes(b.id)) ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
      )}

      {/* Bed grid */}
      {shadehouse && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-sand-200 bg-sand-50/50 p-2">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1">
            {availableBeds.map((bed) => {
              const isSelected = selected.includes(bed.id);
              const bedNum = bed.name.replace("Bed ", "");
              const hasPlant = !!bed.plant;
              return (
                <motion.button
                  key={bed.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleBed(bed.id)}
                  title={`${bed.name} (${bed.type} L${bed.level})${bed.plant ? ` — ${bed.plant}` : " — Empty"}`}
                  className={`relative p-1.5 rounded-md text-[11px] font-mono font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-navy-700 text-white border-navy-700 shadow-sm"
                      : hasPlant
                      ? "bg-white text-navy-700 border-sand-200 hover:border-lime-400"
                      : "bg-sand-100 text-navy-400 border-sand-200 hover:border-navy-300"
                  }`}
                >
                  {bedNum}
                  {bed.type === "Air" && (
                    <span className={`absolute top-0 right-0 w-1 h-1 rounded-full ${isSelected ? "bg-lime-300" : "bg-blue-400"}`} />
                  )}
                </motion.button>
              );
            })}
          </div>
          <div className="flex gap-3 mt-2 pt-2 border-t border-sand-200 text-[9px] text-navy-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white border border-sand-200" /> Planted</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sand-100 border border-sand-200" /> Empty</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-400" /> Air bed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-navy-700" /> Selected</span>
          </div>
        </div>
      )}
    </div>
  );
}
