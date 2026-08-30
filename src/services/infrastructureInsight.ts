/**
 * What the nursery physically is, and how much of it is in use.
 *
 * Infrastructure listed shadehouses, fields and beds without ever saying how
 * they add up. The figures that matter when planning a season are the position
 * count against the shadehouse's capacity, and the split between ground and
 * air — because baskets are the expansion the nursery pays for and the ground
 * is what it already has.
 */
import { positionCount, parseBedName } from "./infrastructureRules";
import { ranked } from "./period";

export interface Shadehouse { name?: string; capacity?: number; active?: boolean }
export interface Field { name?: string; rows?: number; shadehouse?: string }
export interface Bed { name?: string; field?: string; type?: string; level?: string; active?: boolean }
export interface Planting { bed?: string; plant?: string; current?: boolean; date?: string }

export interface InfrastructureSummary {
  shadehouses: number;
  fields: number;
  beds: number;
  /** Distinct field+row pairs — what a shadehouse's capacity is measured in. */
  positions: number;
  capacity: number;
  /** Positions used as a share of declared capacity. */
  utilisation: number;
  ground: number;
  air: number;
  /** Beds carrying a live planting, and the share that is. */
  planted: number;
  plantedShare: number;
  /** Beds with no planting on them at all. */
  idle: number;
  /** Beds per field, largest first. */
  byField: { name: string; value: number }[];
  /** How the beds sit across levels — ground, then each air tier. */
  byLevel: { name: string; value: number }[];
}

export function infrastructureSummary(input: {
  shadehouses: Shadehouse[];
  fields: Field[];
  beds: Bed[];
  plantings: Planting[];
}): InfrastructureSummary {
  const { shadehouses, fields, plantings } = input;
  const beds = input.beds.filter((b) => b.name);

  const capacity = shadehouses
    .filter((s) => s.active !== false)
    .reduce((s, h) => s + (Number(h.capacity) || 0), 0);
  const positions = positionCount(beds);

  // A bed's level comes from its name, which is the one place it is certain:
  // the stored column can be blank on a row created before levels existed.
  const levelMap = new Map<string, number>();
  let ground = 0;
  let air = 0;
  for (const b of beds) {
    const level = parseBedName(String(b.name)) ?.level ?? 0;
    const label = level === 0 ? "Ground" : `Air ${level}`;
    levelMap.set(label, (levelMap.get(label) ?? 0) + 1);
    if (level === 0) ground++; else air++;
  }

  const live = new Set(
    plantings.filter((p) => p.bed && p.current !== false).map((p) => String(p.bed))
  );

  const fieldMap = new Map<string, number>();
  for (const b of beds) if (b.field) fieldMap.set(String(b.field), (fieldMap.get(String(b.field)) ?? 0) + 1);

  const byLevel = [...levelMap.entries()]
    .map(([name, value]) => ({ name, value }))
    // Ground first, then the air tiers in order — the way someone walks it.
    .sort((a, z) => (a.name === "Ground" ? -1 : z.name === "Ground" ? 1 : a.name.localeCompare(z.name)));

  return {
    shadehouses: shadehouses.filter((s) => s.active !== false).length,
    fields: fields.length,
    beds: beds.length,
    positions,
    capacity,
    utilisation: capacity > 0 ? Math.round((positions / capacity) * 100) : 0,
    ground,
    air,
    planted: live.size,
    plantedShare: beds.length ? Math.round((live.size / beds.length) * 100) : 0,
    idle: beds.length - live.size,
    byField: ranked(fieldMap),
    byLevel,
  };
}
