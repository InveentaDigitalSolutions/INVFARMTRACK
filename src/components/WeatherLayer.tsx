import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
// drei's <Text> fetches a font index from a CDN, which the player blocks —
// and the failure blanks the whole scene. See SceneText.
import SceneText from "./SceneText";
import * as THREE from "three";
import {
  precipitationKind,
  windDirectionLabel,
  type CurrentConditions,
} from "../services/weather";

/**
 * Weather rendered into the scene rather than beside it.
 *
 * Wind direction follows the meteorological convention: `windDirection` is the
 * bearing the wind blows FROM, so the arrow points along bearing + 180. North
 * is -Z here, matching the plan, so a bearing maps to (sin θ, -cos θ).
 */
export function windVector(fromBearingDeg: number): THREE.Vector3 {
  const toward = ((fromBearingDeg + 180) * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(toward), 0, -Math.cos(toward)).normalize();
}

const DROPS_BY_KIND: Record<ReturnType<typeof precipitationKind>, number> = {
  none: 0,
  drizzle: 900,
  rain: 2200,
  heavy: 4200,
  storm: 5200,
};

function Rain({
  conditions,
  span,
  depth,
}: {
  conditions: CurrentConditions;
  span: number;
  depth: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const kind = precipitationKind(conditions.weatherCode);
  const count = DROPS_BY_KIND[kind];

  const CEILING = 14;
  const drift = useMemo(
    () => windVector(conditions.windDirection).multiplyScalar(Math.min(1, conditions.windSpeed / 45)),
    [conditions.windDirection, conditions.windSpeed]
  );

  // Each drop gets a start height and a speed; the loop just advances them.
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.sin(i * 12.9898) * 43758.5453) % 1,
        z: (Math.sin(i * 78.233) * 12345.6789) % 1,
        y: (Math.sin(i * 3.14159) * 9876.54321) % 1,
        speed: 9 + (Math.abs(Math.sin(i * 4.321)) * 7),
      })),
    [count]
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh || !count) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      const fall = (s.y * CEILING + t * s.speed) % CEILING;
      const y = CEILING - fall;
      // Drift sideways in proportion to how far the drop has fallen.
      const travelled = CEILING - y;
      dummy.position.set(
        (s.x - 0.5) * span + drift.x * travelled,
        y,
        (s.z - 0.5) * depth + drift.z * travelled
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!count) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.022, 0.42, 0.022]} />
      <meshBasicMaterial
        color={kind === "storm" ? "#7dd3fc" : "#9ec9e8"}
        transparent
        opacity={kind === "drizzle" ? 0.35 : 0.55}
      />
    </instancedMesh>
  );
}

/** Ground-anchored wind arrow with speed and cardinal readout. */
function WindIndicator({
  conditions,
  x,
  z,
}: {
  conditions: CurrentConditions;
  x: number;
  z: number;
}) {
  const group = useRef<THREE.Group>(null);
  const vec = useMemo(() => windVector(conditions.windDirection), [conditions.windDirection]);
  const heading = useMemo(() => Math.atan2(vec.x, -vec.z), [vec]);
  const calm = conditions.windSpeed < 1;

  // Gentle sway so the vane reads as live rather than a static icon.
  useFrame(({ clock }) => {
    if (!group.current || calm) return;
    const sway = Math.sin(clock.elapsedTime * 1.4) * 0.06;
    group.current.rotation.y = heading + sway;
  });

  return (
    <group position={[x, 0, z]}>
      {/* Mast */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 4.2, 12]} />
        <meshStandardMaterial color="#8a9aae" roughness={0.6} metalness={0.2} />
      </mesh>

      <group ref={group} position={[0, 4.2, 0]} rotation={[0, heading, 0]}>
        {/* Arrow points the way the wind is blowing. */}
        <mesh position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[0.42, 1.3, 14]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 2.2, 10]} />
          <meshStandardMaterial color="#7dd3fc" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -1.2]}>
          <boxGeometry args={[0.05, 0.7, 0.9]} />
          <meshStandardMaterial color="#bae6fd" roughness={0.7} />
        </mesh>
      </group>

      <Billboard position={[0, 5.6, 0]}>
        <SceneText
          fontSize={0.85}
          color="#1f2f42"
          outlineWidth={0.06}
          outlineColor="#ffffff"
        >
          {calm
            ? "Calm"
            : `${conditions.windSpeed.toFixed(0)} km/h ${windDirectionLabel(conditions.windDirection)}`}
        </SceneText>
      </Billboard>
    </group>
  );
}

export default function WeatherLayer({
  conditions,
  span,
  depth,
}: {
  conditions: CurrentConditions | null;
  span: number;
  depth: number;
}) {
  if (!conditions) return null;

  // Cloud cover and daylight dim the scene, so the render tracks the sky
  // outside rather than showing perpetual noon.
  const daylight = conditions.isDay ? 1 : 0.35;
  const clouded = 1 - (conditions.cloudCover / 100) * 0.45;
  const overcast = daylight * clouded;

  return (
    <group>
      <ambientLight intensity={0.18 * overcast + 0.12} color={conditions.isDay ? "#ffffff" : "#9db4d0"} />
      <Rain conditions={conditions} span={span} depth={depth} />
      <WindIndicator conditions={conditions} x={-span / 2 - 2.5} z={depth / 2 - 6} />
    </group>
  );
}
