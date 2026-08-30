import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, RoundedBox } from "@react-three/drei";
// Not drei's <Text>: troika fetches a font index from a CDN, which the player
// blocks, and the failure takes the whole scene down. See SceneText.
import SceneText from "./SceneText";
import { drawTerrainOverlay } from "../services/terrainTexture";
import { BED_AXIS_BEARING_DEG } from "../services/site";
import { sunVector, atLocal } from "../services/solar";
import { relativeLight } from "../services/bedLight";
import * as THREE from "three";
import {
  LEVEL_HEIGHTS_M,
  stateColors,
  plotConfigs,
  POSTS_ALONG_BED,
  POSTS_ACROSS_BEDS,
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

/** Gap between the two field columns — the logistics road in the layout. */
const ROAD_M = 3.5;
const PLOT_GAP_M = 3.5;
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
}: {
  along: "x" | "z";
  fixed: number;
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
          <meshBasicMaterial color={PLAN_COLORS.roadLine} />
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

function Roads() {
  const roads = useMemo(() => computeRoads(), []);
  return (
    <group>
      {/* Logistics road, running the length of the house */}
      <mesh position={[roads.vertical.x, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[roundedRectShape(roads.vertical.width, roads.vertical.length, 0.9)]} />
        <meshStandardMaterial color={PLAN_COLORS.road} roughness={1} />
      </mesh>
      <RoadDashes along="z" fixed={roads.vertical.x} length={roads.vertical.length} />

      {/* Cross aisle */}
      <mesh position={[0, 0.007, roads.horizontal.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[roundedRectShape(roads.horizontal.length, roads.horizontal.width, 0.9)]} />
        <meshStandardMaterial color={PLAN_COLORS.road} roughness={1} />
      </mesh>
      <RoadDashes along="x" fixed={roads.horizontal.z} length={roads.horizontal.length} />

      <SceneText
        position={[roads.vertical.x, 0.05, roads.vertical.length / 2 + 1.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.05}
        color={PLAN_COLORS.roadLabel}
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

    // Beds run along Z; consecutive beds step along X.
    const x = columnStart + (bed.bedNumber - 0.5) * field.bedWidth;
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
  faded,
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
          opacity={dimmed ? 0.12 : faded ? 0.34 : 1}
          depthWrite={!faded && !dimmed}
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

/** Pot spacing along the cable, from the photos. */
const POT_PITCH_M = 0.45;
const POT_DROP_M = 0.22;

/**
 * An air bed is a cable strung through the posts with terracotta pots hooked
 * along it — not a solid bar. Pots are instanced so several thousand of them
 * cost one draw call.
 */
function AirLine({
  placement,
  reading,
  showIrrigation,
  lens,
  nowMs,
  dimmed,
  faded,
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
  const opacity = dimmed ? 0.1 : faded ? 0.32 : 1;

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

      {/* Terracotta pots hooked along the cable — round or square. */}
      <instancedMesh ref={potsRef} args={[undefined, undefined, matrices.length]}>
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
      >
        <sphereGeometry args={[0.165, 12, 9]} />
        <meshStandardMaterial
          color={foliage}
          emissive={foliage}
          emissiveIntensity={selected ? 0.45 : 0}
          transparent
          opacity={dimmed ? 0.1 : faded ? 0.3 : 0.95}
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
 * air bed shades the ground bed beneath it, and that is a real term in the
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
  // Far enough out to read as a direction rather than a lamp in the room.
  const radius = Math.max(span, depth) * 0.95;
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

  const arcGeometry = useMemo(
    () => (arc.length ? new THREE.BufferGeometry().setFromPoints(arc) : null),
    [arc]
  );
  useEffect(() => () => arcGeometry?.dispose(), [arcGeometry]);

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
        <mesh position={position}>
          <sphereGeometry args={[radius * 0.035, 20, 16]} />
          <meshBasicMaterial color={colour} toneMapped={false} />
        </mesh>
      )}

      {arcGeometry && (
        <line>
          <primitive object={arcGeometry} attach="geometry" />
          <lineBasicMaterial color="#e0b64a" transparent opacity={0.5} />
        </line>
      )}
    </group>
  );
}

/** Structural context: posts and the shade-cloth roof from the photos. */
function Structure({
  span,
  depth,
  showRoof,
  postLines,
}: {
  span: number;
  depth: number;
  showRoof: boolean;
  /** x position, z extent and cable levels of each post line. */
  postLines: { x: number; z: number; length: number; levels: BedLevel[] }[];
}) {
  /**
   * The posts of the house: nineteen lines across the beds by twelve along
   * them, as Santiago counts them on the ground.
   *
   * They used to be derived from the air beds — a post appeared only where a
   * cable hung — so a house with no air beds recorded yet had no structure at
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
    return at(POSTS_ACROSS_BEDS, span)
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
        <meshStandardMaterial color={PLAN_COLORS.ground} roughness={1} />
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

function ShadeCloth({ placements }: { placements: BedPlacement[] }) {
  const panels = useMemo(() => {
    // Ground beds carry the run's identity; an air bed above one sits under
    // the same cloth, so counting both would draw the panel twice.
    const ground = placements
      .filter((p) => p.bed.type === "ground" && p.bed.shade)
      .sort((a, b) => a.bed.fieldId.localeCompare(b.bed.fieldId) || a.bed.bedNumber - b.bed.bedNumber);

    const out: {
      key: string; x: number; z: number; width: number; length: number; shade: ShadeLevel;
    }[] = [];

    let run: BedPlacement[] = [];
    const flush = () => {
      if (run.length === 0) return;
      const first = run[0];
      const xs = run.map((p) => p.x);
      const halfWidth = first.width / 2;
      const left = Math.min(...xs) - halfWidth;
      const right = Math.max(...xs) + halfWidth;
      out.push({
        key: `${first.bed.fieldId}-${first.bed.bedNumber}-${first.bed.shade}`,
        x: (left + right) / 2,
        z: first.z,
        // A little wider than the beds, the way cloth overhangs its posts.
        width: right - left + 0.4,
        length: first.length + 0.6,
        shade: first.bed.shade as ShadeLevel,
      });
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
      if (p.bed.type !== "air") continue;
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

  return (
    <>
      {/* Sky light stays whatever the sun is doing: even under cloud, and even
          at dusk, the beds are not lit only by the beam. It dims with the sun
          rather than going out. */}
      <hemisphereLight args={["#eaf4ff", "#c9c3b4", sunAt ? 0.55 : 1.0]} />
      <ambientLight intensity={sunAt ? 0.26 : 0.42} />

      {sunAt ? (
        <Sun at={sunAt} span={span} depth={depth} showArc={showSunPath} />
      ) : (
        <>
          {/* The studio lamp, for reading the layout rather than the light. */}
          <directionalLight
            position={[34, 42, 22]}
            intensity={1.05}
            color="#fff8ec"
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

      <Structure span={span} depth={depth} showRoof={showRoof} postLines={postLines} />
      {showShade && <ShadeCloth placements={placements} />}
      <Roads />
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
          <AirLine
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
              compact={p.bed.type === "air"}
            />
          ))}

      {plotAnchors.map((a) => (
        <PlotOutline key={`outline-${a.id}`} x={a.x} z={a.z} width={a.width} length={a.length} />
      ))}

      {showTopography && <Topography span={span} depth={depth} />}
      {onCameraHeading && <CameraHeading onChange={onCameraHeading} />}

      {showPlotLabels &&
        plotAnchors.map((a) => (
          <PlotLabel key={a.id} id={a.id} label={a.label} x={a.x} z={a.z} count={a.count} />
        ))}
    </>
  );
}
