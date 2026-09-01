import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, RoundedBox } from "@react-three/drei";
// Not drei's <Text>: troika fetches a font index from a CDN, which the player
// blocks, and the failure takes the whole scene down. See SceneText.
import SceneText from "./SceneText";
import { drawTerrainOverlay } from "../services/terrainTexture";
import { useDarkMode } from "../hooks/useDarkMode";
import { BED_AXIS_BEARING_DEG, SITE_ELEV_M } from "../services/site";
import {
  SURROUND_M, SURROUND_SAMPLES, SURROUND_HALF_SPAN_M,
} from "../services/terrainSurround.generated";
import { sunVector, atLocal } from "../services/solar";
import { relativeLight } from "../services/bedLight";
import * as THREE from "three";
import {
  LEVEL_HEIGHTS_M,
  stateColors,
  plotConfigs,
  POSTS_ALONG_BED,
  POT_PITCH_M,
  ROAD_M,
  PLOT_GAP_M,
  postLineXs,
  SHADE_COLOR,
  SHADE_HEIGHT_M,
  SHADE_OPACITY,
  type ShadeLevel,
  type BedLevel,
  type ShadehouseBed,
} from "../services/shadehouseLayout";
import { zoneStatusColors, type ZoneReading } from "../services/irrigation";
import WeatherLayer from "./WeatherLayer";
import type { CurrentConditions } from "../services/weather";

/** Rounded-rectangle shape, mirroring the plan's rx on every rect. */
function roundedRectShape(w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + radius);
  shape.lineTo(x + w, y + h - radius);
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  shape.lineTo(x + radius, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

/** Palette shared with the 2D Shadehouse Layout. */
export const PLAN_COLORS = {
  ground: "#f9fafb",
  road: "#e5e7eb",
  roadLine: "#d1d5db",
  roadLabel: "#9ca3af",
};

/**
 * The same surfaces after dark.
 *
 * Not the light palette dimmed: a night scene needs its own relationships or
 * everything collapses into one grey. The ground goes blue-black so the beds —
 * which keep their own colours, because those are data — read against it.
 */
export const NIGHT_COLORS = {
  ground: "#141c28",
  road: "#1d2735",
  roadLine: "#2c3a4c",
  roadLabel: "#5d6b7e",
  land: "#161d24",
  zenith: "#070c16",
  horizon: "#1b2740",
};

/** Height of the shade cloth, and so of the posts that hold it up. */
const ROOF_HEIGHT_M = 3.1;
/**
 * Shadow map resolution. Over a house 110 m across this is about 2.7 cm per
 * texel — a post is 15 cm wide, so it covers five of them. At the default 512
 * one texel is 22 cm, wider than the post itself, which is why the posts cast
 * nothing while a 14 m test cube cast perfectly.
 */
const SHADOW_MAP = 4096;

export interface RoadLayout {
  vertical: { x: number; width: number; length: number };
  horizontal: { z: number; width: number; length: number };
}

export function computeRoads(): RoadLayout {
  const widthOf = (fieldId: string) => {
    const field = plotConfigs.find((p) => p.id === fieldId);
    return field ? field.bedCount * field.bedWidth : 0;
  };
  const westWidth = Math.max(widthOf("E3"), widthOf("E1"));
  const eastWidth = Math.max(widthOf("C3"), widthOf("C1"));
  const totalWidth = westWidth + ROAD_M + eastWidth;
  const bedLength = plotConfigs[0]?.bedLength ?? 37.2;
  const depth = 2 * (bedLength + PLOT_GAP_M / 2);

  return {
    vertical: { x: -totalWidth / 2 + westWidth + ROAD_M / 2, width: ROAD_M, length: depth },
    horizontal: { z: 0, width: PLOT_GAP_M, length: totalWidth },
  };
}

/** Dashed centre line, as on the plan. */
function RoadDashes({
  along,
  fixed,
  length,
  dark,
}: {
  along: "x" | "z";
  fixed: number;
  dark: boolean;
  length: number;
}) {
  const dashes = useMemo(() => {
    const out: number[] = [];
    const step = 2.2;
    for (let d = -length / 2 + step; d < length / 2 - step; d += step) out.push(d);
    return out;
  }, [length]);

  return (
    <group>
      {dashes.map((d, i) => (
        <mesh
          key={i}
          position={along === "z" ? [fixed, 0.012, d] : [d, 0.012, fixed]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={along === "z" ? [0.12, 1.2] : [1.2, 0.12]} />
          <meshBasicMaterial color={dark ? NIGHT_COLORS.roadLine : PLAN_COLORS.roadLine} />
        </mesh>
      ))}
    </group>
  );
}

/** Rounded outline around a field, matching the plan's rx="4" frame. */
function PlotOutline({
  x,
  z,
  width,
  length,
}: {
  x: number;
  z: number;
  width: number;
  length: number;
}) {
  const points = useMemo(
    () => roundedRectShape(width, length, 1.1).getPoints(48),
    [width, length]
  );
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints(points.map((p) => new THREE.Vector3(p.x, p.y, 0)));
    return g;
  }, [points]);

  return (
    <lineLoop position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry}>
      <lineBasicMaterial color="#cbd5e1" />
    </lineLoop>
  );
}

function Roads({ dark }: { dark: boolean }) {
  const roads = useMemo(() => computeRoads(), []);
  const paint = dark ? NIGHT_COLORS : PLAN_COLORS;
  return (
    <group>
      {/* Logistics road, running the length of the house */}
      <mesh position={[roads.vertical.x, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[roundedRectShape(roads.vertical.width, roads.vertical.length, 0.9)]} />
        <meshStandardMaterial color={paint.road} roughness={1} />
      </mesh>
      <RoadDashes along="z" fixed={roads.vertical.x} length={roads.vertical.length} dark={dark} />

      {/* Cross aisle */}
      <mesh position={[0, 0.007, roads.horizontal.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[roundedRectShape(roads.horizontal.length, roads.horizontal.width, 0.9)]} />
        <meshStandardMaterial color={paint.road} roughness={1} />
      </mesh>
      <RoadDashes along="x" fixed={roads.horizontal.z} length={roads.horizontal.length} dark={dark} />

      <SceneText
        position={[roads.vertical.x, 0.05, roads.vertical.length / 2 + 1.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.05}
        color={paint.roadLabel}
      >
        Logistics Road
      </SceneText>
    </group>
  );
}

export interface BedPlacement {
  bed: ShadehouseBed;
  x: number;
  z: number;
  y: number;
  width: number;
  length: number;
}

/**
 * Lay the fields out 2x2 with a road between, mirroring the 2D layout so the
 * two views stay mentally interchangeable.
 */
/**
 * Where a field sits and how wide its beds are.
 *
 * `plotConfigs` only knows the four fields measured off the farm plan. A field
 * added under Infrastructure has no entry, and the old code asserted the
 * lookup was non-null — so one new field threw inside placeBeds and blanked the
 * whole 3D view. Unknown fields are placed deterministically instead, using
 * the bed's own recorded width and length.
 */
function fieldLayout(fieldId: string, beds: ShadehouseBed[]) {
  const known = plotConfigs.find((p) => p.id === fieldId);
  if (known) return known;

  const sample = beds.find((b) => b.fieldId === fieldId);
  return {
    id: fieldId,
    // Every unknown field sits south of the measured block — see NEW_FIELD_BAND
    // in placeBeds. Dropping them into one of the four quadrants laid them on
    // top of a field that is already there.
    position: "SOUTH" as const,
    bedCount: beds.filter((b) => b.fieldId === fieldId).length || 1,
    // Unknown field, so no measured post grid: baskets fall back to bed
    // positions rather than being spread across a count nobody recorded.
    postLines: 0,
    bedWidth: sample?.widthM || 1.2,
    bedLength: sample?.lengthM || 37.2,
    label: fieldId,
  };
}

/** Fields with no plan geometry, in a stable order. */
function unknownFields(beds: ShadehouseBed[]): string[] {
  return [...new Set(beds.map((b) => b.fieldId))]
    .filter((id) => id && !plotConfigs.some((p) => p.id === id))
    .sort();
}

export function placeBeds(beds: ShadehouseBed[]): BedPlacement[] {
  const widthOf = (fieldId: string) => {
    const field = fieldLayout(fieldId, beds);
    return field.bedCount * field.bedWidth;
  };

  const westWidth = Math.max(widthOf("E3"), widthOf("E1"));
  const eastWidth = Math.max(widthOf("C3"), widthOf("C1"));
  const totalWidth = westWidth + ROAD_M + eastWidth;

  // Where the south band for unfamiliar fields starts, and how they stack.
  const NEW_FIELD_BAND = plotConfigs[0]?.bedLength ?? 37.2;
  const extra = unknownFields(beds);
  const postLines = postLineXs();

  return beds.map((bed) => {
    const field = fieldLayout(bed.fieldId, beds);
    const isSouth = field.position === "SOUTH";
    const isEast = field.position === "NE" || field.position === "SE";
    const isNorth = field.position === "NW" || field.position === "NE";

    if (isSouth) {
      // One band per unfamiliar field, laid out below the measured block so it
      // can never sit on top of a field that is already there.
      const seat = extra.indexOf(bed.fieldId);
      const rowStart = NEW_FIELD_BAND + PLOT_GAP_M * 1.5;
      return {
        bed,
        x: -totalWidth / 2 + (bed.bedNumber - 0.5) * field.bedWidth,
        z: rowStart + seat * (field.bedLength + PLOT_GAP_M) + field.bedLength / 2,
        y: LEVEL_HEIGHTS_M[bed.level],
        width: field.bedWidth * 0.86,
        length: field.bedLength,
      };
    }

    const columnStart = isEast
      ? -totalWidth / 2 + westWidth + ROAD_M
      : -totalWidth / 2;

    /**
     * Where the row sits across the field.
     *
     * A ground bed is one of the field's bed rows, so it steps along X by the
     * bed width. A basket row is not: it hangs on a line of posts, and the
     * posts are about 5 m apart where the beds are 1.2 or 1.8. Placing a
     * basket at its bed-row position drew a cable above every bed — up to 120
     * of them, where the house has nine or ten lines per field.
     *
     * So a basket is placed by spreading its post lines evenly across the
     * field's width, which is where the posts already stand.
     */
    const line =
      bed.level > 0
        ? postLines.find((l) => l.fieldId === field.id[0] && l.line === bed.bedNumber)
        : undefined;
    const x = line ? line.x : columnStart + (bed.bedNumber - 0.5) * field.bedWidth;
    const z = isNorth
      ? -(field.bedLength / 2 + PLOT_GAP_M / 2)
      : field.bedLength / 2 + PLOT_GAP_M / 2;

    return {
      bed,
      x,
      z,
      y: LEVEL_HEIGHTS_M[bed.level],
      // Leave a sliver between beds so rows stay individually readable.
      width: field.bedWidth * 0.86,
      length: field.bedLength,
    };
  });
}

/**
 * Data lenses. The same geometry, re-read under a different question — the
 * idea God's Eye View uses for its sensor modes. Only this function changes
 * per lens; the scene, layers and selection are untouched.
 */
export type LensMode = "state" | "age" | "harvest" | "irrigated" | "issues" | "shade" | "light";

/** Sequential ramp, pale to saturated, for a normalised 0-1 value. */
function ramp(t: number, from: [number, number, number], to: [number, number, number]) {
  const c = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return new THREE.Color(
    (from[0] + (to[0] - from[0]) * c) / 255,
    (from[1] + (to[1] - from[1]) * c) / 255,
    (from[2] + (to[2] - from[2]) * c) / 255
  );
}

const NO_DATA = new THREE.Color("#cfcabb");
const DAY_MS = 86_400_000;

function daysBetween(iso: string, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (now - t) / DAY_MS : null;
}

export function colorForLens(
  placement: BedPlacement,
  reading: ZoneReading | undefined,
  lens: LensMode,
  nowMs: number
): THREE.Color {
  const bed = placement.bed;

  switch (lens) {
    case "age": {
      // Days since planting: pale lime (new) to deep green (mature).
      const days = daysBetween(bed.plantedDate, nowMs);
      if (days == null) return NO_DATA;
      return ramp(Math.min(1, days / 120), [232, 244, 200], [26, 92, 48]);
    }

    case "harvest": {
      // Days remaining: red (overdue/imminent) through amber to green (far off).
      const days = daysBetween(bed.expectedHarvest, nowMs);
      if (days == null) return NO_DATA;
      const remaining = -days;
      if (remaining <= 0) return new THREE.Color("#c2410c");
      return ramp(Math.min(1, remaining / 90), [251, 191, 36], [61, 139, 64]);
    }

    case "irrigated": {
      // Hours since the zone last ran: blue (just watered) to dry sand.
      if (!reading || !Number.isFinite(reading.lastRunAgeMs)) return NO_DATA;
      const hours = reading.lastRunAgeMs / 3_600_000;
      return ramp(Math.min(1, hours / 12), [56, 189, 248], [214, 199, 160]);
    }

    case "shade": {
      // Darker cloth, darker bed — the same reading as looking up at it.
      if (!bed.shade) return NO_DATA;
      return new THREE.Color(
        bed.shade === "Triple" ? "#3f5348" : bed.shade === "Double" ? "#7d9384" : "#c2cfc4"
      );
    }

    case "light": {
      // How much daylight actually reaches the bed through its cloth. Shade
      // says how many layers; this says what that costs — and at 65% netting
      // the answer is a factor of eight from one end of the house to the other.
      if (!bed.shade) return NO_DATA;
      return ramp(relativeLight(bed.shade), [38, 54, 74], [250, 214, 82]);
    }

    case "issues":
      return bed.state === "issue"
        ? new THREE.Color("#dc2626")
        : new THREE.Color("#c8cec4");

    case "state":
    default:
      return new THREE.Color(stateColors[bed.state].fill);
  }
}

function colorFor(
  placement: BedPlacement,
  reading: ZoneReading | undefined,
  showIrrigation: boolean,
  lens: LensMode,
  nowMs: number
): THREE.Color {
  // The live irrigation layer always wins — a running valve or a lost signal
  // must never be masked by whichever lens happens to be selected.
  if (showIrrigation && reading && reading.status !== "idle") {
    return new THREE.Color(zoneStatusColors[reading.status].fill);
  }
  return colorForLens(placement, reading, lens, nowMs);
}

function Bed({
  placement,
  reading,
  showIrrigation,
  lens,
  nowMs,
  dimmed,
  faded: _faded,
  selected,
  onSelect,
}: {
  placement: BedPlacement;
  reading?: ZoneReading;
  showIrrigation: boolean;
  lens: LensMode;
  nowMs: number;
  dimmed: boolean;
  /** Half-transparent so the contour overlay reads through the bed. */
  faded: boolean;
  selected: boolean;
  onSelect: (bedId: string) => void;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const height = 0.35;
  const base = useMemo(
    () => colorFor(placement, reading, showIrrigation, lens, nowMs),
    [placement, reading, showIrrigation, lens, nowMs]
  );

  useFrame(({ clock }) => {
    if (!mat.current) return;
    const running = showIrrigation && reading?.status === "running";
    if (running) {
      const wave = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3);
      const strength = Math.min(1, (reading?.flowLpm ?? 0) / 5.4);
      mat.current.emissiveIntensity = 0.25 + wave * 0.55 * strength;
    } else {
      mat.current.emissiveIntensity = selected ? 0.35 : 0;
    }
  });

  return (
    <group
      position={[placement.x, placement.y + height / 2, placement.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(placement.bed.bedId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!dimmed) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <RoundedBox
        args={[placement.width, height, placement.length]}
        radius={Math.min(0.085, placement.width / 2.6, height / 2.2)}
        smoothness={4}
        creaseAngle={0.5}
        castShadow={!dimmed}
        receiveShadow={!dimmed}
      >
        <meshStandardMaterial
          ref={mat}
          color={base}
          emissive={base}
          transparent
          // The beds are the subject; the ground is context. Fading them for
          // the terrain layer put the contour wash on top of them and made the
          // ground look like it was covering the beds — which is exactly what
          // it was doing. Contours now read in the aisles and around the
          // fields, where there is nothing to hide.
          opacity={dimmed ? 0.12 : 1}
          depthWrite={!dimmed}
          roughness={0.62}
          metalness={0.02}
        />
      </RoundedBox>
    </group>
  );
}

/**
 * Foliage is always green — a plant does not turn orange because it is ready
 * to cut. State is a shift in vitality, which leaves non-green hues free for
 * the irrigation layer to own.
 */
const leafColors: Record<ShadehouseBed["state"], string> = {
  empty: "#8a8f83",
  planted: "#7fc98a",
  growing: "#3f9e55",
  "harvest-ready": "#2f7d42",
  issue: "#9aa35a",
};

const POT_DROP_M = 0.22;

/**
 * A basket is a cable strung through the posts with terracotta pots hooked
 * along it — not a solid bar. Pots are instanced so several thousand of them
 * cost one draw call.
 */
function BasketLine({
  placement,
  reading,
  showIrrigation,
  lens,
  nowMs,
  dimmed,
  faded: _faded,
  selected,
  onSelect,
}: {
  placement: BedPlacement;
  reading?: ZoneReading;
  showIrrigation: boolean;
  lens: LensMode;
  nowMs: number;
  dimmed: boolean;
  /** Half-transparent so the contour overlay reads through the bed. */
  faded: boolean;
  selected: boolean;
  onSelect: (bedId: string) => void;
}) {
  const cableMat = useRef<THREE.MeshStandardMaterial>(null);
  const potsRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);

  const count = Math.max(0, placement.bed.potCount ?? 0);

  const matrices = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    const span = placement.length - 1.2;
    const usable = Math.min(count, Math.floor(span / POT_PITCH_M));
    const start = -span / 2;
    for (let i = 0; i < usable; i++) {
      dummy.position.set(placement.x, placement.y - POT_DROP_M, placement.z + start + i * POT_PITCH_M);
      dummy.updateMatrix();
      out.push(dummy.matrix.clone());
    }
    return out;
  }, [placement, count]);

  useEffect(() => {
    for (const ref of [potsRef, foliageRef]) {
      const mesh = ref.current;
      if (!mesh) continue;
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = matrices.length;
    }
  }, [matrices]);

  const foliage = useMemo(
    () =>
      lens === "state"
        ? new THREE.Color(leafColors[placement.bed.state])
        : colorForLens(placement, reading, lens, nowMs),
    [placement, reading, lens, nowMs]
  );
  const irrigating = showIrrigation && reading && reading.status !== "idle";
  const cableColor = useMemo(
    () =>
      irrigating
        ? new THREE.Color(zoneStatusColors[reading!.status].fill)
        : new THREE.Color("#3f3a33"),
    [irrigating, reading]
  );

  useFrame(({ clock }) => {
    if (!cableMat.current) return;
    if (showIrrigation && reading?.status === "running") {
      const wave = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3);
      const strength = Math.min(1, (reading?.flowLpm ?? 0) / 5.4);
      cableMat.current.emissiveIntensity = 0.3 + wave * 0.8 * strength;
    } else {
      cableMat.current.emissiveIntensity = selected ? 0.4 : 0;
    }
  });

  if (!matrices.length) return null;
  const opacity = dimmed ? 0.1 : 1;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect(placement.bed.bedId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!dimmed) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {/* Invisible hit target. A 5 cm cable is unclickable, and the pots are
          smaller still, so selection rides on a generous proxy volume around
          the whole run. Opacity 0 rather than visible={false} — the raycaster
          skips invisible objects entirely. */}
      {!dimmed && (
        <mesh position={[placement.x, placement.y - POT_DROP_M / 2, placement.z]}>
          <boxGeometry args={[0.62, 0.72, placement.length]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* The cable itself, running post to post along the row. */}
      <mesh position={[placement.x, placement.y, placement.z]}>
        <boxGeometry args={selected ? [0.09, 0.09, placement.length] : [0.05, 0.05, placement.length]} />
        <meshStandardMaterial
          ref={cableMat}
          color={cableColor}
          emissive={cableColor}
          transparent
          opacity={opacity}
          roughness={0.6}
        />
      </mesh>

      {/* Terracotta pots hooked along the cable — round or square.

          frustumCulled off on purpose: an InstancedMesh is culled against the
          bounding sphere of one instance sitting at the group's origin, not
          against where the eighty instances actually are. A cable is 36 m
          long, so whole rows of baskets blinked out as the camera turned —
          present or missing depending on the angle, which is worse than either.
          Eighty small instances is one draw call; there is nothing to save. */}
      <instancedMesh
        ref={potsRef}
        args={[undefined, undefined, matrices.length]}
        frustumCulled={false}
      >
        {placement.bed.potType === "square" ? (
          // Squared pots in the nursery still have softened corners.
          <cylinderGeometry args={[0.135, 0.1, 0.17, 4, 1]} />
        ) : (
          <cylinderGeometry args={[0.115, 0.078, 0.17, 14]} />
        )}
        <meshStandardMaterial
          color="#b5623c"
          transparent
          opacity={opacity}
          roughness={0.85}
        />
      </instancedMesh>

      {/* Trailing foliage, which is what you actually see from a distance. */}
      <instancedMesh
        ref={foliageRef}
        args={[undefined, undefined, matrices.length]}
        position={[0, 0.13, 0]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.165, 12, 9]} />
        <meshStandardMaterial
          color={foliage}
          emissive={foliage}
          emissiveIntensity={selected ? 0.45 : 0}
          transparent
          opacity={dimmed ? 0.1 : 0.95}
          roughness={0.9}
        />
      </instancedMesh>
    </group>
  );
}

/**
 * The survey's contours, painted flat on the floor.
 *
 * Two-dimensional on purpose. Displacing the ground would move every bed with
 * it and reopen a layout that is settled; a contour overlay says the same thing
 * about where water runs and where the ground is high, and says it on a plan
 * the nursery already reads.
 */
function Topography({ span, depth }: { span: number; depth: number }) {
  const texture = useMemo(() => {
    const canvas = drawTerrainOverlay();
    if (!canvas) return null;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = THREE.LinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.anisotropy = 8;
    return map;
  }, []);

  // A texture holds a GPU allocation; dropping the reference is not enough.
  useEffect(() => () => texture?.dispose(), [texture]);

  if (!texture) return null;

  return (
    // Just above the ground plane. polygonOffset rather than a larger gap, so
    // it cannot be seen floating when the camera drops to eye level.
    //
    // renderOrder and depthWrite are what make it visible under the far fields.
    // Transparent objects are drawn back-to-front, so the beds at the back of
    // the house were drawn BEFORE this plane and wrote themselves into the
    // depth buffer; the overlay then failed the depth test behind them and was
    // never painted. E3 and C3 stayed opaque while E1 and C1 showed through.
    // Drawing the overlay first, and letting it write no depth of its own, puts
    // it under every bed instead of only the near ones.
    <mesh
      position={[0, 0.01, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
      receiveShadow={false}
    >
      <planeGeometry args={[span + 8, depth + 8]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.85}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * The real sun over the nursery, and the arc it travels that day.
 *
 * The scene used to light from a fixed lamp at [34, 42, 22], which looks fine
 * and tells you nothing: the light fell the same way in December as in June.
 * This takes the sun's actual position for the moment being shown, so the
 * direction and colour of the light are the real ones.
 *
 * Shadows are cast by anything bed-sized or larger, which is what matters: an
 * basket shades the ground bed beneath it, and that is a real term in the
 * light a crop receives. The 15 cm posts do not resolve — one 4096 shadow map
 * stretched over a house 115 m across gives 2.8 cm per texel, and a post
 * silhouette five texels wide does not survive the filtering at a low sun.
 * Their shadows are physically negligible anyway, so this is left as it is
 * rather than chased with a second cascade.
 *
 * The arc is drawn because a single sun is a snapshot and the question is
 * always "and where does it go next" — at this latitude that answer changes
 * side of the sky twice a year.
 */
function Sun({
  at,
  span,
  depth,
  showArc,
}: {
  at: Date;
  span: number;
  depth: number;
  /** The whole day's path, not just this instant. */
  showArc: boolean;
}) {
  /**
   * How far out the sun and its path are drawn.
   *
   * Far enough to read as a direction rather than a lamp in the room, close
   * enough that the whole arc is in frame without zooming out: at 0.95 the
   * path left the view entirely at the default camera, which for a layer whose
   * whole point is watching the sun move is the same as not drawing it.
   *
   * Only the drawing moves — the light's direction is the real one.
   */
  const radius = Math.max(span, depth) * 0.6;
  const modelNorth = BED_AXIS_BEARING_DEG;

  const dir = useMemo(() => sunVector(at, modelNorth), [at, modelNorth]);

  /**
   * Tell the shadow camera its frustum changed: react-three-fiber writes
   * `shadow-camera-*` onto the camera without calling updateProjectionMatrix.
   *
   * Correct to do, but NOT the reason nothing casts a shadow here. The scene
   * has never drawn one, with the fixed lamp either, and neither this, the
   * Canvas shadow type, the frustum size nor the light position changes that.
   * Still open — see BACKLOG.
   */
  const light = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    // The shadow map is allocated the first time the light renders, and after
    // that setting mapSize does nothing — the texture keeps whatever size it
    // was created at. Dropping it makes three.js allocate a new one.
    l.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    l.shadow.map?.dispose();
    l.shadow.map = null;
    l.shadow.camera.updateProjectionMatrix();
    l.shadow.needsUpdate = true;
  }, [span, depth, radius]);

  /** The day's whole path, sampled every ten minutes while the sun is up. */
  const arc = useMemo(() => {
    if (!showArc) return [];
    const iso = at.toISOString().slice(0, 10);
    const points: THREE.Vector3[] = [];
    for (let minutes = 0; minutes <= 1440; minutes += 10) {
      const v = sunVector(atLocal(iso, minutes / 60), modelNorth);
      if (v) points.push(new THREE.Vector3(...v).multiplyScalar(radius));
    }
    return points;
  }, [at, showArc, radius, modelNorth]);

  /**
   * The path as a tube, not a line.
   *
   * WebGL ignores line width on every platform that matters, so a THREE.Line
   * is one pixel wide however it is styled — against a bright sky at this
   * distance it was a thread nobody could see. A tube is real geometry and
   * can be as thick as it needs to be.
   */
  const arcGeometry = useMemo(() => {
    if (arc.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(arc);
    return new THREE.TubeGeometry(curve, Math.min(240, arc.length * 2), radius * 0.006, 8, false);
  }, [arc, radius]);
  useEffect(() => () => arcGeometry?.dispose(), [arcGeometry]);

  /**
   * Where the sun stands at each whole hour, so the arc can be read as a clock
   * rather than as a shape. Every second hour, which is as dense as the marks
   * can be before they touch near noon.
   */
  const hourMarks = useMemo(() => {
    if (!showArc) return [] as { key: string; at: [number, number, number]; label: string }[];
    const iso = at.toISOString().slice(0, 10);
    const marks: { key: string; at: [number, number, number]; label: string }[] = [];
    for (let hour = 0; hour <= 24; hour += 2) {
      const v = sunVector(atLocal(iso, hour), modelNorth);
      if (!v) continue;
      marks.push({
        key: `h${hour}`,
        at: [v[0] * radius, v[1] * radius, v[2] * radius],
        label: `${String(hour).padStart(2, "0")}:00`,
      });
    }
    return marks;
  }, [at, showArc, radius, modelNorth]);

  // Below the horizon there is no direct sun. Lighting the beds anyway — the
  // obvious shortcut — would put a sun under the ground and shadows upward.
  const night = dir === null;
  const position: [number, number, number] = night
    ? [0, radius, 0]
    : [dir[0] * radius, dir[1] * radius, dir[2] * radius];

  // Low sun is redder and weaker, as it is through more atmosphere.
  const height = night ? 0 : dir[1];
  const warmth = 1 - Math.min(1, height * 1.6);
  const colour = new THREE.Color().setRGB(1, 0.97 - warmth * 0.22, 0.92 - warmth * 0.42);

  return (
    <group>
      <directionalLight
        ref={light}
        position={position}
        intensity={night ? 0 : 0.35 + height * 1.15}
        color={colour}
        castShadow
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        // Fitted to the house, not to twice it. The frustum was ±span by
        // ±depth — four times the area it needed — which put a 15 cm post
        // inside a single shadow texel, and the blur then erased it. Half the
        // extent plus a margin is what actually has to be covered.
        shadow-camera-left={-(span / 2 + 10)}
        shadow-camera-right={span / 2 + 10}
        shadow-camera-top={depth / 2 + 10}
        shadow-camera-bottom={-(depth / 2 + 10)}
        shadow-camera-near={1}
        shadow-camera-far={radius * 2.5}
        // A low sun throws long shadows across a shallow surface, which is
        // exactly where a constant bias detaches them from what casts them.
        shadow-bias={-0.00008}
        shadow-normalBias={0.008}
      />

      {!night && (
        <group position={position}>
          {/* The disc itself, and a halo around it. Both unlit and exempt from
              tone mapping, so the sun is the brightest thing on screen — which
              is the one property everybody already knows it has. */}
          <mesh>
            <sphereGeometry args={[radius * 0.055, 24, 18]} />
            <meshBasicMaterial color={colour} toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[radius * 0.11, 20, 14]} />
            <meshBasicMaterial
              color={colour}
              toneMapped={false}
              transparent
              opacity={0.22}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}

      {arcGeometry && (
        <mesh geometry={arcGeometry} renderOrder={5}>
          <meshBasicMaterial color="#f0a92c" toneMapped={false} transparent opacity={0.9} />
        </mesh>
      )}

      {hourMarks.map((mark) => (
        <group key={mark.key} position={mark.at}>
          <mesh>
            <sphereGeometry args={[radius * 0.012, 10, 8]} />
            <meshBasicMaterial color="#f7d488" toneMapped={false} />
          </mesh>
          <Billboard position={[0, radius * 0.028, 0]}>
            <SceneText
              fontSize={radius * 0.02}
              color="#7a5c14"
              outlineWidth={0.09}
              outlineColor="#ffffff"
            >
              {mark.label}
            </SceneText>
          </Billboard>
        </group>
      ))}
    </group>
  );
}

/**
 * The valley the nursery sits in.
 *
 * The block used to stand on an infinite flat plane, which is not El Olvido:
 * the ground rises 180 m to the west and falls 90 m towards the north. Read
 * from public elevation tiles at about 19 m a pixel — far too coarse for the
 * block itself, where the survey is two orders of magnitude better and keeps
 * that job, and plenty for the hillside a kilometre out.
 *
 * The two are joined rather than butted together: inside the block the mesh is
 * held flat at the house's own floor, and over the next 200 m it eases out to
 * the real ground. Without that the survey ends in a cliff.
 */
function Valley({ span, depth, dark }: { span: number; depth: number; dark: boolean }) {
  const geometry = useMemo(() => {
    const size = SURROUND_HALF_SPAN_M * 2;
    const segments = SURROUND_SAMPLES - 1;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const position = geo.attributes.position as THREE.BufferAttribute;

    // The tiles are in true north; the model's Z runs along the beds, 17.75°
    // west of it. Turning the mesh puts the real hillside in the real place.
    const turn = (BED_AXIS_BEARING_DEG - 360) * (Math.PI / 180);
    const cos = Math.cos(turn), sin = Math.sin(turn);

    // Flat over the block itself, then out to the real ground quickly: ease it
    // over too long a distance and everything within sight of the house is
    // levelled, which is the flat plane this was meant to replace.
    // Flat well past the house, then out to the real ground slowly.
    //
    // The ground rises 180 m to the west, and easing over 70 m from the
    // block's own corner radius put the first climbing vertices about 20 m
    // beyond the westernmost beds — several metres up, in front of E1 rows 1
    // to 7. That is the "ground on top of the beds": not a sorting fault, the
    // hillside genuinely standing where the beds are.
    const flatTo = Math.hypot(span, depth) * 1.4;
    const easeOver = 400;
    /** Nothing within this radius may rise above the floor the house sits on. */
    const KEEP_CLEAR_M = 320;

    // Land reads as land by its shading. Seen from above, a slope with one
    // flat colour is indistinguishable from a void, so height is painted on.
    const colour = new Float32Array(position.count * 3);
    // Ramped over the ground near the nursery, not over the whole 313 m the
    // tiles cover: stretched that far, everything within sight of the house
    // lands on one indistinguishable middle colour.
    const low = SITE_ELEV_M - 40, high = SITE_ELEV_M + 40;

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      // PlaneGeometry lies in XY before it is laid down, so its Y is the
      // model's Z once rotated: row 0 (north) is -Z.
      const y = position.getY(i);
      const row = Math.round((SURROUND_HALF_SPAN_M - y) / size * segments);
      const col = Math.round((x + SURROUND_HALF_SPAN_M) / size * segments);
      const metres = SURROUND_M[Math.min(segments, Math.max(0, row))][Math.min(segments, Math.max(0, col))];

      const distance = Math.hypot(x, y);
      const blend = distance <= flatTo
        ? 0
        : Math.min(1, (distance - flatTo) / easeOver);
      // Belt and braces: near the house the land may fall away but never
      // climb above it, whatever the tiles say.
      const raised = (metres - SITE_ELEV_M) * blend;
      position.setZ(i, distance < KEEP_CLEAR_M ? Math.min(raised, 0) : raised);

      // Valley floor green through to a dry, pale ridge.
      const t = high > low ? Math.min(1, Math.max(0, (metres - low) / (high - low))) : 0;
      // Valley floor green through to a dry, pale ridge — muted, because the
      // land is context and must not compete with the beds.
      if (dark) {
        // Land at night is not black — it is the sky's colour, darker.
        colour[i * 3] = 0.07 + 0.05 * t;
        colour[i * 3 + 1] = 0.09 + 0.06 * t;
        colour[i * 3 + 2] = 0.12 + 0.07 * t;
      } else {
        colour[i * 3] = 0.38 + 0.30 * t;
        colour[i * 3 + 1] = 0.46 + 0.22 * t;
        colour[i * 3 + 2] = 0.30 + 0.26 * t;
      }

      // Turn the sample grid into the model's frame.
      position.setX(i, x * cos - y * sin);
      position.setY(i, x * sin + y * cos);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colour, 3));
    geo.computeVertexNormals();
    return geo;
  }, [span, depth, dark]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      // Well below the house's own floor plate. Two centimetres apart, the two
      // surfaces fought for every pixel and the whole scene shimmered as the
      // camera moved; at 40 cm the plate simply sits on the land.
      position={[0, -0.4, 0]}
      // And it does not take shadows. The shadow camera is fitted to the
      // house — about 120 m — while this mesh runs 2.4 km, so every pixel
      // beyond the frustum sampled an undefined depth and came back blotched.
      receiveShadow={false}
      // Nothing in the distance should ever be drawn over the nursery.
      renderOrder={-10}
    >
      {/* Matte and unsaturated: it is context, and must not compete with the
          beds for attention. */}
      <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

/**
 * A sky for the model to sit under.
 *
 * Drawn rather than borrowed: three's own scattering sky is built for a
 * high-dynamic-range pipeline, and under this scene's tone mapping it came out
 * as white haze — a sky nobody would call a sky. Two colours and a gradient
 * are honest about what this is, and they can be tuned by looking.
 *
 * `toneMapped={false}` keeps the chosen colours the colours that appear, and
 * BackSide draws the inside of the dome. It is not lit, so it costs nothing.
 */
function SkyDome({ sunUp, dark }: { sunUp: number; dark: boolean }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(6000, 24, 16), []);

  const material = useMemo(() => {
    // Below the horizon the whole dome cools and darkens: dusk, not midnight,
    // because the light layer still has to be readable at either end of a day.
    const dusk = Math.max(0, Math.min(1, (0.18 - sunUp) / 0.36));
    const zenith = dark
      ? new THREE.Color(NIGHT_COLORS.zenith)
      : new THREE.Color("#5b9bd5").lerp(new THREE.Color("#2c3f63"), dusk);
    const horizon = dark
      ? new THREE.Color(NIGHT_COLORS.horizon)
      : new THREE.Color("#dfeaf3").lerp(new THREE.Color("#e8b98a"), dusk);

    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        zenith: { value: zenith },
        horizon: { value: horizon },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 zenith;
        uniform vec3 horizon;
        varying vec3 vWorld;
        void main() {
          // Height up the dome, eased so the horizon band stays narrow.
          float h = clamp(normalize(vWorld).y, 0.0, 1.0);
          gl_FragColor = vec4(mix(horizon, zenith, pow(h, 0.55)), 1.0);
        }
      `,
    });
  }, [sunUp]);

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-100} />;
}

/** Structural context: posts and the shade-cloth roof from the photos. */
function Structure({
  span,
  depth,
  showRoof,
  postLines,
  dark,
}: {
  span: number;
  depth: number;
  showRoof: boolean;
  dark: boolean;
  /** x position, z extent and cable levels of each post line. */
  postLines: { x: number; z: number; length: number; levels: BedLevel[] }[];
}) {
  /**
   * The posts of the house: nineteen lines across the beds by twelve along
   * them, as Santiago counts them on the ground.
   *
   * They used to be derived from the baskets — a post appeared only where a
   * cable hung — so a house with no baskets recorded yet had no structure at
   * all. The posts carry the shade cloth; they stand whether or not anything is
   * strung between them.
   */
  const posts = useMemo(() => {
    const at = (n: number, extent: number) =>
      Array.from({ length: n }, (_, i) => -extent / 2 + (i * extent) / (n - 1));
    const roads = computeRoads();
    // Nothing is planted on a road and nothing stands on one either — a truck
    // has to get down it. A post landing in a carriageway is moved to its edge.
    const clearOf = (v: number, centre: number, width: number) => {
      const half = width / 2;
      if (Math.abs(v - centre) > half) return v;
      return v < centre ? centre - half : centre + half;
    };
    return postLineXs()
      .map((line) => line.x)
      .map((x) => clearOf(x, roads.vertical.x, roads.vertical.width))
      .flatMap((x) =>
        at(POSTS_ALONG_BED, depth)
          .map((z) => clearOf(z, roads.horizontal.z, roads.horizontal.width))
          .map((z) => ({ x, z, height: ROOF_HEIGHT_M }))
      );
  }, [span, depth]);

  /** One cable per level per line, running the length of the row. */
  const cables = useMemo(
    () =>
      postLines.flatMap((line) =>
        line.levels.map((level) => ({
          key: `${line.x.toFixed(2)}:${line.z.toFixed(2)}:${level}`,
          x: line.x,
          z: line.z,
          y: LEVEL_HEIGHTS_M[level],
          length: line.length,
        }))
      ),
    [postLines]
  );

  return (
    <group>
      {posts.map((post, i) => (
        <mesh key={i} position={[post.x, post.height / 2, post.z]} castShadow>
          <cylinderGeometry args={[0.075, 0.095, post.height, 14]} />
          <meshStandardMaterial color="#7a6048" roughness={0.85} />
        </mesh>
      ))}

      {/* The cables themselves — thin, and along the row, which is Z. */}
      {cables.map((cable) => (
        <mesh
          key={cable.key}
          position={[cable.x, cable.y, cable.z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.016, 0.016, cable.length, 6]} />
          <meshStandardMaterial color="#5b6670" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {showRoof && (
        <mesh position={[0, ROOF_HEIGHT_M, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[span + 3, depth + 3]} />
          <meshStandardMaterial
            color="#1f2a24"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[span + 8, depth + 8]} />
        <meshStandardMaterial color={dark ? NIGHT_COLORS.ground : PLAN_COLORS.ground} roughness={1} />
      </mesh>
    </group>
  );
}

/**
 * Bed identifiers, set at the head of each run so they read from the aisle —
 * the same place the physical tags hang. Billboarded so they stay legible
 * from any orbit angle.
 */
function BedLabel({
  placement,
  compact,
}: {
  placement: BedPlacement;
  compact: boolean;
}) {
  const isGround = placement.bed.type === "ground";
  const y = placement.y + (isGround ? 0.75 : 0.3);
  // Sit just off the near end of the row.
  const z = placement.z + placement.length / 2 + (isGround ? 0.65 : 0.5);

  return (
    <Billboard position={[placement.x, y, z]}>
      <SceneText
        fontSize={compact ? 0.3 : 0.42}
        color={isGround ? "#1f2f42" : "#3f6b4a"}
        outlineWidth={0.035}
        outlineColor="#ffffff"
        renderOrder={999}
        depthTest={false}
      >
        {compact ? `A${placement.bed.level}` : String(placement.bed.bedNumber).padStart(2, "0")}
      </SceneText>
    </Billboard>
  );
}

function PlotLabel({
  id,
  label,
  x,
  z,
  count,
}: {
  id: string;
  label: string;
  x: number;
  z: number;
  count: number;
}) {
  return (
    <Billboard position={[x, 4.6, z]}>
      <SceneText
        fontSize={1.5}
        color="#151f2d"
        weight={700}
        outlineWidth={0.09}
        outlineColor="#ffffff"
        renderOrder={1000}
        depthTest={false}
      >
        {label}
      </SceneText>
      <SceneText
        position={[0, -1.05, 0]}
        fontSize={0.62}
        color="#566d8a"
        weight={500}
        outlineWidth={0.05}
        outlineColor="#ffffff"
        renderOrder={1000}
        depthTest={false}
      >
        {`${count} beds`}
      </SceneText>
      <mesh position={[0, -1.75, 0]} key={id} renderOrder={1000}>
        <boxGeometry args={[3.4, 0.06, 0.06]} />
        <meshBasicMaterial color="#a3b835" depthTest={false} transparent />
      </mesh>
    </Billboard>
  );
}

/**
 * True north, not the model's own axes.
 *
 * The scene lays the beds along Z and it would be convenient if that were
 * north. The survey says it is not: the beds run N17.75°W, so the whole
 * compass is turned to match. Anyone reading a shadow off this view needs the
 * real bearing, and 17.75° is a long way at a low sun.
 */
/**
 * Reports which way the camera is facing, so the compass can be drawn on the
 * screen rather than on the ground.
 *
 * A compass laid flat in the scene was the wrong idea twice over: a bed in
 * front of it hid it, and it shrank to nothing as soon as you zoomed out. A
 * rose in the corner is always legible and always there, which is the whole
 * job of a compass.
 */
function CameraHeading({ onChange }: { onChange: (deg: number) => void }) {
  const last = useRef(999);
  useFrame(({ camera, controls }) => {
    const target = (controls as unknown as { target?: THREE.Vector3 })?.target;
    const dx = camera.position.x - (target?.x ?? 0);
    const dz = camera.position.z - (target?.z ?? 0);
    // The model bearing the camera looks along: it sits opposite its target.
    const heading = ((Math.atan2(-dx, dz) * 180) / Math.PI + 360) % 360;
    // A tenth of a degree is far below what the eye reads, and re-rendering
    // the page on every frame of an orbit is not free.
    if (Math.abs(heading - last.current) < 0.1) return;
    last.current = heading;
    onChange(heading);
  });
  return null;
}

/**
 * Fly the camera to what was just selected.
 *
 * A bed is 1.2 m across in a house 110 m wide. Picking one from a table and
 * then hunting for it by dragging is the difference between a model somebody
 * uses and a model somebody looks at once — and the far corner of C3 is a
 * long way from wherever the camera happens to be.
 *
 * Eased rather than cut, and only when the selection changes: a cut leaves you
 * with no idea where you have been put, and re-framing every frame would fight
 * the hands on the mouse.
 */
function FocusOnSelection({
  placements,
  selectedBedId,
}: {
  placements: BedPlacement[];
  selectedBedId: string | null;
}) {
  const flight = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    start: number;
  } | null>(null);
  const lastId = useRef<string | null>(null);

  useFrame(({ camera, controls, clock }) => {
    const orbit = controls as unknown as {
      target?: THREE.Vector3;
      update?: () => void;
    } | null;

    if (selectedBedId !== lastId.current) {
      lastId.current = selectedBedId;
      const found = placements.find((p) => p.bed.bedId === selectedBedId);
      if (found && orbit?.target) {
        const target = new THREE.Vector3(found.x, found.y + 0.5, found.z);
        // Close enough to read the bed, far enough to keep its neighbours in
        // frame — a plant is not judged in isolation.
        const back = new THREE.Vector3(15, 12, 18);
        flight.current = {
          from: camera.position.clone(),
          to: target.clone().add(back),
          fromTarget: orbit.target.clone(),
          toTarget: target,
          start: clock.elapsedTime,
        };
      } else {
        flight.current = null;
      }
    }

    const run = flight.current;
    if (!run || !orbit?.target) return;

    const t = Math.min(1, (clock.elapsedTime - run.start) / 0.7);
    // Ease out: quick away from where you were, gentle into where you are
    // going, which is what makes it read as travel rather than a jump.
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(run.from, run.to, e);
    orbit.target.lerpVectors(run.fromTarget, run.toTarget, e);
    orbit.update?.();
    if (t >= 1) flight.current = null;
  });

  return null;
}

function ShadeCloth({ placements }: { placements: BedPlacement[] }) {
  const panels = useMemo(() => {
    // Ground beds carry the run's identity; a basket above one sits under
    // the same cloth, so counting both would draw the panel twice.
    const ground = placements
      .filter((p) => p.bed.type === "ground" && p.bed.shade)
      .sort((a, b) => a.bed.fieldId.localeCompare(b.bed.fieldId) || a.bed.bedNumber - b.bed.bedNumber);

    const out: {
      key: string; x: number; z: number; width: number; length: number; shade: ShadeLevel;
    }[] = [];

    let run: BedPlacement[] = [];

    /**
     * Emit a run as several panels rather than one.
     *
     * C1 and C3 carry the same cloth over all 27 beds, which used to draw as a
     * single sheet 49 m across; E1 and E3 are banded into eight. The big sheet
     * flickered as the camera moved and the small ones never did, and that is
     * the whole difference: three.js sorts transparent objects by the distance
     * to their centre, and one point cannot stand in for 49 m of surface, so
     * the sheet's place in the order swung about against the beds under it —
     * which are transparent too, whatever their opacity.
     *
     * Segments of a few beds each put every panel's centre near its own
     * surface. The overhang is added only at the two real ends of the run: a
     * segment that overlapped its neighbour would blend twice and draw a dark
     * seam down the field.
     */
    const SEGMENT_BEDS = 6;
    const flush = () => {
      if (run.length === 0) return;
      const first = run[0];
      const half = first.width / 2;

      for (let i = 0; i < run.length; i += SEGMENT_BEDS) {
        const seg = run.slice(i, i + SEGMENT_BEDS);
        const xs = seg.map((p) => p.x);
        const atStart = i === 0;
        const atEnd = i + SEGMENT_BEDS >= run.length;
        const left = Math.min(...xs) - half - (atStart ? 0.2 : 0);
        const right = Math.max(...xs) + half + (atEnd ? 0.2 : 0);
        out.push({
          key: `${first.bed.fieldId}-${seg[0].bed.bedNumber}-${first.bed.shade}`,
          x: (left + right) / 2,
          z: first.z,
          width: right - left,
          length: first.length + 0.6,
          shade: first.bed.shade as ShadeLevel,
        });
      }
      run = [];
    };

    for (const p of ground) {
      const prev = run[run.length - 1];
      const continues =
        prev &&
        prev.bed.fieldId === p.bed.fieldId &&
        prev.bed.shade === p.bed.shade &&
        p.bed.bedNumber === prev.bed.bedNumber + 1;
      if (!continues) flush();
      run.push(p);
    }
    flush();
    return out;
  }, [placements]);

  if (panels.length === 0) return null;

  return (
    <group>
      {panels.map((panel) => (
        <mesh
          key={panel.key}
          position={[panel.x, SHADE_HEIGHT_M, panel.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          // The cloth is above everything, so it is drawn last whatever the
          // sort makes of it. Without this it could be ordered behind the beds
          // it covers and simply not appear.
          renderOrder={900}
        >
          <planeGeometry args={[panel.width, panel.length]} />
          <meshStandardMaterial
            color={SHADE_COLOR}
            transparent
            opacity={SHADE_OPACITY[panel.shade]}
            side={THREE.DoubleSide}
            depthWrite={false}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function ShadehouseScene({
  placements,
  readings,
  visibleLevels,
  showIrrigation,
  showRoof,
  showShade,
  lens,
  nowMs,
  showPlotLabels,
  showBedNumbers,
  showCompass: _showCompass,
  onCameraHeading,
  showTopography,
  sunAt,
  showSunPath,
  weather,
  selectedBedId,
  onSelect,
}: {
  placements: BedPlacement[];
  readings: Map<string, ZoneReading>;
  visibleLevels: Set<BedLevel>;
  showIrrigation: boolean;
  showRoof: boolean;
  showShade: boolean;
  lens: LensMode;
  nowMs: number;
  showPlotLabels: boolean;
  showBedNumbers: boolean;
  showCompass: boolean;
  /** Called as the camera orbits, so the corner rose can turn with it. */
  onCameraHeading?: (deg: number) => void;
  /** The survey contours, painted flat on the floor. */
  showTopography: boolean;
  /** The moment to light the scene from, or null for the neutral studio lamp. */
  sunAt: Date | null;
  /** Draw the sun's whole path for that day. */
  showSunPath: boolean;
  /** Null when the weather layer is off or the feed has not landed. */
  weather: CurrentConditions | null;
  selectedBedId: string | null;
  onSelect: (bedId: string) => void;
}) {
  /**
   * Math.max of nothing is -Infinity, which made the ground plane infinite and
   * every vertex NaN — three.js then logged "Computed radius is NaN" and drew
   * nothing. A nursery with no beds yet still needs a floor to stand on.
   */
  const span = useMemo(
    () => (placements.length
      ? Math.max(...placements.map((p) => Math.abs(p.x))) * 2 + 4
      : 40),
    [placements]
  );
  const depth = useMemo(
    () => (placements.length
      ? Math.max(...placements.map((p) => Math.abs(p.z) + p.length / 2)) * 2
      : 40),
    [placements]
  );

  const plotAnchors = useMemo(() => {
    const byField = new Map<
      string,
      { xs: number[]; z: number; length: number; count: number; bedWidth: number }
    >();
    for (const p of placements) {
      if (p.bed.type !== "ground") continue;
      const cur = byField.get(p.bed.fieldId);
      if (cur) { cur.xs.push(p.x); cur.count++; }
      else byField.set(p.bed.fieldId, {
        xs: [p.x], z: p.z, length: p.length, count: 1, bedWidth: p.bed.widthM,
      });
    }
    return [...byField.entries()].map(([id, v]) => {
      const field = plotConfigs.find((pc) => pc.id === id);
      const min = Math.min(...v.xs);
      const max = Math.max(...v.xs);
      return {
        id,
        label: field?.label ?? id,
        x: (min + max) / 2,
        z: v.z,
        count: v.count,
        width: max - min + v.bedWidth + 0.5,
        length: v.length + 0.9,
      };
    });
  }, [placements]);

  /**
   * One post line per distinct x/z where cables run, with the levels on it.
   *
   * The levels were being thrown away, so the scene knew where the posts stood
   * but not what ran between them — and drew bare poles. A cable line without
   * its cable is not a shadehouse.
   */
  const postLines = useMemo(() => {
    const seen = new Map<string, { x: number; z: number; length: number; levels: BedLevel[] }>();
    for (const p of placements) {
      if (p.bed.type !== "basket") continue;
      const key = `${p.x.toFixed(2)}:${p.z.toFixed(2)}`;
      const line = seen.get(key);
      if (line) {
        if (!line.levels.includes(p.bed.level)) line.levels.push(p.bed.level);
      } else {
        seen.set(key, { x: p.x, z: p.z, length: p.length, levels: [p.bed.level] });
      }
    }
    for (const line of seen.values()) line.levels.sort((a, b) => a - b);
    return [...seen.values()];
  }, [placements]);

  /**
   * Where to put the sun in the sky dome.
   *
   * The same vector the light uses when the sun layer is on, so the sky, the
   * shadows and the arc all agree; a fixed high sun otherwise, because a
   * layout view should not look like it is 6pm.
   */
  const dark = useDarkMode();

  const sunPosition3D = useMemo<[number, number, number]>(() => {
    const v = sunAt ? sunVector(sunAt, BED_AXIS_BEARING_DEG) : null;
    // Null below the horizon — at night the dome is lit from just under it,
    // which is what gives dusk rather than black.
    if (!v) return sunAt ? [0.2, -0.08, 0.3] : [0.35, 1, 0.25];
    return v;
  }, [sunAt]);

  return (
    <>
      {/* Sky light stays whatever the sun is doing: even under cloud, and even
          at dusk, the beds are not lit only by the beam. It dims with the sun
          rather than going out. */}
      <SkyDome sunUp={sunPosition3D[1]} dark={dark} />
      {/* Dark mode is a night, not a filter: the fill light drops and cools,
          and the beds keep their own colours so the data still reads. */}
      <hemisphereLight
        args={dark ? ["#22354d", "#0d131c", sunAt ? 0.35 : 0.55] : ["#eaf4ff", "#c9c3b4", sunAt ? 0.55 : 1.0]}
      />
      <ambientLight intensity={sunAt ? (dark ? 0.16 : 0.26) : dark ? 0.24 : 0.42} />

      {sunAt ? (
        <Sun at={sunAt} span={span} depth={depth} showArc={showSunPath} />
      ) : (
        <>
          {/* The studio lamp, for reading the layout rather than the light. */}
          <directionalLight
            position={[34, 42, 22]}
            intensity={dark ? 0.55 : 1.05}
            color={dark ? "#bcd0ea" : "#fff8ec"}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-radius={4}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
            shadow-bias={-0.0006}
          />
          <directionalLight position={[-24, 18, -16]} intensity={0.3} color="#cfe3ff" />
        </>
      )}

      <Valley span={span} depth={depth} dark={dark} />
      <Structure span={span} depth={depth} showRoof={showRoof} postLines={postLines} dark={dark} />
      {showShade && <ShadeCloth placements={placements} />}
      <Roads dark={dark} />
      <WeatherLayer conditions={weather} span={span} depth={depth} />

      {placements.map((placement) =>
        placement.bed.type === "ground" ? (
          <Bed
            key={placement.bed.bedId}
            placement={placement}
            reading={readings.get(placement.bed.bedId)}
            showIrrigation={showIrrigation}
            lens={lens}
            nowMs={nowMs}
            dimmed={!visibleLevels.has(placement.bed.level)}
            faded={showTopography}
            selected={selectedBedId === placement.bed.bedId}
            onSelect={onSelect}
          />
        ) : (
          <BasketLine
            key={placement.bed.bedId}
            placement={placement}
            reading={readings.get(placement.bed.bedId)}
            showIrrigation={showIrrigation}
            lens={lens}
            nowMs={nowMs}
            dimmed={!visibleLevels.has(placement.bed.level)}
            faded={showTopography}
            selected={selectedBedId === placement.bed.bedId}
            onSelect={onSelect}
          />
        )
      )}

      {showBedNumbers &&
        placements
          .filter((p) => visibleLevels.has(p.bed.level))
          .map((p) => (
            <BedLabel
              key={`lbl-${p.bed.bedId}`}
              placement={p}
              compact={p.bed.type === "basket"}
            />
          ))}

      {plotAnchors.map((a) => (
        <PlotOutline key={`outline-${a.id}`} x={a.x} z={a.z} width={a.width} length={a.length} />
      ))}

      {showTopography && <Topography span={span} depth={depth} />}
      {onCameraHeading && <CameraHeading onChange={onCameraHeading} />}
      <FocusOnSelection placements={placements} selectedBedId={selectedBedId} />

      {showPlotLabels &&
        plotAnchors.map((a) => (
          <PlotLabel key={a.id} id={a.id} label={a.label} x={a.x} z={a.z} count={a.count} />
        ))}
    </>
  );
}
