import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Layers, Sprout, Droplets, Bug, Scissors, DollarSign } from "lucide-react";

// Token from .env — never committed to git
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

// Real nursery center — El Olvido, Santa Cruz de Yojoa, Cortés, Honduras
const NURSERY_CENTER: [number, number] = [-87.8500, 14.9700];

// --- Shadehouse data with 4 fields (quadrants) each, containing beds ---
interface BedData {
  id: string;
  name: string;
  type: "Air" | "Ground";
  level: number;
  plant: string;
  status: "active" | "empty" | "harvesting" | "irrigating" | "treating";
  utilization: number;
}

interface FieldData {
  id: string;
  name: string;
  quadrant: "NW" | "NE" | "SW" | "SE";
  beds: BedData[];
}

interface ShadehouseData {
  id: string;
  name: string;
  coordinates: [number, number];
  width: number;
  length: number;
  rotation: number;
  fields: FieldData[];
}

const shadehouses: ShadehouseData[] = [
  {
    id: "SH-N", name: "Shadehouse North",
    coordinates: [-87.8505, 14.9705], width: 40, length: 70, rotation: 15,
    fields: [
      { id: "B-N1", name: "Field N1", quadrant: "NW", beds: [
        { id: "B3A", name: "Bed 3-A", type: "Air", level: 1, plant: "Pothos / Hawaiian", status: "active", utilization: 95 },
        { id: "B3B", name: "Bed 3-B", type: "Air", level: 2, plant: "Pothos / Hawaiian", status: "irrigating", utilization: 90 },
        { id: "B3C", name: "Bed 3-C", type: "Ground", level: 0, plant: "Pothos / Neon", status: "active", utilization: 80 },
      ]},
      { id: "B-N2", name: "Field N2", quadrant: "NE", beds: [
        { id: "B1A", name: "Bed 1-A", type: "Air", level: 1, plant: "Pothos / Marble Queen", status: "treating", utilization: 85 },
        { id: "B1B", name: "Bed 1-B", type: "Ground", level: 0, plant: "Pothos / Jade", status: "active", utilization: 70 },
      ]},
      { id: "B-N3", name: "Field N3", quadrant: "SW", beds: [
        { id: "B4A", name: "Bed 4-A", type: "Air", level: 1, plant: "Pothos / N'Joy", status: "harvesting", utilization: 100 },
        { id: "B4B", name: "Bed 4-B", type: "Air", level: 2, plant: "Pothos / High Color", status: "active", utilization: 60 },
        { id: "B4C", name: "Bed 4-C", type: "Ground", level: 0, plant: "", status: "empty", utilization: 0 },
      ]},
      { id: "B-N4", name: "Field N4", quadrant: "SE", beds: [
        { id: "B2A", name: "Bed 2-A", type: "Air", level: 1, plant: "Pothos / Golden Glen", status: "active", utilization: 75 },
        { id: "B2B", name: "Bed 2-B", type: "Ground", level: 0, plant: "Sansevieria / Sansevieria", status: "active", utilization: 50 },
      ]},
    ],
  },
  {
    id: "SH-S", name: "Shadehouse South",
    coordinates: [-87.8493, 14.9693], width: 35, length: 60, rotation: 15,
    fields: [
      { id: "B-S1", name: "Field S1", quadrant: "NW", beds: [
        { id: "B5A", name: "Bed 5-A", type: "Air", level: 1, plant: "Pothos / Hawaiian", status: "active", utilization: 90 },
        { id: "B5B", name: "Bed 5-B", type: "Air", level: 2, plant: "Pothos / Marble Queen", status: "active", utilization: 85 },
      ]},
      { id: "B-S2", name: "Field S2", quadrant: "NE", beds: [
        { id: "B5C", name: "Bed 5-C", type: "Ground", level: 0, plant: "Pothos / Jade", status: "irrigating", utilization: 70 },
      ]},
      { id: "B-S3", name: "Field S3", quadrant: "SW", beds: [
        { id: "B6A", name: "Bed 6-A", type: "Air", level: 1, plant: "Pothos / Neon", status: "active", utilization: 65 },
      ]},
      { id: "B-S4", name: "Field S4", quadrant: "SE", beds: [
        { id: "B6B", name: "Bed 6-B", type: "Ground", level: 0, plant: "", status: "empty", utilization: 0 },
      ]},
    ],
  },
  {
    id: "SH-E", name: "Shadehouse East",
    coordinates: [-87.8486, 14.9701], width: 35, length: 55, rotation: 15,
    fields: [
      { id: "B-E1", name: "Field E1", quadrant: "NW", beds: [
        { id: "B7A", name: "Bed 7-A", type: "Air", level: 1, plant: "Pothos / Hawaiian", status: "active", utilization: 50 },
      ]},
      { id: "B-E2", name: "Field E2", quadrant: "NE", beds: [
        { id: "B7B", name: "Bed 7-B", type: "Ground", level: 0, plant: "", status: "empty", utilization: 0 },
      ]},
      { id: "B-E3", name: "Field E3", quadrant: "SW", beds: [
        { id: "B8A", name: "Bed 8-A", type: "Air", level: 1, plant: "Pothos / High Color", status: "active", utilization: 40 },
      ]},
      { id: "B-E4", name: "Field E4", quadrant: "SE", beds: [
        { id: "B8B", name: "Bed 8-B", type: "Ground", level: 0, plant: "", status: "empty", utilization: 0 },
      ]},
    ],
  },
];

// Status colors
const statusColors: Record<string, string> = {
  active: "#3d8b40",
  empty: "#566d8a",
  harvesting: "#f59e0b",
  irrigating: "#3b82f6",
  treating: "#dc2626",
};

// Layers
type MapLayer = "plantings" | "irrigation" | "treatments" | "harvest" | "revenue";

const layerConfig: { id: MapLayer; label: string; icon: typeof Sprout; color: string }[] = [
  { id: "plantings", label: "Plantings", icon: Sprout, color: "#3d8b40" },
  { id: "irrigation", label: "Irrigation", icon: Droplets, color: "#3b82f6" },
  { id: "treatments", label: "Treatments", icon: Bug, color: "#dc2626" },
  { id: "harvest", label: "Harvest", icon: Scissors, color: "#f59e0b" },
  { id: "revenue", label: "Revenue", icon: DollarSign, color: "#c4d93e" },
];

// --- Helpers ---
function createQuadrantPolygon(
  center: [number, number],
  widthM: number,
  lengthM: number,
  rotationDeg: number,
  quadrant: "NW" | "NE" | "SW" | "SE",
  gap: number = 1.5 // road width in meters
): [number, number][] {
  const mLat = 111320;
  const mLng = 111320 * Math.cos((center[1] * Math.PI) / 180);
  const hw = widthM / 2 / mLng;
  const hl = lengthM / 2 / mLat;
  const gw = gap / 2 / mLng;
  const gl = gap / 2 / mLat;

  const bounds: Record<string, [number, number, number, number]> = {
    NW: [-hw, gw, gl, hl],
    NE: [gw, hw, gl, hl],
    SW: [-hw, gw, -hl, -gl],
    SE: [gw, hw, -hl, -gl],
  };

  const [x1, x2, y1, y2] = bounds[quadrant];
  const corners: [number, number][] = [
    [x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1],
  ];

  const rad = (rotationDeg * Math.PI) / 180;
  return corners.map(([dx, dy]) => [
    center[0] + dx * Math.cos(rad) - dy * Math.sin(rad),
    center[1] + dx * Math.sin(rad) + dy * Math.cos(rad),
  ]);
}

function createShadehouseOutline(
  center: [number, number],
  widthM: number,
  lengthM: number,
  rotationDeg: number
): [number, number][] {
  const mLat = 111320;
  const mLng = 111320 * Math.cos((center[1] * Math.PI) / 180);
  const hw = widthM / 2 / mLng;
  const hl = lengthM / 2 / mLat;
  const corners: [number, number][] = [
    [-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl], [-hw, -hl],
  ];
  const rad = (rotationDeg * Math.PI) / 180;
  return corners.map(([dx, dy]) => [
    center[0] + dx * Math.cos(rad) - dy * Math.sin(rad),
    center[1] + dx * Math.sin(rad) + dy * Math.cos(rad),
  ]);
}

// --- Component ---
interface NurseryMapProps {
  className?: string;
  onShadehouseClick?: (id: string) => void;
}

export default function NurseryMap({
  className = "",
  onShadehouseClick,
}: NurseryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Set<MapLayer>>(new Set(["plantings"]));
  const [showLayers, setShowLayers] = useState(false);

  const toggleLayer = useCallback((layer: MapLayer) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  // Get color for a bed based on active layer
  const getBedColor = useCallback((bed: BedData): string => {
    if (activeLayers.has("irrigation") && bed.status === "irrigating") return statusColors.irrigating;
    if (activeLayers.has("treatments") && bed.status === "treating") return statusColors.treating;
    if (activeLayers.has("harvest") && bed.status === "harvesting") return statusColors.harvesting;
    if (activeLayers.has("revenue")) {
      if (bed.utilization >= 80) return "#3d8b40";
      if (bed.utilization >= 50) return "#c4d93e";
      if (bed.utilization > 0) return "#f59e0b";
      return "#566d8a";
    }
    if (activeLayers.has("plantings")) {
      if (bed.status === "empty") return "#566d8a";
      return statusColors.active;
    }
    return "#566d8a";
  }, [activeLayers]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!MAPBOX_TOKEN) { setMapError(true); return; }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const m = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: NURSERY_CENTER,
        zoom: 17,
        pitch: 50,
        bearing: -20,
        antialias: true,
        maxZoom: 19,
        minZoom: 14,
        maxBounds: [[-87.86, 14.96], [-87.84, 14.98]],
        collectResourceTiming: false,
      });

      m.on("error", () => setMapError(true));

      m.on("load", () => {
        // 3D terrain
        m.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
        m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

        // --- Shadehouse outlines ---
        const outlineFeatures = shadehouses.map((sh) => ({
          type: "Feature" as const,
          properties: { id: sh.id, name: sh.name },
          geometry: {
            type: "Polygon" as const,
            coordinates: [createShadehouseOutline(sh.coordinates, sh.width, sh.length, sh.rotation)],
          },
        }));

        m.addSource("sh-outlines", {
          type: "geojson",
          data: { type: "FeatureCollection", features: outlineFeatures },
        });

        m.addLayer({
          id: "sh-outlines-fill",
          type: "fill",
          source: "sh-outlines",
          paint: { "fill-color": "#1b2838", "fill-opacity": 0.3 },
        });

        m.addLayer({
          id: "sh-outlines-line",
          type: "line",
          source: "sh-outlines",
          paint: { "line-color": "#c4d93e", "line-width": 2, "line-opacity": 0.8 },
        });

        // --- Field quadrants with beds ---
        const fieldFeatures: GeoJSON.Feature[] = [];
        shadehouses.forEach((sh) => {
          sh.fields.forEach((field) => {
            const avgUtil = field.beds.length > 0
              ? Math.round(field.beds.reduce((s, b) => s + b.utilization, 0) / field.beds.length)
              : 0;
            const primaryStatus = field.beds.find((b) => b.status !== "empty" && b.status !== "active")?.status ||
                                  (field.beds.some((b) => b.status === "active") ? "active" : "empty");
            const primaryPlant = field.beds.find((b) => b.plant)?.plant || "Empty";

            fieldFeatures.push({
              type: "Feature",
              properties: {
                id: field.id,
                name: field.name,
                shadehouse: sh.name,
                quadrant: field.quadrant,
                bedCount: field.beds.length,
                avgUtil,
                primaryStatus,
                primaryPlant,
                color: field.beds.length > 0 ? getBedColor(field.beds[0]) : "#566d8a",
              },
              geometry: {
                type: "Polygon",
                coordinates: [createQuadrantPolygon(sh.coordinates, sh.width, sh.length, sh.rotation, field.quadrant)],
              },
            });
          });
        });

        m.addSource("fields", {
          type: "geojson",
          data: { type: "FeatureCollection", features: fieldFeatures },
        });

        // Extruded field quadrants
        m.addLayer({
          id: "fields-3d",
          type: "fill-extrusion",
          source: "fields",
          paint: {
            "fill-extrusion-color": ["get", "color"],
            "fill-extrusion-height": 4,
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.8,
          },
        });

        // Field outlines
        m.addLayer({
          id: "fields-outline",
          type: "line",
          source: "fields",
          paint: { "line-color": "#ffffff", "line-width": 1, "line-opacity": 0.5 },
        });

        // --- Shadehouse labels ---
        m.addSource("sh-labels", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: shadehouses.map((sh) => {
              const totalBeds = sh.fields.reduce((s, b) => s + b.beds.length, 0);
              const avgUtil = totalBeds > 0
                ? Math.round(sh.fields.reduce((s, b) => s + b.beds.reduce((ss, bb) => ss + bb.utilization, 0), 0) / totalBeds)
                : 0;
              return {
                type: "Feature" as const,
                properties: { label: `${sh.name}\n${totalBeds} beds · ${avgUtil}%` },
                geometry: { type: "Point" as const, coordinates: sh.coordinates },
              };
            }),
          },
        });

        m.addLayer({
          id: "sh-labels",
          type: "symbol",
          source: "sh-labels",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-anchor": "center",
            "text-offset": [0, -2.5],
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "rgba(0,0,0,0.7)",
            "text-halo-width": 1.5,
          },
        });

        // --- Click handler for fields ---
        m.on("click", "fields-3d", (e) => {
          if (!e.features?.[0]) return;
          const props = e.features[0].properties!;
          const shId = shadehouses.find((sh) =>
            sh.fields.some((b) => b.id === props.id)
          )?.id;

          // Find all beds in this field
          const field = shadehouses
            .flatMap((sh) => sh.fields)
            .find((b) => b.id === props.id);

          if (!field) return;

          const bedsHtml = field.beds.map((bed) => `
            <div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #eae8e3;">
              <div style="width:8px;height:8px;border-radius:2px;background:${getBedColor(bed)};"></div>
              <span style="font-size:11px;color:#1b2838;flex:1;">${bed.name}</span>
              <span style="font-size:10px;color:#566d8a;">${bed.plant || "Empty"}</span>
              <span style="font-size:10px;color:#566d8a;font-weight:600;">${bed.utilization}%</span>
            </div>
          `).join("");

          new mapboxgl.Popup({ offset: 15, closeButton: true, maxWidth: "280px" })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family:Inter,sans-serif;padding:4px 0;">
                <div style="font-size:13px;font-weight:700;color:#1b2838;margin-bottom:2px;">${props.name}</div>
                <div style="font-size:11px;color:#566d8a;margin-bottom:8px;">${props.shadehouse} · ${props.bedCount} beds · ${props.avgUtil}% avg</div>
                ${bedsHtml}
              </div>
            `)
            .addTo(m);

          if (shId) onShadehouseClick?.(shId);
        });

        m.on("mouseenter", "fields-3d", () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", "fields-3d", () => { m.getCanvas().style.cursor = ""; });
      });

      m.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current = m;
    } catch {
      setMapError(true);
    }

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // Update field colors when layers change
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;

    const fieldFeatures: GeoJSON.Feature[] = [];
    shadehouses.forEach((sh) => {
      sh.fields.forEach((field) => {
        const avgUtil = field.beds.length > 0
          ? Math.round(field.beds.reduce((s, b) => s + b.utilization, 0) / field.beds.length)
          : 0;
        fieldFeatures.push({
          type: "Feature",
          properties: {
            id: field.id, name: field.name, shadehouse: sh.name, quadrant: field.quadrant,
            bedCount: field.beds.length, avgUtil,
            primaryStatus: field.beds[0]?.status || "empty",
            primaryPlant: field.beds[0]?.plant || "Empty",
            color: field.beds.length > 0 ? getBedColor(field.beds[0]) : "#566d8a",
          },
          geometry: {
            type: "Polygon",
            coordinates: [createQuadrantPolygon(sh.coordinates, sh.width, sh.length, sh.rotation, field.quadrant)],
          },
        });
      });
    });

    const source = map.current.getSource("fields") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({ type: "FeatureCollection", features: fieldFeatures });
    }
  }, [activeLayers, getBedColor]);

  // --- Fallback (no token) ---
  if (mapError) {
    return (
      <div className={`relative rounded-2xl overflow-hidden border border-sand-200 bg-navy-900 ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative flex flex-col items-center justify-center h-full p-6">
          <p className="text-[10px] text-navy-400 uppercase tracking-[0.15em] mb-4">
            Nursery Overview — El Olvido, Honduras
          </p>
          <div className="relative w-full max-w-lg aspect-[4/3]">
            <div className="absolute inset-0 border border-navy-700/30 rounded-lg">
              {[...Array(4)].map((_, i) => (
                <div key={`h${i}`} className="absolute w-full border-t border-navy-700/20" style={{ top: `${(i + 1) * 20}%` }} />
              ))}
              {[...Array(4)].map((_, i) => (
                <div key={`v${i}`} className="absolute h-full border-l border-navy-700/20" style={{ left: `${(i + 1) * 20}%` }} />
              ))}
            </div>
            {shadehouses.map((sh, i) => {
              const positions = [
                { left: "10%", top: "10%", w: "35%", h: "40%" },
                { left: "55%", top: "35%", w: "30%", h: "35%" },
                { left: "20%", top: "55%", w: "30%", h: "35%" },
              ];
              const pos = positions[i] || positions[0];
              const totalBeds = sh.fields.reduce((s, b) => s + b.beds.length, 0);
              return (
                <div key={sh.id} className="absolute rounded-lg border border-lime-400/30 overflow-hidden" style={{ left: pos.left, top: pos.top, width: pos.w, height: pos.h }}>
                  {/* 4 quadrants */}
                  <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-px bg-navy-700/50">
                    {sh.fields.map((field) => (
                      <div key={field.id}
                        className="bg-navy-600/40 flex flex-col items-center justify-center p-1 hover:bg-navy-500/40 transition-colors cursor-pointer"
                        title={`${field.name}: ${field.beds.length} beds`}
                      >
                        <p className="text-[8px] text-lime-400/80 font-medium">{field.quadrant}</p>
                        <p className="text-[7px] text-navy-300">{field.beds.length}b</p>
                      </div>
                    ))}
                  </div>
                  {/* Label overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-white text-[10px] font-semibold drop-shadow-md">{sh.name}</p>
                    <p className="text-lime-400 text-[8px] drop-shadow-md">{totalBeds} beds</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4">
            {[
              { color: "#3d8b40", label: "Growing" },
              { color: "#3b82f6", label: "Irrigating" },
              { color: "#dc2626", label: "Treatment" },
              { color: "#f59e0b", label: "Harvesting" },
              { color: "#566d8a", label: "Empty" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] text-navy-400">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-navy-500 mt-3">Configure Mapbox token in .env for satellite 3D view</p>
        </div>
      </div>
    );
  }

  // --- Main map render ---
  return (
    <div className={`relative rounded-2xl overflow-hidden border border-sand-200/80 ${className}`}>
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 currentColor; }
          70% { box-shadow: 0 0 0 8px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        .mapboxgl-popup-content {
          border-radius: 12px !important;
          padding: 12px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        }
      `}</style>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Layer toggle panel */}
      <div className="absolute top-3 left-3 z-10">
        <button
          onClick={() => setShowLayers(!showLayers)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold shadow-md cursor-pointer transition-colors ${
            showLayers ? "bg-navy-800 text-lime-400" : "bg-white/95 text-navy-800 hover:bg-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Layers
        </button>

        {showLayers && (
          <div className="mt-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-2 min-w-[160px]">
            {layerConfig.map((layer) => {
              const Icon = layer.icon;
              const active = activeLayers.has(layer.id);
              return (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-colors ${
                    active ? "bg-navy-50 text-navy-800" : "text-navy-400 hover:bg-sand-50"
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: active ? layer.color : "#d6d3cc" }}
                  />
                  <Icon className="w-3.5 h-3.5" />
                  {layer.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-3 bg-navy-900/80 backdrop-blur-sm rounded-lg px-3 py-2">
        {[
          { color: "#3d8b40", label: "Growing" },
          { color: "#3b82f6", label: "Irrigating" },
          { color: "#dc2626", label: "Treatment" },
          { color: "#f59e0b", label: "Harvesting" },
          { color: "#566d8a", label: "Empty" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[9px] text-white/70">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
