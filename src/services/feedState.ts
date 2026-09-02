/**
 * How healthy a feed is, in more than two states.
 *
 * The app has been saying "LIVE" or "SIMULATED" and nothing in between, so a
 * three-day-old exchange rate looked exactly like this morning's, and a
 * weather service that had stopped answering looked like a quiet afternoon.
 *
 * The ladder is borrowed from God's Eye View's watchdog, which earns its keep
 * for the same reason: a feed does not fail cleanly. It goes quiet, retries,
 * comes back, or was never configured in the first place — and each of those
 * asks something different of the person reading the screen.
 *
 * Two rules from there are worth keeping:
 *
 * - **Not configured is not broken.** A feed with no key or no rows yet reads
 *   as "off", so nobody goes looking for a fault that isn't there.
 * - **A dead feed does not flip back to hopeful.** Once something is `down`,
 *   only a real success moves it, not the next attempt starting.
 */

export type FeedStatus =
  /** Nothing to report yet — the feed has not been asked. */
  | "idle"
  /** Configured but nothing has arrived; the first read is in flight. */
  | "connecting"
  /** Fresh data, within the window this feed promises. */
  | "live"
  /** Data, but older than it should be. Still usable; say how old. */
  | "stale"
  /** It failed, and it has worked before, so it will be tried again. */
  | "retrying"
  /** It failed and has never worked. Somebody has to look. */
  | "down"
  /** Deliberately not set up. Not a fault. */
  | "off";

export interface FeedInput {
  /** False when the feed is not set up at all: no key, no table, demo mode. */
  configured?: boolean;
  /** A read is in flight right now. */
  loading?: boolean;
  /** The last read failed, with this message. */
  error?: string | null;
  /** When the newest data this feed holds was published (ISO date or ms). */
  lastAt?: string | number | null;
  /** Older than this many hours and the feed is stale rather than live. */
  staleAfterHours: number;
  /** For tests; defaults to now. */
  now?: number;
}

export interface FeedState {
  status: FeedStatus;
  /** How old the newest data is, in hours; null when there is none. */
  ageHours: number | null;
  /** One short line for a person: "live", "3 days old", the error. */
  detail: string;
  /** True when the figures may be shown without a caveat. */
  trustworthy: boolean;
}

const HOUR = 3_600_000;

const asMillis = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value);
  // A bare date is a day, not an instant: read it as noon UTC so a feed
  // published today is never "12 hours old" before lunch.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00Z` : text;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
};

/** Whole days, for the human-readable line. */
const spell = (hours: number): string => {
  if (hours < 1) return "minutes old";
  if (hours < 24) return `${Math.round(hours)} h old`;
  const days = Math.round(hours / 24);
  return days === 1 ? "a day old" : `${days} days old`;
};

export function feedState(input: FeedInput): FeedState {
  const now = input.now ?? Date.now();
  const at = asMillis(input.lastAt);
  const ageHours = at === null ? null : Math.max(0, (now - at) / HOUR);

  if (input.configured === false) {
    return { status: "off", ageHours, detail: "not set up", trustworthy: false };
  }

  // A failure with data behind it is a retry; a failure with nothing behind it
  // is a feed that has never worked, and those need different attention.
  if (input.error) {
    const known = ageHours !== null;
    return {
      status: known ? "retrying" : "down",
      ageHours,
      detail: known ? `${input.error} · showing data ${spell(ageHours!)}` : input.error,
      trustworthy: false,
    };
  }

  if (ageHours === null) {
    return input.loading
      ? { status: "connecting", ageHours: null, detail: "reading…", trustworthy: false }
      : { status: "idle", ageHours: null, detail: "nothing recorded yet", trustworthy: false };
  }

  if (ageHours <= input.staleAfterHours) {
    return { status: "live", ageHours, detail: ageHours < 1 ? "live" : spell(ageHours), trustworthy: true };
  }

  return { status: "stale", ageHours, detail: spell(ageHours), trustworthy: false };
}

/** Colour and wording per state, so every feed reads the same way anywhere. */
export const FEED_LOOK: Record<FeedStatus, { label: string; dot: string; text: string }> = {
  live: { label: "Live", dot: "#3fb950", text: "text-emerald-600" },
  stale: { label: "Stale", dot: "#e3a008", text: "text-amber-600" },
  connecting: { label: "Connecting", dot: "#6b8cae", text: "text-navy-400" },
  retrying: { label: "Retrying", dot: "#e3a008", text: "text-amber-600" },
  down: { label: "Down", dot: "#e5484d", text: "text-red-600" },
  idle: { label: "No data", dot: "#9aa5b1", text: "text-navy-400" },
  off: { label: "Off", dot: "#9aa5b1", text: "text-navy-400" },
};
