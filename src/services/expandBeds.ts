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

export interface PlantLineLike {
  plant?: string;
  qty?: string | number;
}

/**
 * Turning "I seeded two varieties into this bed" into two records.
 *
 * A seeding is one variety, one bed, one quantity — that is what the table
 * holds and what every reading of it assumes. But a bed genuinely carries
 * several at once, and making someone fill the form twice for the same bed on
 * the same day left nothing tying the two records together, and no way to see
 * the pair as one act.
 *
 * So the form collects the lines and this splits them, after the beds are
 * split. A submission with no lines passes through untouched: most forms have
 * none, and expanding them would be surprising.
 */
export function expandPlantLines<T extends BedRecord & { lines?: unknown }>(
  values: T
): Omit<T, "lines">[] {
  const { lines, ...rest } = values as T & { lines?: PlantLineLike[] };
  if (!Array.isArray(lines)) return [rest as Omit<T, "lines">];

  const filled = lines.filter((l) => l && l.plant);
  if (filled.length === 0) return [rest as Omit<T, "lines">];

  return filled.map((line) => ({
    ...(rest as Omit<T, "lines">),
    plant: line.plant,
    // Blank means "not counted", not zero — the store drops it either way,
    // but a zero written here would read as a bed seeded with nothing.
    qty: line.qty === "" || line.qty === undefined ? undefined : Number(line.qty),
  }));
}
