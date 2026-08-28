/**
 * Turning "I did this to five beds" into five records.
 *
 * The bed pickers on treatments, irrigation and harvest already allowed
 * several beds to be chosen, and the result was saved as one record whose
 * `bed` was an array. A bed is a single lookup, so an array resolves to
 * nothing and the record saved with no bed at all — silent loss on three
 * forms in daily use.
 *
 * One record per bed is what the schema is built for and what everything
 * downstream reads: the rotation view asks which bed a planting was on, the
 * count grid asks what pruning estimated for a bed. A single row covering five
 * beds cannot answer either.
 */

export interface BedRecord {
  [field: string]: unknown;
  bed?: unknown;
}

/**
 * Expands one submitted form into one record per selected bed.
 *
 * A single bed, or no bed at all, passes through untouched — most forms are
 * not about beds, and expanding them would be surprising.
 */
export function expandBeds<T extends BedRecord>(values: T): T[] {
  const beds = values.bed;
  if (!Array.isArray(beds)) return [values];
  if (beds.length === 0) return [{ ...values, bed: undefined }];
  return beds.map((bed) => ({ ...values, bed }));
}

/**
 * How many beds a submission covers. This is what "beds pruned" means, and
 * why it is no longer typed: someone selecting five beds and writing 3 was
 * previously believed.
 */
export function bedCount(values: BedRecord): number {
  const beds = values.bed;
  if (Array.isArray(beds)) return beds.length;
  return beds ? 1 : 0;
}
