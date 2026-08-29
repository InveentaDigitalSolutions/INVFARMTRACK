/**
 * The shadehouse as a shape: what a bed is, where the fields sit, how the
 * cables run above them.
 *
 * This lived in ShadehouseView, which meant the hook that builds the bed set
 * had to import the component to get the field geometry — while the component
 * imported the hook to get the beds. That cycle left `plotConfigs` undefined
 * at module-evaluation time and took the whole app to a blank screen the
 * moment any page pulled it in.
 *
 * Nothing here depends on React. The geometry was measured off the farm plan
 * and is not data anybody types in; everything else about a bed comes from
 * Dataverse.
 */

// Bed data model
export type BedLevel = 0 | 1 | 2 | 3;

/** Nursery uses both round and square hanging pots; the shape is per planting. */
export type PotType = "round" | "square";

export const potTypeLabels: Record<PotType, string> = {
  round: "Round",
  square: "Square",
};

export interface ShadehouseBed {
  bedId: string;
  fieldId: string;
  bedNumber: number;
  /** 0 = ground bed; 1-3 = cable lines strung above that same footprint. */
  level: BedLevel;
  /** Ground beds are planted in soil; air beds carry hanging pots on a cable. */
  type: "ground" | "air";
  widthM: number;
  lengthM: number;
  /** Air beds only — pots hooked along the cable run. */
  potCount?: number;
  /** Air beds only — pot shape chosen when the planting is created. */
  potType?: PotType;
  /** Layers of shade cloth strung over the bed; undefined when not recorded. */
  shade?: ShadeLevel;
  state: "empty" | "planted" | "growing" | "harvest-ready" | "issue";
  variety: string;
  plantedDate: string;
  expectedHarvest: string;
  notes: string;
}

export type ShadeLevel = "Single" | "Double" | "Triple";

/**
 * How much light each layer of cloth takes out, as panel opacity.
 *
 * Not linear: the second layer over an already-shaded bed removes less light
 * than the first did, and drawing it linearly made triple read as near-black.
 */
export const SHADE_OPACITY: Record<ShadeLevel, number> = {
  Single: 0.16,
  Double: 0.30,
  Triple: 0.42,
};

/** The cloth itself, on a bright day. Real shade netting is close to this. */
export const SHADE_COLOR = "#20302a";

/** Cloth sits above the highest cable line, clear of every bed. */
export const SHADE_HEIGHT_M = 3.1;

/** Cable heights above the ground bed, in metres. Measured off the photos. */
export const LEVEL_HEIGHTS_M: Record<BedLevel, number> = { 0: 0, 1: 1.15, 2: 1.75, 3: 2.35 };

export interface PlotConfig {
  id: string;
  position: "NW" | "NE" | "SW" | "SE";
  bedCount: number;
  bedWidth: number;
  bedLength: number;
  label: string;
}

// State colors matching the spec
export const stateColors: Record<string, { fill: string; label: string }> = {
  empty: { fill: "#d1d5db", label: "Empty" },
  planted: { fill: "#86efac", label: "Planted" },
  growing: { fill: "#2dd4bf", label: "Growing" },
  "harvest-ready": { fill: "#fbbf24", label: "Harvest Ready" },
  issue: { fill: "#fca5a5", label: "Issue / Pest" },
};

// Real shadehouse config — 1 shadehouse with 4 fields
export const plotConfigs: PlotConfig[] = [
  { id: "E3", position: "NW", bedCount: 33, bedWidth: 1.20, bedLength: 37.20, label: "Field E3" },
  { id: "C3", position: "NE", bedCount: 27, bedWidth: 1.80, bedLength: 37.20, label: "Field C3" },
  { id: "E1", position: "SW", bedCount: 33, bedWidth: 1.20, bedLength: 37.20, label: "Field E1" },
  { id: "C1", position: "SE", bedCount: 27, bedWidth: 1.80, bedLength: 37.20, label: "Field C1" },
];

/** Posts stand roughly every 3.6 m, whatever the bed pitch. */
export const POST_SPACING_M = 3.6;

export function postEveryFor(fieldId: string): number {
  const field = plotConfigs.find((p) => p.id === fieldId);
  if (!field) return 3;
  return Math.max(1, Math.round(POST_SPACING_M / field.bedWidth));
}

/**
 * Cables are strung THROUGH the posts, so an air bed can only exist where a
 * post line stands — not above every ground bed.
 */
export function isPostLine(bed: ShadehouseBed): boolean {
  return (bed.bedNumber - 1) % postEveryFor(bed.fieldId) === 0;
}

/**
 * Air beds: cable runs carrying hanging pots, strung between posts along the
 * length of the house. How many levels a given post line carries varies — some
 * carry none, others up to three.
 */
export function airLevelsFor(bed: ShadehouseBed, all: ShadehouseBed[]): BedLevel[] {
  if (!isPostLine(bed)) return [];
  // Which levels exist above this row is recorded, not guessed: a hash used to
  // decide it, so the 3D view showed cables the nursery has not strung.
  return all
    .filter((b) => b.fieldId === bed.fieldId && b.bedNumber === bed.bedNumber && b.level > 0)
    .map((b) => b.level)
    .sort((a, z) => a - z);
}
