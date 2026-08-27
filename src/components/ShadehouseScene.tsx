import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import {
  LEVEL_HEIGHTS_M,
  stateColors,
  plotConfigs,
  type BedLevel,
  type ShadehouseBed,
} from "./ShadehouseView";
import { zoneStatusColors, type ZoneReading } from "../services/irrigation";

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

/** Gap between the two plot columns — the logistics road in the layout. */
const ROAD_M = 3.5;
const PLOT_GAP_M = 3.5;

export interface RoadLayout {
  vertical: { x: number; width: number; length: number };
  horizontal: { z: number; width: number; length: number };
}

export function computeRoads(): RoadLayout {
  const widthOf = (plotId: string) => {
    const plot = plotConfigs.find((p) => p.id === plotId)!;
    return plot.bedCount * plot.bedWidth;
  };
  const westWidth = Math.max(widthOf("E3"), widthOf("E1"));
  const eastWidth = Math.max(widthOf("C3"), widthOf("C1"));
  const totalWidth = westWidth + ROAD_M + eastWidth;
  const bedLength = plotConfigs[0].bedLength;
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

/** Rounded outline around a plot, matching the plan's rx="4" frame. */
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

      <Text
        position={[roads.vertical.x, 0.05, roads.vertical.length / 2 + 1.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.05}
        color={PLAN_COLORS.roadLabel}
        anchorX="center"
        anchorY="middle"
      >
        Logistics Road
      </Text>
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
          opacity={dimmed ? 0.12 : 1}
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
        <mesh key={i} position={[x, 1.55, z]} castShadow>
          <cylinderGeometry args={[0.075, 0.095, 3.1, 14]} />
          <meshStandardMaterial color="#7a6048" roughness={0.85} />
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
      <Text
        fontSize={compact ? 0.3 : 0.42}
        color={isGround ? "#1f2f42" : "#3f6b4a"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.035}
        outlineColor="#ffffff"
        renderOrder={999}
        material-depthTest={false}
        material-transparent
      >
        {compact ? `A${placement.bed.level}` : String(placement.bed.bedNumber).padStart(2, "0")}
      </Text>
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
      <Text
        fontSize={1.5}
        color="#151f2d"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.09}
        outlineColor="#ffffff"
        renderOrder={1000}
        material-depthTest={false}
        material-transparent
      >
        {label}
      </Text>
      <Text
        position={[0, -1.05, 0]}
        fontSize={0.62}
        color="#566d8a"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#ffffff"
        renderOrder={1000}
        material-depthTest={false}
        material-transparent
      >
        {`${count} beds`}
      </Text>
      <mesh position={[0, -1.75, 0]} key={id} renderOrder={1000}>
        <boxGeometry args={[3.4, 0.06, 0.06]} />
        <meshBasicMaterial color="#a3b835" depthTest={false} transparent />
      </mesh>
    </Billboard>
  );
}

function Compass({ span, depth }: { span: number; depth: number }) {
  const half = { x: span / 2 + 3.5, z: depth / 2 + 3.5 };
  const marks: { label: string; pos: [number, number, number]; primary: boolean }[] = [
    { label: "N", pos: [0, 0.05, -half.z], primary: true },
    { label: "S", pos: [0, 0.05, half.z], primary: false },
    { label: "E", pos: [half.x, 0.05, 0], primary: false },
    { label: "W", pos: [-half.x, 0.05, 0], primary: false },
  ];

  return (
    <group>
      {marks.map((m) => (
        <group key={m.label} position={m.pos}>
          <Text
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={m.primary ? 4 : 3}
            color={m.primary ? "#3d8b40" : "#8a9aae"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.16}
            outlineColor="#ffffff"
          >
            {m.label}
          </Text>
          {m.primary && (
            // Arrow pointing north, as on the plan.
            <mesh position={[0, 0, -3.4]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[1.1, 2.6, 3]} />
              <meshBasicMaterial color="#3d8b40" />
            </mesh>
          )}
        </group>
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
  lens,
  nowMs,
  showPlotLabels,
  showBedNumbers,
  showCompass,
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
  showPlotLabels: boolean;
  showBedNumbers: boolean;
  showCompass: boolean;
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

  const plotAnchors = useMemo(() => {
    const byPlot = new Map<
      string,
      { xs: number[]; z: number; length: number; count: number; bedWidth: number }
    >();
    for (const p of placements) {
      if (p.bed.type !== "ground") continue;
      const cur = byPlot.get(p.bed.plotId);
      if (cur) { cur.xs.push(p.x); cur.count++; }
      else byPlot.set(p.bed.plotId, {
        xs: [p.x], z: p.z, length: p.length, count: 1, bedWidth: p.bed.widthM,
      });
    }
    return [...byPlot.entries()].map(([id, v]) => {
      const plot = plotConfigs.find((pc) => pc.id === id);
      const min = Math.min(...v.xs);
      const max = Math.max(...v.xs);
      return {
        id,
        label: plot?.label ?? id,
        x: (min + max) / 2,
        z: v.z,
        count: v.count,
        width: max - min + v.bedWidth + 0.5,
        length: v.length + 0.9,
      };
    });
  }, [placements]);

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
      <hemisphereLight args={["#eaf4ff", "#c9c3b4", 1.0]} />
      <ambientLight intensity={0.42} />
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

      <Structure span={span} depth={depth} showRoof={showRoof} postLines={postLines} />
      <Roads />

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

      {showCompass && <Compass span={span} depth={depth} />}

      {showPlotLabels &&
        plotAnchors.map((a) => (
          <PlotLabel key={a.id} id={a.id} label={a.label} x={a.x} z={a.z} count={a.count} />
        ))}
    </>
  );
}
