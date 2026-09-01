/**
 * Distance over the ground between two coordinates.
 *
 * Every destination the nursery can ship to now carries a position, which
 * turns a name into something measurable: how far a shipment travels, and
 * later what the weather is doing where it lands.
 *
 * Great-circle, not driving or flying distance — an aircraft does roughly fly
 * the great circle, a ship does not, and neither claim is made here beyond
 * "how far apart these two places are".
 */

export interface Point {
  latitude?: number | string | null;
  longitude?: number | string | null;
}

const EARTH_RADIUS_KM = 6371.0088;
const rad = (deg: number) => (deg * Math.PI) / 180;

const coord = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Kilometres between two places, or null when either has no position.
 *
 * Null rather than zero: a port whose coordinates were never filled in is not
 * at the nursery's front gate, and a screen showing "0 km" would say it is.
 */
export function distanceKm(a: Point, b: Point): number | null {
  const lat1 = coord(a.latitude), lon1 = coord(a.longitude);
  const lat2 = coord(b.latitude), lon2 = coord(b.longitude);
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;

  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "1,540 km", or nothing to say when the distance is unknown. */
export function formatKm(km: number | null): string {
  if (km === null) return "";
  return `${Math.round(km).toLocaleString()} km`;
}
