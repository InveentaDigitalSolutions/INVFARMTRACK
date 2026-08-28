/**
 * How a row is named when it appears in a lookup, where the generated guess
 * is not enough.
 *
 * generate-choicemap.mjs picks each table's descriptive column automatically
 * (bv_bed -> bv_bedname), which is right nearly everywhere. It cannot know
 * when that column is not unique: every Pothos variety shares the plant name
 * "Pothos", and the nursery distinguishes them by variety — "Pothos /
 * Hawaiian" is what people say and what the screens have always shown.
 *
 * Overrides are hand-written because the judgement is about the business, not
 * about the schema. Keep them few.
 */

export interface LabelSpec {
  /** Columns to select and join, in order. */
  columns: string[];
  /** Separator between them. */
  join: string;
}

export const LABEL_OVERRIDES: Record<string, LabelSpec> = {
  // "Pothos" alone matches four rows; the variety is what identifies one.
  bv_plants: { columns: ["bv_plantname", "bv_variety"], join: " / " },
};
