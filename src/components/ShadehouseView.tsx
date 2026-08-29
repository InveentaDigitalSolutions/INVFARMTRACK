import { useState, useMemo } from "react";
import { useShadehouseBeds } from "../hooks/useShadehouseBeds";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Droplets, Bug, Scissors, Sprout, Leaf, FlaskConical,
  ChevronDown, Clock,
} from "lucide-react";

export * from "../services/shadehouseLayout";
import {
  plotConfigs, stateColors, type ShadehouseBed,
} from "../services/shadehouseLayout";

const activityIcons: Record<string, { icon: typeof Sprout; color: string; bg: string }> = {
  planting: { icon: Sprout, color: "text-green-600", bg: "bg-green-50" },
  treatment: { icon: Bug, color: "text-red-500", bg: "bg-red-50" },
  irrigation: { icon: Droplets, color: "text-blue-500", bg: "bg-blue-50" },
  harvest: { icon: Scissors, color: "text-amber-500", bg: "bg-amber-50" },
  fertilization: { icon: FlaskConical, color: "text-lime-600", bg: "bg-lime-50" },
  pruning: { icon: Leaf, color: "text-green-500", bg: "bg-green-50" },
};

const timeRanges = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

interface ShadehouseViewProps {
  className?: string;
  onBedClick?: (bed: ShadehouseBed) => void;
}

export default function ShadehouseView({ className = "", onBedClick }: ShadehouseViewProps) {
  const { beds, historyFor, isEmpty } = useShadehouseBeds();
  const [selectedBed, setSelectedBed] = useState<ShadehouseBed | null>(null);
  const [hoveredBed, setHoveredBed] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string | null>(null);
  const [filterVariety, setFilterVariety] = useState<string | null>(null);
  const [selectedBeds, setSelectedBeds] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState("30");
  const [activityFilter, setActivityFilter] = useState<string | null>(null);

  // Everything recorded against the selected bed. Where a generator used to
  // stand there is now the record, so an empty bed reads as empty.
  const bedHistory = useMemo(() => {
    if (!selectedBed) return [];
    const all = historyFor(selectedBed.bedId);
    const cutoff = new Date();
    if (timeRange !== "all") {
      cutoff.setDate(cutoff.getDate() - parseInt(timeRange));
      return all.filter((a) => {
        if (activityFilter && a.type !== activityFilter) return false;
        return a.date >= cutoff.toISOString().slice(0, 10);
      });
    }
    if (activityFilter) return all.filter((a) => a.type === activityFilter);
    return all;
  }, [selectedBed, timeRange, activityFilter, historyFor]);

  const varieties = useMemo(() => {
    const set = new Set<string>();
    beds.forEach((b) => { if (b.variety) set.add(b.variety); });
    return Array.from(set).sort();
  }, [beds]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(stateColors).forEach((s) => { counts[s] = 0; });
    beds.forEach((b) => { counts[b.state] = (counts[b.state] || 0) + 1; });
    return counts;
  }, [beds]);

  const isFiltered = (bed: ShadehouseBed) => {
    if (filterState && bed.state !== filterState) return false;
    if (filterVariety && bed.variety !== filterVariety) return false;
    return true;
  };

  const handleBedClick = (bed: ShadehouseBed) => {
    setSelectedBed(bed);
    onBedClick?.(bed);
  };

  const toggleBedSelection = (bedId: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      setSelectedBeds((prev) => {
        const next = new Set(prev);
        if (next.has(bedId)) next.delete(bedId);
        else next.add(bedId);
        return next;
      });
    } else {
      const bed = beds.find((b) => b.bedId === bedId);
      if (bed) handleBedClick(bed);
    }
  };

  // SVG dimensions
  const svgWidth = 720;
  const svgHeight = 500;
  const roadWidth = 16;
  const padding = 30;
  const plotGap = 8;

  // Calculate field areas
  const halfW = (svgWidth - padding * 2 - roadWidth) / 2;
  const halfH = (svgHeight - padding * 2 - roadWidth - 40) / 2; // 40 for labels

  const plotAreas: Record<string, { x: number; y: number; w: number; h: number }> = {
    NW: { x: padding, y: padding + 20, w: halfW, h: halfH },
    NE: { x: padding + halfW + roadWidth, y: padding + 20, w: halfW, h: halfH },
    SW: { x: padding, y: padding + 20 + halfH + roadWidth, w: halfW, h: halfH },
    SE: { x: padding + halfW + roadWidth, y: padding + 20 + halfH + roadWidth, w: halfW, h: halfH },
  };

  return (
    <div className={`bg-white rounded-xl border border-sand-200/80 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-sand-100 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-navy-900">Shadehouse Layout</h3>
          <p className="text-[11px] text-navy-400">
            {isEmpty
              ? "No beds recorded yet — add them under Infrastructure"
              : `${beds.length} beds across ${new Set(beds.map((b) => b.fieldId)).size} fields — click a bed for details, shift+click to multi-select`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* State filter */}
          <select
            value={filterState || ""}
            onChange={(e) => setFilterState(e.target.value || null)}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-sand-200 bg-white text-navy-700 cursor-pointer focus:outline-none"
          >
            <option value="">All States</option>
            {Object.entries(stateColors).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          {/* Variety filter */}
          <select
            value={filterVariety || ""}
            onChange={(e) => setFilterVariety(e.target.value || null)}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-sand-200 bg-white text-navy-700 cursor-pointer focus:outline-none"
          >
            <option value="">All Varieties</option>
            {varieties.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          {selectedBeds.size > 0 && (
            <span className="text-[11px] font-semibold text-lime-600 bg-lime-50 px-2 py-1 rounded-lg">
              {selectedBeds.size} selected
            </span>
          )}
        </div>
      </div>

      {/* SVG Layout */}
      <div className="p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="shadehouse-svg w-full max-w-3xl mx-auto" style={{ minWidth: 500 }}>
          {/* Background */}
          <rect x="0" y="0" width={svgWidth} height={svgHeight} className="sh-bg" fill="#f9fafb" rx="8" />

          {/* Compass */}
          <g transform={`translate(${svgWidth - 40}, 30)`}>
            <text x="0" y="-8" textAnchor="middle" className="sh-label" fill="#7e92ab" fontSize="8" fontWeight="bold">N</text>
            <polygon points="0,-5 3,5 -3,5" className="sh-label" fill="#7e92ab" />
          </g>

          {/* Roads */}
          {/* Vertical road */}
          <rect
            x={padding + halfW}
            y={padding + 15}
            width={roadWidth}
            height={svgHeight - padding * 2 - 15}
            className="sh-road"
            fill="#e5e7eb"
            rx="2"
          />
          <line x1={padding + halfW + roadWidth / 2} y1={padding + 20} x2={padding + halfW + roadWidth / 2} y2={svgHeight - padding}
            className="sh-road-line" stroke="#d1d5db" strokeWidth="1" strokeDasharray="4 3" />

          {/* Horizontal road */}
          <rect
            x={padding - 5}
            y={padding + 20 + halfH}
            width={svgWidth - padding * 2 + 10}
            height={roadWidth}
            className="sh-road"
            fill="#e5e7eb"
            rx="2"
          />
          <line x1={padding} y1={padding + 20 + halfH + roadWidth / 2} x2={svgWidth - padding} y2={padding + 20 + halfH + roadWidth / 2}
            className="sh-road-line" stroke="#d1d5db" strokeWidth="1" strokeDasharray="4 3" />

          {/* Road labels */}
          <text x={padding + halfW + roadWidth / 2} y={svgHeight - padding + 12} textAnchor="middle" className="sh-label" fill="#9ca3af" fontSize="7">Logistics Road</text>

          {/* Fields and beds */}
          {plotConfigs.map((field) => {
            const area = plotAreas[field.position];
            const plotBeds = beds.filter((b) => b.fieldId === field.id);
            const bedW = (area.w - plotGap * 2) / field.bedCount;
            const bedH = area.h - plotGap * 2 - 12;

            return (
              <g key={field.id}>
                {/* Field outline */}
                <rect
                  x={area.x} y={area.y} width={area.w} height={area.h}
                  className="sh-field-outline" fill="none" stroke="#cbd5e1" strokeWidth="1" rx="4"
                />
                {/* Field label */}
                <text
                  x={area.x + area.w / 2}
                  y={area.y + 10}
                  textAnchor="middle"
                  className="sh-field-label"
                  fill="#3a506b"
                  fontSize="9"
                  fontWeight="600"
                >
                  {field.label} ({field.bedCount} beds · {field.bedWidth}m wide)
                </text>

                {/* Individual beds */}
                {plotBeds.map((bed, i) => {
                  const bx = area.x + plotGap + i * bedW;
                  const by = area.y + plotGap + 14;
                  const bw = Math.max(bedW - 0.8, 1);
                  const filtered = isFiltered(bed);
                  const isHovered = hoveredBed === bed.bedId;
                  const isSelected = selectedBeds.has(bed.bedId);
                  const color = stateColors[bed.state]?.fill || "#d1d5db";

                  return (
                    <g
                      key={bed.bedId}
                      data-bed-id={bed.bedId}
                      onClick={(e) => toggleBedSelection(bed.bedId, e)}
                      onMouseEnter={() => setHoveredBed(bed.bedId)}
                      onMouseLeave={() => setHoveredBed(null)}
                      style={{ cursor: "pointer" }}
                    >
                      <rect
                        x={bx}
                        y={by}
                        width={bw}
                        height={bedH}
                        fill={color}
                        opacity={filtered ? (isHovered ? 1 : 0.85) : 0.15}
                        rx="1"
                        stroke={isSelected ? "#c4d93e" : isHovered ? "#1b2838" : "none"}
                        strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0}
                      />
                      {/* Bed number (show every bed if space, else every 5th) */}
                      {(bw > 5 || bed.bedNumber % 5 === 0 || bed.bedNumber === 1 || bed.bedNumber === field.bedCount) && (
                        <text
                          x={bx + bw / 2}
                          y={by + bedH + 9}
                          textAnchor="middle"
                          fill={filtered ? "#566d8a" : "#d1d5db"}
                          fontSize={bw > 8 ? "6" : "5"}
                        >
                          {bed.bedNumber}
                        </text>
                      )}
                      {/* Tooltip on hover */}
                      {isHovered && filtered && (
                        <g>
                          <rect
                            x={Math.min(bx, svgWidth - 140)}
                            y={by - 32}
                            width="130"
                            height="28"
                            fill="#1b2838"
                            rx="4"
                            opacity="0.95"
                          />
                          <text
                            x={Math.min(bx + 4, svgWidth - 136)}
                            y={by - 20}
                            fill="#ffffff"
                            fontSize="7"
                            fontWeight="600"
                          >
                            {bed.bedId} — {stateColors[bed.state].label}
                          </text>
                          <text
                            x={Math.min(bx + 4, svgWidth - 136)}
                            y={by - 11}
                            fill="#b0becf"
                            fontSize="6"
                          >
                            {bed.variety || "No variety assigned"}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend + Stats */}
      <div className="px-4 py-3 border-t border-sand-100 flex items-center justify-between">
        <div className="flex gap-3">
          {Object.entries(stateColors).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setFilterState(filterState === key ? null : key)}
              className={`flex items-center gap-1.5 text-[10px] cursor-pointer transition-opacity ${
                filterState && filterState !== key ? "opacity-40" : ""
              }`}
            >
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: val.fill }} />
              <span className="text-navy-600">{val.label}</span>
              <span className="text-navy-400 font-mono">({stats[key]})</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-navy-400">Total: {beds.length} beds</span>
      </div>

      {/* Bed detail + history panel */}
      <AnimatePresence>
        {selectedBed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-sand-100 overflow-hidden"
          >
            <div className="bg-sand-50/50">
              {/* Bed info header */}
              <div className="px-4 py-3 border-b border-sand-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-[14px] font-bold text-navy-900">
                      {selectedBed.bedId}
                    </h4>
                    <p className="text-[11px] text-navy-400">
                      Field {selectedBed.fieldId} · Bed #{selectedBed.bedNumber} · {selectedBed.widthM}m × {selectedBed.lengthM}m
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelectedBed(null); setActivityFilter(null); }}
                    className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-sand-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[12px]">
                  <div>
                    <p className="text-navy-400 text-[10px] uppercase tracking-wider">State</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: stateColors[selectedBed.state].fill }} />
                      <span className="font-semibold text-navy-800">{stateColors[selectedBed.state].label}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-navy-400 text-[10px] uppercase tracking-wider">Variety</p>
                    <p className="font-semibold text-navy-800 mt-1">{selectedBed.variety || "—"}</p>
                  </div>
                  <div>
                    <p className="text-navy-400 text-[10px] uppercase tracking-wider">Planted</p>
                    <p className="font-semibold text-navy-800 mt-1">{selectedBed.plantedDate || "—"}</p>
                  </div>
                  <div>
                    <p className="text-navy-400 text-[10px] uppercase tracking-wider">Expected Harvest</p>
                    <p className="font-semibold text-navy-800 mt-1">{selectedBed.expectedHarvest || "—"}</p>
                  </div>
                  <div>
                    <p className="text-navy-400 text-[10px] uppercase tracking-wider">Notes</p>
                    <p className="font-semibold text-navy-800 mt-1">{selectedBed.notes || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Activity history */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-navy-400" />
                    <h5 className="text-[12px] font-semibold text-navy-800">Activity History</h5>
                    <span className="text-[10px] text-navy-400 bg-sand-100 px-1.5 py-0.5 rounded-full">
                      {bedHistory.length} events
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Activity type filter */}
                    <div className="flex gap-1">
                      {Object.entries(activityIcons).map(([type, config]) => {
                        const Icon = config.icon;
                        const isActive = activityFilter === type;
                        return (
                          <button
                            key={type}
                            onClick={() => setActivityFilter(isActive ? null : type)}
                            title={type}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              isActive
                                ? `${config.bg} ${config.color}`
                                : activityFilter
                                ? "text-navy-300 hover:text-navy-500"
                                : "text-navy-400 hover:text-navy-600 hover:bg-sand-100"
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                          </button>
                        );
                      })}
                    </div>
                    {/* Time range */}
                    <div className="relative">
                      <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="text-[10px] pl-2 pr-6 py-1 rounded-lg border border-sand-200 bg-white text-navy-700
                                   appearance-none cursor-pointer focus:outline-none"
                      >
                        {timeRanges.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-navy-300 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Activity timeline */}
                <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
                  {bedHistory.length > 0 ? (
                    bedHistory.map((activity, i) => {
                      const config = activityIcons[activity.type];
                      const Icon = config.icon;
                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-white transition-colors group"
                        >
                          {/* Timeline dot */}
                          <div className={`flex items-center justify-center w-6 h-6 rounded-lg ${config.bg} shrink-0 mt-0.5`}>
                            <Icon className={`w-3 h-3 ${config.color}`} />
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[12px] font-medium text-navy-800">{activity.description}</p>
                              <span className="text-[9px] text-navy-300 font-mono">{activity.date}</span>
                            </div>
                            <p className="text-[11px] text-navy-500 mt-0.5">{activity.details}</p>
                          </div>
                          {/* Worker */}
                          <span className="text-[10px] text-navy-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {activity.worker}
                          </span>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center py-8 text-[12px] text-navy-400">
                      No activities in this time range
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
