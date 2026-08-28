/**
 * Reading the production data aloud.
 *
 * Every report Santiago shared opens with a sentence rather than a chart:
 * "Briarport demonstrates developing urban performance. Excels in transit
 * infrastructure (65.0%), while housing affordability (24.6%) presents the key
 * development opportunity." It says what the numbers mean before showing them.
 *
 * The sentences here are assembled from the figures, so they cannot drift from
 * the charts beneath them. Where there is nothing to say, they say that
 * instead of reaching — a nursery with two months of data has no trend, and
 * claiming one would be the same fault as the dashboard that asserted "+23%".
 */

export interface Series {
  label: string;
  value: number;
}

export interface Insight {
  /** The verdict, as a sentence. */
  headline: string;
  /** The supporting line, or none when there is nothing honest to add. */
  detail?: string;
  tone: "good" | "warn" | "bad" | "neutral";
}

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / b) * 100));

/** Best and worst points in a series, which the reference reports always name. */
export function extremes(points: Series[]): { best?: Series; worst?: Series } {
  const real = points.filter((p) => Number.isFinite(p.value));
  if (real.length === 0) return {};
  return {
    best: real.reduce((a, b) => (b.value > a.value ? b : a)),
    worst: real.reduce((a, b) => (b.value < a.value ? b : a)),
  };
}

/**
 * How harvest is going, in a sentence.
 *
 * Needs at least three months before it will call a direction: two points is
 * a line through any two numbers, not a trend.
 */
export function harvestInsight(months: Series[]): Insight {
  const withData = months.filter((m) => m.value > 0);
  if (withData.length === 0) {
    return { headline: "No harvest recorded yet", tone: "neutral" };
  }
  if (withData.length < 3) {
    const total = withData.reduce((s, m) => s + m.value, 0);
    return {
      headline: `${total.toLocaleString()} stems cut so far`,
      detail: "Too few months recorded to call a trend yet.",
      tone: "neutral",
    };
  }

  const half = Math.floor(months.length / 2);
  const earlier = months.slice(0, half).reduce((s, m) => s + m.value, 0);
  const later = months.slice(half).reduce((s, m) => s + m.value, 0);
  const change = pct(later, earlier);
  const { best, worst } = extremes(months);

  const direction =
    Math.abs(change) < 10 ? "steady" : change > 0 ? "rising" : "falling";
  return {
    headline: `Harvest is ${direction}${Math.abs(change) >= 10 ? ` — ${change > 0 ? "+" : ""}${change}%` : ""}`,
    detail: best && worst
      ? `Best ${best.label} (${best.value.toLocaleString()}) · weakest ${worst.label} (${worst.value.toLocaleString()})`
      : undefined,
    tone: direction === "falling" ? "warn" : direction === "rising" ? "good" : "neutral",
  };
}

/**
 * What the nursery is holding, as a sentence naming the strongest and weakest
 * varieties — the shape the reference reports use for dimensions.
 */
export function varietyInsight(byVariety: Series[]): Insight {
  const real = byVariety.filter((v) => v.value > 0);
  if (real.length === 0) {
    return { headline: "Nothing attributed to a variety yet", tone: "neutral" };
  }
  if (real.length === 1) {
    return {
      headline: `All output is ${real[0].label}`,
      detail: `${real[0].value.toLocaleString()} stems`,
      tone: "neutral",
    };
  }

  const sorted = [...real].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, v) => s + v.value, 0);
  const top = sorted[0];
  const share = Math.round((top.value / total) * 100);
  const bottom = sorted[sorted.length - 1];

  return {
    headline: `${top.label} leads at ${share}% of output`,
    // Concentration is the thing worth flagging: one variety carrying most of
    // the season is a risk, not just a fact.
    detail:
      share >= 60
        ? `${bottom.label} is weakest at ${Math.round((bottom.value / total) * 100)}%. Output is concentrated in one variety.`
        : `${bottom.label} is weakest at ${Math.round((bottom.value / total) * 100)}%.`,
    tone: share >= 60 ? "warn" : "good",
  };
}

/** How much of the nursery is in use, and whether that is worth remarking on. */
export function occupancyInsight(planted: number, total: number): Insight {
  if (total === 0) return { headline: "No beds recorded", tone: "neutral" };
  const share = Math.round((planted / total) * 100);
  const idle = total - planted;
  return {
    headline: `${share}% of beds are carrying a crop`,
    detail: idle > 0 ? `${idle} bed${idle === 1 ? "" : "s"} standing empty` : "Every bed is planted.",
    tone: share >= 85 ? "good" : share >= 60 ? "neutral" : "warn",
  };
}

/**
 * The opening paragraph: what is going well, what is not, in prose.
 * Built from the same figures the tiles show, so the two cannot disagree.
 */
export function summary(parts: {
  harvest: Insight;
  variety: Insight;
  occupancy: Insight;
  waves: number;
  unscheduled: number;
}): string {
  const sentences: string[] = [];
  sentences.push(`${parts.harvest.headline}.`);
  if (parts.variety.headline !== "Nothing attributed to a variety yet") {
    sentences.push(`${parts.variety.headline}.`);
  }
  sentences.push(`${parts.occupancy.headline}.`);
  if (parts.waves > 0) {
    sentences.push(
      `${parts.waves} planting wave${parts.waves === 1 ? "" : "s"} on record` +
        (parts.unscheduled > 0
          ? `, ${parts.unscheduled} without a cycle time so no harvest is projected for them.`
          : ".")
    );
  }
  return sentences.join(" ");
}
