/**
 * How much shade a variety will take, as a scale rather than a set of boxes.
 *
 * Shade is ordered: full sun, then one, two or three layers of 65% cloth. A
 * variety that will grow under single OR double is describing a *range* on that
 * scale, not two unrelated answers — so this stores the two ends.
 *
 * It replaced a multi-select whose combinations were kept as their own choice
 * values. That worked for three options and fell apart at four: every possible
 * combination has to exist as a label, and four gives fifteen of them, most of
 * which are nonsense ("Full sun and Triple").
 *
 * Tap one step for a variety that takes only that. Tap a second for a range —
 * everything between fills in, because that is what "single to double" means.
 * Tapping the only chosen step clears it.
 */

import { Sun, CloudSun, Cloud, CloudFog } from "lucide-react";

/** In order, least shade first. The order is the model, not decoration. */
export const SHADE_SCALE = [
  { value: "Full sun", short: "Full sun", blocks: "0%", icon: Sun },
  { value: "Single", short: "Single", blocks: "65%", icon: CloudSun },
  { value: "Double", short: "Double", blocks: "87.75%", icon: Cloud },
  { value: "Triple", short: "Triple", blocks: "95.71%", icon: CloudFog },
] as const;

const indexOf = (value: unknown) =>
  SHADE_SCALE.findIndex((s) => s.value === String(value ?? ""));

export interface ShadeScaleProps {
  min: unknown;
  max: unknown;
  onChange: (min: string, max: string) => void;
}

export default function ShadeScale({ min, max, onChange }: ShadeScaleProps) {
  const lo = indexOf(min);
  const hi = indexOf(max);
  // A single chosen step reads as a range of one, so the same code lights it.
  const from = lo < 0 ? hi : lo;
  const to = hi < 0 ? lo : hi;

  const select = (i: number) => {
    if (from < 0) return onChange(SHADE_SCALE[i].value, SHADE_SCALE[i].value);
    if (from === to) {
      if (i === from) return onChange("", "");            // tapping it again clears
      const [a, b] = i < from ? [i, from] : [from, i];
      return onChange(SHADE_SCALE[a].value, SHADE_SCALE[b].value);
    }
    // A range is already set, so start again from what was tapped.
    return onChange(SHADE_SCALE[i].value, SHADE_SCALE[i].value);
  };

  return (
    <div>
      <div className="flex gap-1.5">
        {SHADE_SCALE.map((step, i) => {
          const on = from >= 0 && i >= from && i <= to;
          const Icon = step.icon;
          return (
            <button
              key={step.value}
              type="button"
              aria-pressed={on}
              onClick={() => select(i)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border
                transition-colors cursor-pointer focus:outline-none
                focus-visible:ring-2 focus-visible:ring-lime-400/40 ${
                on
                  ? "chip-selected"
                  : "bg-white text-navy-500 border-sand-200 hover:border-lime-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[12px] font-medium leading-none">{step.short}</span>
              {/* What the cloth blocks, which is how it is bought and spoken
                  about — 65% shade cloth, not 35% transmission. */}
              <span className={`text-[9px] leading-none tabular-nums ${
                on ? "opacity-70" : "text-navy-300"}`}>
                {step.blocks}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] text-navy-400">
        {from < 0
          ? "Tap one. Tap a second for a range if more than one suits it."
          : from === to
            ? `Only ${SHADE_SCALE[from].short.toLowerCase()} — tap another for a range, or tap again to clear.`
            : `${SHADE_SCALE[from].short} to ${SHADE_SCALE[to].short.toLowerCase()}, and anything between.`}
      </p>
    </div>
  );
}
