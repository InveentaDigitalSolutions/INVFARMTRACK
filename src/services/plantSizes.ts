/**
 * The grades a plant is sold at.
 *
 * These describe how big and full the plant itself is — not the pot it sits
 * in. The nursery works in grades throughout: packing, shipment boxes and
 * availability projections all use this list, and it is what appears on the
 * availability sheets sent to customers.
 *
 * Taken from the option set on bv_availabilities.bv_size so the app cannot
 * offer a grade Dataverse would reject. The literal is only a fallback for
 * demo mode, where there is no environment to read from.
 */

import { CHOICE_MAP } from "./choiceMap.generated";

const FALLBACK = [
  "Petit",
  "Mini Petit",
  "Small",
  "Medium",
  "California",
  "Large",
  "Extra Large",
] as const;

const fromDataverse = Object.keys(CHOICE_MAP.bv_availabilities?.bv_size ?? {});

export const PLANT_SIZES: string[] =
  fromDataverse.length > 0 ? fromDataverse : [...FALLBACK];

export const PLANT_SIZE_OPTIONS = PLANT_SIZES.map((size) => ({
  value: size,
  label: size,
}));
