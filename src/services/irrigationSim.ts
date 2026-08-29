/**
 * Simulated irrigation controller.
 *
 * Stands in until the real controller posts events. It is deliberately
 * labelled `simulated` at the feed level so the UI never passes it off as
 * live — the same provenance discipline God's Eye View applies to its own
 * simulated traffic layer.
 *
 * Replace `buildZones` with a Dataverse read of inv_Irrigation once the
 * controller writes events, and flip `feed` to "live".
 */
import type { ShadehouseBed } from "./shadehouseLayout";
import { POLL_INTERVAL_MS, type IrrigationZone, type ZoneFix } from "./irrigation";

/** One valve per bed-level line, as the risers in the shadehouse photos show. */
export function buildZones(beds: ShadehouseBed[]): IrrigationZone[] {
  return beds
    .filter((b) => b.state !== "empty")
    .map((bed) => ({
      zoneId: `Z-${bed.bedId}`,
      bedId: bed.bedId,
      label:
        bed.type === "ground"
          ? `${bed.bedId} · ground line`
          : `${bed.bedId} · cable L${bed.level}`,
      fixes: [],
      feed: "simulated" as const,
    }));
}

/**
 * A watering cycle walks the beds in order, holding each open for a while.
 * Returns the fix history each zone would have accumulated by `nowMs`.
 */
export function simulateFixes(
  zones: IrrigationZone[],
  nowMs: number,
  {
    cycleMs = 12 * 60_000,
    runMs = 90_000,
    faultZoneIds = new Set<string>(),
    silentZoneIds = new Set<string>(),
  }: {
    cycleMs?: number;
    runMs?: number;
    faultZoneIds?: Set<string>;
    silentZoneIds?: Set<string>;
  } = {}
): IrrigationZone[] {
  const count = zones.length || 1;
  // Stagger starts across the cycle so only a handful run at once.
  const slot = cycleMs / count;

  return zones.map((zone, index) => {
    if (silentZoneIds.has(zone.zoneId)) {
      // Deliberately stops reporting — exercises the stale path.
      const lastContact = nowMs - 4 * 60_000;
      return {
        ...zone,
        fixes: [{ epochMs: lastContact, status: "running", flowLpm: 4.2, progress: 0.4 } as ZoneFix],
      };
    }

    // Emit a short history at the poll cadence so the reader has fixes to
    // interpolate between, rather than a single point.
    const fixes: ZoneFix[] = [];
    for (let back = 4; back >= 0; back--) {
      const epochMs = nowMs - back * POLL_INTERVAL_MS;
      const p = ((epochMs + index * slot) % cycleMs);
      const running = p < runMs;

      if (faultZoneIds.has(zone.zoneId) && running) {
        fixes.push({ epochMs, status: "fault", flowLpm: 0, progress: p / runMs });
        continue;
      }

      // Ramp the valve open and closed rather than stepping, so interpolation
      // has a real gradient to work with.
      const ramp = running
        ? Math.min(1, Math.min(p, runMs - p) / 15_000)
        : 0;

      fixes.push({
        epochMs,
        status: running ? "running" : "idle",
        flowLpm: running ? 3.6 + ramp * 1.8 : 0,
        progress: running ? p / runMs : 0,
      });
    }

    return { ...zone, fixes, feed: "simulated" as const };
  });
}

/** Stable pseudo-random pick so the demo shows a fault and a dropout. */
export function demoAnomalies(zones: IrrigationZone[]) {
  const faultZoneIds = new Set<string>();
  const silentZoneIds = new Set<string>();
  if (zones.length > 12) {
    faultZoneIds.add(zones[7].zoneId);
    silentZoneIds.add(zones[11].zoneId);
  }
  return { faultZoneIds, silentZoneIds };
}
