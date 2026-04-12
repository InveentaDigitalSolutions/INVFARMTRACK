import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Warehouse, Layers } from "lucide-react";

export interface BedOption {
  id: string;
  name: string;
  fieldId: string;
  fieldName: string;
  shadehouseId: string;
  shadehouseName: string;
  type: "Air" | "Ground";
  level: number;
  plant?: string;
}

// Real structure: 1 shadehouse, 4 plots (E3, E1, C3, C1), 120 beds
const plotConfigs = [
  { id: "E3", name: "Plot E3", bedCount: 33, shadehouseId: "SH-1", shadehouseName: "Shadehouse 1" },
  { id: "C3", name: "Plot C3", bedCount: 27, shadehouseId: "SH-1", shadehouseName: "Shadehouse 1" },
  { id: "E1", name: "Plot E1", bedCount: 33, shadehouseId: "SH-1", shadehouseName: "Shadehouse 1" },
  { id: "C1", name: "Plot C1", bedCount: 27, shadehouseId: "SH-1", shadehouseName: "Shadehouse 1" },
];

const varieties = [
  "Pothos / Hawaiian", "Pothos / Marble Queen", "Pothos / Jade",
  "Pothos / N'Joy", "Pothos / Neon", "Pothos / High Color",
  "Pothos / Golden Glen", "Sansevieria / Sansevieria",
];

const nurseryData: BedOption[] = plotConfigs.flatMap((plot) =>
  Array.from({ length: plot.bedCount }, (_, i) => {
    const num = i + 1;
    const seed = plot.id.charCodeAt(0) * 100 + num;
    const isE = plot.id.startsWith("E");
    return {
      id: `${plot.id}-${String(num).padStart(2, "0")}`,
      name: `${plot.id}-${String(num).padStart(2, "0")}`,
      fieldId: plot.id,
      fieldName: plot.name,
      shadehouseId: plot.shadehouseId,
      shadehouseName: plot.shadehouseName,
      type: (isE ? "Air" : "Ground") as "Air" | "Ground",
      level: isE ? (num % 2 === 0 ? 2 : 1) : 0,
      plant: seed % 100 < 75 ? varieties[(seed * 3 + num) % varieties.length] : "",
    };
  })
);

export function getAllBeds(): BedOption[] {
  return nurseryData;
}

interface BedSelectorProps {
  selected: string[];
  onChange: (beds: string[]) => void;
  multiSelect?: boolean;
  label?: string;
}

export default function BedSelector({ selected, onChange, multiSelect = true, label = "Select Beds" }: BedSelectorProps) {
  const [shadehouse, setShadehouse] = useState<string>("SH-1");
  const [field, setField] = useState<string>("");

  const shadehouses = useMemo(() => {
    const map = new Map<string, string>();
    nurseryData.forEach((b) => map.set(b.shadehouseId, b.shadehouseName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, []);

  const fields = useMemo(() => {
    if (!shadehouse) return [];
    const map = new Map<string, { name: string; bedCount: number }>();
    nurseryData.filter((b) => b.shadehouseId === shadehouse).forEach((b) => {
      if (!map.has(b.fieldId)) map.set(b.fieldId, { name: b.fieldName, bedCount: nurseryData.filter((bb) => bb.fieldId === b.fieldId).length });
    });
    return Array.from(map, ([id, data]) => ({ id, ...data }));
  }, [shadehouse]);

  const availableBeds = useMemo(() => {
    if (!shadehouse) return [];
    let beds = nurseryData.filter((b) => b.shadehouseId === shadehouse);
    if (field) beds = beds.filter((b) => b.fieldId === field);
    return beds;
  }, [shadehouse, field]);

  useEffect(() => { setField(""); }, [shadehouse]);

  const toggleBed = (bedId: string) => {
    if (multiSelect) {
      onChange(selected.includes(bedId) ? selected.filter((s) => s !== bedId) : [...selected, bedId]);
    } else {
      onChange([bedId]);
    }
  };

  const selectAllVisible = () => {
    const ids = availableBeds.map((b) => b.id);
    onChange(ids.every((id) => selected.includes(id)) ? selected.filter((s) => !ids.includes(s)) : [...new Set([...selected, ...ids])]);
  };

  const selectField = (fieldId: string) => {
    const ids = nurseryData.filter((b) => b.fieldId === fieldId && b.shadehouseId === shadehouse).map((b) => b.id);
    onChange(ids.every((id) => selected.includes(id)) ? selected.filter((s) => !ids.includes(s)) : [...new Set([...selected, ...ids])]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-medium text-navy-600">{label}</label>
        {selected.length > 0 && <span className="text-[11px] font-semibold text-lime-600">{selected.length} bed{selected.length > 1 ? "s" : ""} selected</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400 pointer-events-none" />
          <select value={shadehouse} onChange={(e) => setShadehouse(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-white text-navy-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400/30">
            <option value="">All Shadehouses</option>
            {shadehouses.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-300 pointer-events-none" />
        </div>
        <div className="relative">
          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400 pointer-events-none" />
          <select value={field} onChange={(e) => setField(e.target.value)} disabled={!shadehouse}
            className="w-full pl-9 pr-8 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-white text-navy-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400/30 disabled:bg-sand-50 disabled:text-navy-300">
            <option value="">All Plots</option>
            {fields.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.bedCount} beds)</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-300 pointer-events-none" />
        </div>
      </div>
      {shadehouse && multiSelect && (
        <div className="flex flex-wrap gap-1.5">
          {fields.map((f) => {
            const ids = nurseryData.filter((b) => b.fieldId === f.id && b.shadehouseId === shadehouse).map((b) => b.id);
            const all = ids.every((id) => selected.includes(id));
            const some = ids.some((id) => selected.includes(id));
            return (
              <button type="button" key={f.id} onClick={() => selectField(f.id)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer ${all ? "bg-navy-700 text-white border-navy-700" : some ? "bg-lime-50 text-navy-700 border-lime-300" : "bg-white text-navy-600 border-sand-200 hover:border-lime-300"}`}>
                {f.name} ({f.bedCount}){all && " ✓"}
              </button>
            );
          })}
          <button type="button" onClick={selectAllVisible} className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-lime-300 text-lime-700 bg-lime-50 hover:bg-lime-100 cursor-pointer">
            {availableBeds.every((b) => selected.includes(b.id)) ? "Deselect All" : "Select All"}
          </button>
        </div>
      )}
      {shadehouse && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-sand-200 bg-sand-50/50 p-2">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-1">
            {availableBeds.map((bed) => {
              const isSelected = selected.includes(bed.id);
              const hasPlant = !!bed.plant;
              return (
                <motion.button type="button" key={bed.id} whileTap={{ scale: 0.95 }} onClick={() => toggleBed(bed.id)}
                  title={`${bed.id} (${bed.type})${bed.plant ? ` — ${bed.plant}` : " — Empty"}`}
                  className={`relative p-1.5 rounded-md text-[9px] font-mono font-medium border transition-all cursor-pointer ${
                    isSelected ? "bg-navy-700 text-white border-navy-700 shadow-sm"
                    : hasPlant ? "bg-white text-navy-700 border-sand-200 hover:border-lime-400"
                    : "bg-sand-100 text-navy-400 border-sand-200 hover:border-navy-300"}`}>
                  {bed.id}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
