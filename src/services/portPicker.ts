/**
 * Which destinations a price row may name.
 *
 * Freight mode and destination are not independent: nothing flies into
 * Rotterdam's harbour and no ship calls at Schiphol. Choosing "by air" and
 * then being offered 3,348 seaports is how a price ends up filed against a
 * place the goods can never arrive at.
 *
 * The list itself is public reference data — every airport with an IATA code
 * and scheduled service, every seaport the UN issues a code for — so it is
 * long, and the picker searches rather than scrolls.
 */

import { distanceKm } from "./geo";
import { SITE_LAT, SITE_LON } from "./site";

export interface PortRow {
  name?: string;
  /** "Airport" or "Seaport". */
  kind?: string;
  country?: string;
  locator?: string;
  active?: boolean;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface Option {
  value: string;
  label: string;
}

/** The kind of place goods travelling this way can be delivered to. */
export function kindFor(freightMode: unknown): "Airport" | "Seaport" | null {
  const mode = String(freightMode ?? "").trim().toLowerCase();
  if (mode === "air") return "Airport";
  if (mode === "sea") return "Seaport";
  return null;
}

/**
 * The destinations to offer, given what the form already says.
 *
 * With no mode chosen the row applies to either, so everywhere is offered —
 * refusing to show anything until a mode is picked would make the common case
 * (one price, any freight) the awkward one.
 */
export function portOptions(rows: PortRow[], freightMode?: unknown): Option[] {
  const kind = kindFor(freightMode);
  const out: Option[] = [];
  for (const row of rows) {
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    if (row.active === false) continue;
    if (kind && String(row.kind ?? "").trim() !== kind) continue;
    out.push({ value: name, label: name });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

/** "Airport", "Seaport", or neither yet — what to call the field. */
export function portLabel(freightMode?: unknown): string {
  const kind = kindFor(freightMode);
  return kind === "Airport" ? "Airport" : kind === "Seaport" ? "Seaport" : "Port or airport";
}

/**
 * How far a chosen destination is from the nursery, in kilometres.
 *
 * Shown beside the picker because the names are codes: MIA and MIQ are one
 * character apart and 2,000 km apart, and the distance is the quickest way to
 * see that the wrong one was picked.
 */
export function portDistanceKm(rows: PortRow[], port: unknown): number | null {
  const chosen = String(port ?? "").trim();
  if (!chosen) return null;
  const row = rows.find((r) => String(r.name ?? "").trim() === chosen);
  if (!row) return null;
  return distanceKm({ latitude: SITE_LAT, longitude: SITE_LON }, row);
}

/**
 * A destination already chosen that the current mode cannot reach.
 *
 * Switching a row from sea to air leaves Rotterdam sitting in the field, and
 * silently clearing it loses a choice someone made on purpose. Naming the
 * problem lets the form say so and leave the correcting to a person.
 */
export function mismatchedPort(rows: PortRow[], values: { port?: unknown; freightMode?: unknown }): string | null {
  const kind = kindFor(values.freightMode);
  const chosen = String(values.port ?? "").trim();
  if (!kind || !chosen) return null;
  const row = rows.find((r) => String(r.name ?? "").trim() === chosen);
  if (!row || String(row.kind ?? "").trim() === kind) return null;
  return kind === "Airport"
    ? `${chosen} is a seaport — freight by air needs an airport.`
    : `${chosen} is an airport — freight by sea needs a seaport.`;
}
