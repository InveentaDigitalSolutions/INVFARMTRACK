import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  LEVEL_HEIGHTS_M,
  stateColors,
  plotConfigs,
  type BedLevel,
  type ShadehouseBed,
} from "./ShadehouseView";
import { zoneStatusColors, type ZoneReading } from "../services/irrigation";

/** Gap between the two plot columns — the logistics road in the layout. */
const ROAD_M = 3.5;
const PLOT_GAP_M = 2.5;

export interface BedPlacement {
  bed: ShadehouseBed;
  x: number;
  z: number;
  y: number;
  width: number;
  length: number;
}

/**
 * Lay the plots out 2x2 with a road between, mirroring the 2D layout so the
 * two views stay mentally interchangeable.
 */
export function placeBeds(beds: ShadehouseBed[]): BedPlacement[] {
  const widthOf = (plotId: string) => {
    const plot = plotConfigs.find((p) => p.id === plotId)!;
    return plot.bedCount * plot.bedWidth;
  };

  const westWidth = Math.max(widthOf("E3"), widthOf("E1"));
  const eastWidth = Math.max(widthOf("C3"), widthOf("C1"));
  const totalWidth = westWidth + ROAD_M + eastWidth;

  return beds.map((bed) => {
    const plot = plotConfigs.find((p) => p.id === bed.plotId)!;
    const isEast = plot.position === "NE" || plot.position === "SE";
    const isNorth = plot.position === "NW" || plot.position === "NE";

    const columnStart = isEast
      ? -totalWidth / 2 + westWidth + ROAD_M
      : -totalWidth / 2;

    // Beds run along Z; consecutive beds step along X.
    const x = columnStart + (bed.bedNumber - 0.5) * plot.bedWidth;
    const z = isNorth
      ? -(plot.bedLength / 2 + PLOT_GAP_M / 2)
      : plot.bedLength / 2 + PLOT_GAP_M / 2;

    return {
      bed,
      x,
      z,
      y: LEVEL_HEIGHTS_M[bed.level],
      // Leave a sliver between beds so rows stay individually readable.
      width: plot.bedWidth * 0.86,
      length: plot.bedLength,
    };
  });
}

/**
 * Data lenses. The same geometry, re-read under a different question — the
 * idea God's Eye View uses for its sensor modes. Only this function changes
 * per lens; the scene, layers and selection are untouched.
 */
export type LensMode = "state" | "age" | "harvest" | "irrigated" | "issues";

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
  selected,
  onSelect,
}: {
  placement: BedPlacement;
  reading?: ZoneReading;
  showIrrigation: boolean;
  lens: LensMode;
  nowMs: number;
  dimmed: boolean;
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
    <mesh
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
      <boxGeometry args={[placement.width, height, placement.length]} />
      <meshStandardMaterial
        ref={mat}
        color={base}
        emissive={base}
        transparent
        opacity={dimmed ? 0.12 : 1}
        roughness={0.75}
        metalness={0}
      />
    </mesh>
  );
}

/**
 * Foliage is always green — a plant does not turn orange because it is ready
 * to cut. State is expressed as a shift in vitality, and the irrigation layer
 * is what introduces non-green hues.
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
  selected,
  onSelect,
}: {
  placement: BedPlacement;
  reading?: ZoneReading;
  showIrrigation: boolean;
  lens: LensMode;
  nowMs: number;
  dimmed: boolean;
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

      {/* Terracotta pots hooked along the cable — round or square. */}
      <instancedMesh ref={potsRef} args={[undefined, undefined, matrices.length]}>
        {placement.bed.potType === "square" ? (
          <boxGeometry args={[0.2, 0.17, 0.2]} />
        ) : (
          <cylinderGeometry args={[0.115, 0.075, 0.17, 10]} />
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
        <sphereGeometry args={[0.16, 7, 5]} />
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
  /** x position and z extent of each post line the cables run through. */
  postLines: { x: number; z: number; length: number }[];
}) {
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    const step = 6;
    for (const line of postLines) {
      const start = line.z - line.length / 2;
      for (let z = start; z <= line.z + line.length / 2 + 0.01; z += step) {
        out.push([line.x, z]);
      }
    }
    return out;
  }, [postLines]);

  return (
    <group>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.55, z]}>
          <cylinderGeometry args={[0.07, 0.08, 3.1, 6]} />
          <meshStandardMaterial color="#5b4636" roughness={0.9} />
        </mesh>
      ))}
      {showRoof && (
        <mesh position={[0, 3.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
        <planeGeometry args={[span + 5, depth + 5]} />
        <meshStandardMaterial color="#d9d3c6" roughness={1} />
      </mesh>
    </group>
  );
}

export default function ShadehouseScene({
  placements,
  readings,
  visibleLevels,
  showIrrigation,
  showRoof,
  lens,
  nowMs,
  selectedBedId,
  onSelect,
}: {
  placements: BedPlacement[];
  readings: Map<string, ZoneReading>;
  visibleLevels: Set<BedLevel>;
  showIrrigation: boolean;
  showRoof: boolean;
  lens: LensMode;
  nowMs: number;
  selectedBedId: string | null;
  onSelect: (bedId: string) => void;
}) {
  const span = useMemo(
    () => Math.max(...placements.map((p) => Math.abs(p.x))) * 2 + 4,
    [placements]
  );
  const depth = useMemo(
    () => Math.max(...placements.map((p) => Math.abs(p.z) + p.length / 2)) * 2,
    [placements]
  );

  // One post line per distinct x/z where a cable runs.
  const postLines = useMemo(() => {
    const seen = new Map<string, { x: number; z: number; length: number }>();
    for (const p of placements) {
      if (p.bed.type !== "air") continue;
      const key = `${p.x.toFixed(2)}:${p.z.toFixed(2)}`;
      if (!seen.has(key)) seen.set(key, { x: p.x, z: p.z, length: p.length });
    }
    return [...seen.values()];
  }, [placements]);

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[28, 34, 18]} intensity={1.15} />
      <directionalLight position={[-20, 16, -14]} intensity={0.35} />

      <Structure span={span} depth={depth} showRoof={showRoof} postLines={postLines} />

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
            selected={selectedBedId === placement.bed.bedId}
            onSelect={onSelect}
          />
        )
      )}
    </>
  );
}
