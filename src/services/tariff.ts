/**
 * The customs heading a shipment travels under.
 *
 * Every export document names one, and getting it wrong is a shipment held at
 * the border rather than a number typed wrong. It is not a free choice: what
 * the nursery cuts and boxes decides it, so it is derived here and overridden
 * only where a broker says otherwise.
 *
 * Headings from the Harmonized System, chapter 6 (live trees and other
 * plants). Honduras, the United States and the EU all share the first six
 * digits; anything beyond that is national and belongs on the broker's paper,
 * not here.
 */

import { COUNTRIES } from "./countries.generated";

export interface TariffHeading {
  code: string;
  description: string;
}

/** The headings this nursery's goods can fall under. */
export const HS_HEADINGS: TariffHeading[] = [
  { code: "0602.10", description: "Unrooted cuttings and slips" },
  { code: "0602.90", description: "Live plants, other — including rooted cuttings" },
  { code: "0601.10", description: "Bulbs, tubers and corms, dormant" },
  { code: "0601.20", description: "Bulbs, tubers and corms, in growth or in flower" },
];

export interface TariffQuery {
  /** "URC" or "RC" — unrooted or rooted. */
  productType?: unknown;
  /** "L&E", "E", "Bulbs", "Tips" — what is actually cut and boxed. */
  cuttingType?: unknown;
}

const text = (v: unknown) => String(v ?? "").trim().toLowerCase();

/**
 * The heading for a product, or null when what it is has not been said yet.
 *
 * Null rather than a default: 0602.10 covers most of what leaves this nursery,
 * and a document that prints it by default prints it for the one box of bulbs
 * as well.
 */
export function hsCodeFor(query: TariffQuery): TariffHeading | null {
  const cut = text(query.cuttingType);
  const rooted = text(query.productType);

  // Bulbs are chapter heading 0601 whatever their rooting: they are not
  // cuttings at all. Dormant is the form they ship in.
  if (cut === "bulbs") return HS_HEADINGS[2];

  if (rooted === "urc") return HS_HEADINGS[0];
  if (rooted === "rc") return HS_HEADINGS[1];

  // Leaf-and-eye, eye and tips are all cut material, so they are unrooted
  // unless the row says it was rooted first.
  if (cut === "l&e" || cut === "e" || cut === "tips") return HS_HEADINGS[0];
  return null;
}

/** What to print: the row's own code where one was entered, else the derived one. */
export function tariffFor(row: TariffQuery & { hsCode?: unknown }): TariffHeading | null {
  const override = String(row.hsCode ?? "").trim();
  if (override) {
    const known = HS_HEADINGS.find((h) => h.code === override);
    return known ?? { code: override, description: "Entered by hand" };
  }
  return hsCodeFor(row);
}

/**
 * A country's ISO code and currency, found by the name the app holds.
 *
 * Names are typed and imported from several places, so the match is loose at
 * the edges — "United States" and "United States of America" are one country
 * — but it never guesses: an unknown name returns null rather than the first
 * country that starts with the same letter.
 */
export function countryFor(name: unknown) {
  const q = String(name ?? "").trim().toLowerCase();
  if (!q) return null;
  return (
    COUNTRIES.find((c) => c.name.toLowerCase() === q) ??
    COUNTRIES.find((c) => c.code.toLowerCase() === q || c.code3.toLowerCase() === q) ??
    COUNTRIES.find((c) => c.aliases.some((a) => a.toLowerCase() === q)) ??
    null
  );
}
