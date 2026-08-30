/**
 * The catalogue fields the phenology arithmetic needs, named on their own so a
 * caller can pass a plain object in a test without dragging the whole
 * generated row type along.
 */
export interface PhenologyPlant {
  growthWeeksMinMarAug?: number;
  growthWeeksMaxMarAug?: number;
  harvestWeeksMarAug?: number;
  pruningWeeksMarAug?: number;
  growthWeeksMinSepFeb?: number;
  growthWeeksMaxSepFeb?: number;
  harvestWeeksSepFeb?: number;
  pruningWeeksSepFeb?: number;
}
