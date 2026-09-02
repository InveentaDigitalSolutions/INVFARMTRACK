/**
 * The compass, drawn on the screen rather than in the scene.
 *
 * It used to lie flat on the ground: a bed in front of it hid it, and it shrank
 * to nothing when the camera pulled back — "not great, and sometimes not
 * correctly visible", which was fair. A rose pinned to the corner is always
 * legible, never occluded, and turns as the camera orbits.
 *
 * It carries one fact the scene cannot show on its own: the beds run N17.75°W,
 * so the model's own axes and the real compass are not the same thing. The
 * lighter mark is the bed axis, the green needle is true north, and the angle
 * between them is the truth the survey gave us.
 */

import { BED_AXIS_BEARING_DEG } from "../services/site";

/** True north's bearing in the model's own frame. */
const NORTH_IN_MODEL = (360 - BED_AXIS_BEARING_DEG + 360) % 360;

export interface SceneCompassProps {
  /** The model bearing the camera is looking along. */
  heading: number;
}

export default function SceneCompass({ heading }: SceneCompassProps) {
  // Screen angle, clockwise from straight up, of a given model bearing.
  const onScreen = (modelBearing: number) => modelBearing - heading;
  const north = onScreen(NORTH_IN_MODEL);

  return (
    <div
      className="absolute bottom-3 right-3 z-10 select-none pointer-events-none"
      aria-hidden="true"
    >
      <div className="relative w-[92px] h-[92px] rounded-full bg-white/85 dark:bg-navy-900/80 backdrop-blur-sm
                      ring-1 ring-sand-300/70 dark:ring-white/15 shadow-sm">
        <svg viewBox="-52 -52 104 104" className="w-full h-full">
          {/* The bed axis, so the offset between the house and north is visible
              rather than something you have to be told. */}
          <g transform={`rotate(${onScreen(0)})`}>
            <line x1="0" y1="34" x2="0" y2="-34" stroke="currentColor" className="text-[#b9c3d0] dark:text-white/25" strokeWidth="3" strokeDasharray="4 3" />
          </g>

          <g transform={`rotate(${north})`}>
            <line x1="0" y1="22" x2="0" y2="-16" stroke="#3d8b40" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="0,-30 -6.5,-15 6.5,-15" fill="#3d8b40" />
            {/* Every label is counter-rotated, N included. Leaving N inside the
                turning group drew it lying on its side. */}
            {(["N", "E", "S", "W"] as const).map((label, i) => {
              const a = (i * 90 * Math.PI) / 180;
              return (
                <text
                  key={label}
                  x={Math.sin(a) * 40}
                  y={-Math.cos(a) * 40 + (i === 0 ? 4.5 : 3.5)}
                  textAnchor="middle"
                  fontSize={i === 0 ? 14 : 10}
                  fontWeight={i === 0 ? 800 : 700}
                  fill={i === 0 ? "#4aa64f" : "currentColor"}
                  className={i === 0 ? "" : "text-[#8a9aae] dark:text-white/45"}
                  transform={`rotate(${-north} ${Math.sin(a) * 40} ${-Math.cos(a) * 40})`}
                >
                  {label}
                </text>
              );
            })}
          </g>
          <circle cx="0" cy="0" r="2.6" fill="currentColor" className="text-[#5b6c80] dark:text-white/40" />
        </svg>
      </div>
      <p className="mt-1 text-center text-[9px] font-medium text-navy-400 dark:text-d-secondary tabular-nums">
        beds N17.8°W
      </p>
    </div>
  );
}
