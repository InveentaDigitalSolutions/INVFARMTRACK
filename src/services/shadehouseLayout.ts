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
  /** Every variety standing on the bed; `variety` is these joined for display. */
  varieties?: string[];
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
  // Bed widths are Santiago's and the survey confirms them: 120 beds at these
  // widths measure 88.20 m, which with the 16.08 m road is the 104.28 m the
  // survey gives across. Bed length was 37.20 m, measured off a photograph;
  // the survey makes it 79.06 m — the model was less than half the real run.
  { id: "E3", position: "NW", bedCount: 33, bedWidth: 1.20, bedLength: 79.06, label: "E3" },
  { id: "C3", position: "NE", bedCount: 27, bedWidth: 1.80, bedLength: 79.06, label: "C3" },
  { id: "E1", position: "SW", bedCount: 33, bedWidth: 1.20, bedLength: 79.06, label: "E1" },
  { id: "C1", position: "SE", bedCount: 27, bedWidth: 1.80, bedLength: 79.06, label: "C1" },
];

/**
 * The posts, counted by Santiago and confirmed by the survey.
 *
 * Twelve post lines run north-south, spaced across the 104.28 m width; nineteen
 * run east-west, spaced along the 174.20 m length. That gives 228 posts and
 * bays of 9.48 m and 9.68 m — which is the 9.72 m the survey measures.
 *
 * Read the other way round the numbers give 15.8 m and 5.8 m, which the
 * survey's uniform grid rules out.
 */
export const POSTS_ACROSS = 12;
export const POSTS_ALONG = 19;

/**
 * The structural bay, measured from the survey.
 *
 * The topographic survey (Topografía CAPAZ, July 2025, 1:830) shows an 11 x 19
 * post grid over the existing nurseries at a spacing that varies by less than
 * 0.2% across the whole block. This replaces a guessed 3.6 m.
 */
export const POST_SPACING_M = 9.72;

/**
 * The shadehouse envelope, measured rather than inferred.
 *
 * These come out of the survey's vector geometry, not off a photograph, and
 * they close on the bed arithmetic exactly: 33 x 1.20 + 16.08 + 27 x 1.80 =
 * 104.28 across, and 79.06 + 16.08 + 79.06 = 174.20 along.
 */
export const BLOCK_ACROSS_M = 104.28;
export const BLOCK_ALONG_M = 174.20;

/** Degrees the structure sits off grid north. The model draws it square. */
export const BLOCK_BEARING_DEG = 72;

/**
 * The floor is not level: it falls this far from one end to the other.
 *
 * Measured across the block's real extent. An earlier figure of 3.5 m was taken
 * around the wrong centre — the label sits off the middle of the block.
 */
export const FLOOR_FALL_M = 4.0;
export const FLOOR_RANGE_M = { low: 565.0, high: 569.0 };

export function postEveryFor(fieldId: string): number {
  const field = plotConfigs.find((p) => p.id === fieldId);
  if (!field) return 3;
  return Math.max(1, Math.round(POST_SPACING_M / field.bedWidth));
}

/**
 * The bed rows a post line actually falls on, per field.
 *
 * A cable is strung between posts, so an air bed can only hang above a row that
 * has one. Working it out from the surveyed post positions rather than from a
 * modulo means the answer is where the posts are, not where a round number
 * would put them: E rows 1, 8, 16, 24, 32 and C rows 1, 6, 12, 17, 22.
 */
export function postRowsIn(fieldId: string): number[] {
  const field = plotConfigs.find((p) => p.id === fieldId);
  if (!field) return [];

  // Fields are laid west to east: E beds, the road, then C beds.
  const west = plotConfigs.filter((p) => p.position === "NW" || p.position === "SW");
  const isWest = west.some((p) => p.id === fieldId);
  const westWidth = Math.max(...west.map((p) => p.bedCount * p.bedWidth));
  const start = isWest
    ? -BLOCK_ACROSS_M / 2
    : -BLOCK_ACROSS_M / 2 + westWidth + (BLOCK_ACROSS_M - westWidth -
        Math.max(...plotConfigs.filter((p) => !west.includes(p)).map((p) => p.bedCount * p.bedWidth)));

  const rows = new Set<number>();
  for (const x of postLinesAcross()) {
    const row = Math.round((x - start) / field.bedWidth + 0.5);
    if (row >= 1 && row <= field.bedCount) rows.add(row);
  }
  return [...rows].sort((a, b) => a - b);
}

/**
 * Cables are strung THROUGH the posts, so an air bed can only exist where a
 * post line stands — not above every ground bed.
 */
export function isPostLine(bed: ShadehouseBed): boolean {
  return postRowsIn(bed.fieldId).includes(bed.bedNumber);
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

/** Where the post lines fall across the block, in model x. */
export function postLinesAcross(): number[] {
  const step = BLOCK_ACROSS_M / (POSTS_ACROSS - 1);
  return Array.from({ length: POSTS_ACROSS }, (_, i) => -BLOCK_ACROSS_M / 2 + i * step);
}

/** Where the post lines fall along the block, in model z. */
export function postLinesAlong(): number[] {
  const step = BLOCK_ALONG_M / (POSTS_ALONG - 1);
  return Array.from({ length: POSTS_ALONG }, (_, i) => -BLOCK_ALONG_M / 2 + i * step);
}
