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

/**
 * The levels a bed can occupy: the ground, and two cable lines above it.
 *
 * Level 3 is not a bed. It is where the irrigation line runs, above everything
 * that grows — which is why it has a height but never a crop.
 */
export const BED_LEVELS: BedLevel[] = [0, 1, 2];

/** The irrigation line's level. Always a pipe, never a bed. */
export const IRRIGATION_LEVEL: BedLevel = 3;

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
  /** 0 = ground bed; 1-2 = cable lines above the same footprint. Never 3. */
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

/**
 * Heights above the ground bed, in metres.
 *
 * 1 and 2 are the cable lines that carry hanging pots. 3 is the irrigation
 * line, which runs above them and holds no crop.
 */
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
  // Side by side across the house, all beds running its full length. The
  // quadrant positions are kept only because the plan view still reads them.
  // One field to a quadrant, which is what the cross of roads is for. Bed
  // length is the quadrant's depth: half the house, less half a road.
  // One field to a quadrant. A bed runs the quadrant's width; the beds stack
  // across its 47.40 m depth. bedLength here is nominal — the real length is
  // the quadrant's width, which differs between the E and C sides.
  { id: "E3", position: "NW", bedCount: 33, bedWidth: 1.20, bedLength: 77.42, label: "E3" },
  { id: "C3", position: "NE", bedCount: 27, bedWidth: 1.80, bedLength: 87.10, label: "C3" },
  { id: "E1", position: "SW", bedCount: 33, bedWidth: 1.20, bedLength: 77.42, label: "E1" },
  { id: "C1", position: "SE", bedCount: 27, bedWidth: 1.80, bedLength: 87.10, label: "C1" },
];

/**
 * The posts, counted by Santiago and confirmed by the survey.
 *
 * Twelve stand along a bed's length; nineteen run perpendicular to the beds,
 * across the whole house. The survey spreads 12 post lines over 104.28 m and
 * 19 over 174.20 m, which fixes both: a bed runs 104.28 m, and the 120 beds
 * sit side by side across 174.20 m of posts.
 *
 * This was built the other way round first — beds 79 m long in a 2 x 2 with a
 * cross road. That needed 12 posts perpendicular to the beds, which is the
 * opposite of how they are actually counted.
 */
/** Posts along a bed, over its length. */
export const POSTS_ALONG_BED = 12;
/** Posts across the house, perpendicular to the beds. */
export const POSTS_ACROSS_BEDS = 19;

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
/**
 * How far the posts reach, perpendicular to the beds. The beds themselves run
 * a little wider than the outermost post line — 120 at their recorded widths
 * measure 176.40 m, which is the 174.20 m of posts plus an edge either side.
 */
export const POSTS_WIDTH_M = 174.20;
/** A bed's length, which is also how far the posts run along it. */
export const BED_LENGTH_M = 104.28;
/** All 120 beds side by side: 66 x 1.20 + 54 x 1.80. */
export const BLOCK_WIDTH_M = 176.40;

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
  const seat = fieldOffsets()[fieldId];
  if (!field || !seat) return [];

  // Beds stack across the quadrant's depth, so it is the post lines running
  // along a bed that decide which rows carry a cable.
  const rows = new Set<number>();
  for (const z of postLinesAlong()) {
    const row = Math.round((z - seat.start) / field.bedWidth + 0.5);
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

/** Post lines perpendicular to the beds, in model x. Nineteen of them. */
export function postLinesAcross(): number[] {
  const step = POSTS_WIDTH_M / (POSTS_ACROSS_BEDS - 1);
  return Array.from({ length: POSTS_ACROSS_BEDS }, (_, i) => -POSTS_WIDTH_M / 2 + i * step);
}

/** Post lines along a bed, in model z. Twelve of them. */
export function postLinesAlong(): number[] {
  const step = BED_LENGTH_M / (POSTS_ALONG_BED - 1);
  return Array.from({ length: POSTS_ALONG_BED }, (_, i) => -BED_LENGTH_M / 2 + i * step);
}

/**
 * The logistics roads, placed by the posts either side of them.
 *
 * Santiago: the east-west road is the bay between north-south posts 6 and 7,
 * and the north-south road is the bay between east-west posts 9 and 10. So each
 * road is exactly one structural bay wide, and no post ever stands in one.
 */
export const ROAD_EW_BETWEEN_POSTS = [6, 7] as const;
export const ROAD_NS_BETWEEN_POSTS = [9, 10] as const;

/** The east-west road: where it runs along a bed, and how wide. */
export function roadEastWest(): { centre: number; width: number } {
  const lines = postLinesAlong();
  const a = lines[ROAD_EW_BETWEEN_POSTS[0] - 1];
  const b = lines[ROAD_EW_BETWEEN_POSTS[1] - 1];
  return { centre: (a + b) / 2, width: b - a };
}

/** The north-south road: where it crosses the house, and how wide. */
export function roadNorthSouth(): { centre: number; width: number } {
  const lines = postLinesAcross();
  const a = lines[ROAD_NS_BETWEEN_POSTS[0] - 1];
  const b = lines[ROAD_NS_BETWEEN_POSTS[1] - 1];
  return { centre: (a + b) / 2, width: b - a };
}

/**
 * The four quadrants the roads cut the house into, one per field.
 *
 * The fields are not in a row — they sit one to a quadrant, which is what the
 * cross is for. E3 north-west, C3 north-east, E1 south-west, C1 south-east.
 */
export function quadrantOf(fieldId: string): {
  x0: number; x1: number; z0: number; z1: number;
} | null {
  const field = plotConfigs.find((p) => p.id === fieldId);
  if (!field) return null;

  const ns = roadNorthSouth();
  const ew = roadEastWest();
  const west = field.position === "NW" || field.position === "SW";
  const north = field.position === "NW" || field.position === "NE";

  return {
    x0: west ? -POSTS_WIDTH_M / 2 : ns.centre + ns.width / 2,
    x1: west ? ns.centre - ns.width / 2 : POSTS_WIDTH_M / 2,
    z0: north ? -BED_LENGTH_M / 2 : ew.centre + ew.width / 2,
    z1: north ? ew.centre - ew.width / 2 : BED_LENGTH_M / 2,
  };
}

/**
 * Where a field's beds sit within its quadrant.
 *
 * Beds run the width of the quadrant — east to west — and stack across its
 * depth. The other way round does not fit: 27 C beds across a 47.40 m depth
 * implies 1.76 m each against the 1.80 m recorded, a 2% match, while stacking
 * them along the 87 m width would need beds over 3 m wide.
 *
 * They are counted outward from the road, which is what "the road comes after
 * the 33rd bed" means.
 */
export function fieldOffsets(): Record<string, {
  /** First bed's edge, across the quadrant's depth. */
  start: number;
  /** How far the beds reach across that depth. */
  span: number;
  /** A bed's length: the quadrant's width. */
  length: number;
  /** Where the bed's centre line sits, along the quadrant's width. */
  centre: number;
}> {
  const out: Record<string, { start: number; span: number; length: number; centre: number }> = {};
  for (const f of plotConfigs) {
    const q = quadrantOf(f.id);
    if (!q) continue;
    const span = f.bedCount * f.bedWidth;
    const north = f.position === "NW" || f.position === "NE";
    out[f.id] = {
      // Counted from the road inward, so the first bed is against it.
      start: north ? q.z1 - span : q.z0,
      span,
      length: q.x1 - q.x0,
      centre: (q.x0 + q.x1) / 2,
    };
  }
  return out;
}
