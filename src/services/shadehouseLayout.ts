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
 * Level 3 is where the irrigation line runs, above everything that grows, so
 * it has a height but never a crop.
 */
export const BED_LEVELS: BedLevel[] = [0, 1, 2];
export const IRRIGATION_LEVEL: BedLevel = 3;

/**
 * Posts across the whole house, as Santiago counts them: twelve along a bed's
 * length, nineteen perpendicular to the beds.
 */
export const POSTS_ALONG_BED = 12;
/** Nine lines over each E field and ten over each C — see postLineXs. */
export const POSTS_ACROSS_BEDS = 19;

/** Pot spacing along a cable, measured off the photos. */
export const POT_PITCH_M = 0.45;

/**
 * How many pots hang on one cable.
 *
 * Nobody records this per row — the hooks are simply there, the length of the
 * house — so it comes from the geometry. The end of a cable is taken up by the
 * tie-off at each post, hence the 1.2 m.
 */
export function potsPerCable(lengthM: number): number {
  return Math.max(0, Math.floor((lengthM - 1.2) / POT_PITCH_M));
}

/** Gap between the two field columns — the logistics road in the layout. */
export const ROAD_M = 3.5;
export const PLOT_GAP_M = 3.5;

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
  /** 0 = ground bed; 1-2 = cable lines above it. Never 3 — that is irrigation. */
  level: BedLevel;
  /** Ground beds are planted in soil; baskets carry hanging pots on a cable. */
  type: "ground" | "basket";
  widthM: number;
  lengthM: number;
  /** Baskets only — pots hooked along the cable run. */
  potCount?: number;
  /** Baskets only — pot shape chosen when the planting is created. */
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
  /**
   * Lines of posts running north-south through the field, one cable each.
   *
   * A different grid from the beds and a much coarser one: 19 lines across the
   * whole house against 120 bed rows, so a cable spans three or four beds. Nine
   * over an E field and ten over a C, the north-south road falling between
   * lines 9 and 10 of the nineteen.
   */
  postLines: number;
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
  { id: "E3", position: "NW", bedCount: 33, bedWidth: 1.20, bedLength: 37.20, postLines: 9, label: "E3" },
  { id: "C3", position: "NE", bedCount: 27, bedWidth: 1.80, bedLength: 37.20, postLines: 10, label: "C3" },
  { id: "E1", position: "SW", bedCount: 33, bedWidth: 1.20, bedLength: 37.20, postLines: 9, label: "E1" },
  { id: "C1", position: "SE", bedCount: 27, bedWidth: 1.80, bedLength: 37.20, postLines: 10, label: "C1" },
];

/** Posts stand roughly every 3.6 m, whatever the bed pitch. */
export const POST_SPACING_M = 3.6;

export function postEveryFor(fieldId: string): number {
  const field = plotConfigs.find((p) => p.id === fieldId);
  if (!field) return 3;
  return Math.max(1, Math.round(POST_SPACING_M / field.bedWidth));
}

/**
 * Cables are strung THROUGH the posts, so a basket can only exist where a
 * post line stands — not above every ground bed.
 */
export function isPostLine(bed: ShadehouseBed): boolean {
  return (bed.bedNumber - 1) % postEveryFor(bed.fieldId) === 0;
}

/**
 * Baskets: cable runs carrying hanging pots, strung between posts along the
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

/**
 * Where the lines of posts stand, west field first.
 *
 * This is the house's second grid and the coarse one: nineteen lines across
 * the whole width, nine over an E field and ten over a C, with the north-south
 * road falling between line 9 and line 10. The beds are a finer grid entirely
 * — 120 rows to these 19 lines — so a cable spans three or four beds and a
 * basket row cannot be placed at a bed row's x.
 *
 * Both the posts and the baskets they carry are placed from here, so a basket
 * hangs on a post rather than near one.
 */
export function postLineXs(): { x: number; fieldId: string; line: number }[] {
  const widthOf = (fieldId: string) => {
    const field = plotConfigs.find((p) => p.id === fieldId);
    return field ? field.bedCount * field.bedWidth : 0;
  };
  const linesOf = (fieldId: string) =>
    plotConfigs.find((p) => p.id === fieldId)?.postLines ?? 0;

  const westWidth = Math.max(widthOf("E3"), widthOf("E1"));
  const eastWidth = Math.max(widthOf("C3"), widthOf("C1"));
  const totalWidth = westWidth + ROAD_M + eastWidth;

  // Posts stand at the field's edge as well as through it, so n lines make
  // n - 1 bays — 4.95 m across an E field, which is what a cable spans.
  const spread = (n: number, start: number, width: number) =>
    Array.from({ length: n }, (_, i) => (n === 1 ? start + width / 2 : start + (i * width) / (n - 1)));

  return [
    ...spread(linesOf("E3"), -totalWidth / 2, westWidth).map((x, i) => ({
      x,
      fieldId: "E",
      line: i + 1,
    })),
    ...spread(linesOf("C3"), -totalWidth / 2 + westWidth + ROAD_M, eastWidth).map((x, i) => ({
      x,
      fieldId: "C",
      line: i + 1,
    })),
  ];
}
