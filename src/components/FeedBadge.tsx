/**
 * One feed's health, said the same way everywhere it appears.
 *
 * Small on purpose: a dot, a word, and how old the data is. The reader should
 * be able to tell live from stale without stopping to think, and a feed that
 * was never set up should not look like one that has broken.
 */

import type { Feed } from "../hooks/useFeeds";
import { FEED_LOOK } from "../services/feedState";

export default function FeedBadge({
  feed,
  showLabel = false,
  className = "",
}: {
  feed: Feed;
  /** Include the feed's name — for lists, where several sit together. */
  showLabel?: boolean;
  className?: string;
}) {
  const look = FEED_LOOK[feed.status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] ${className}`}
      title={`${feed.label} · ${feed.source} — ${feed.detail}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${feed.status === "live" ? "animate-pulse" : ""}`}
        style={{ backgroundColor: look.dot }}
      />
      {showLabel && <span className="font-semibold text-navy-700 dark:text-d-primary">{feed.label}</span>}
      <span className={`font-semibold uppercase tracking-[0.08em] ${look.text}`}>{look.label}</span>
      {feed.detail.toLowerCase() !== look.label.toLowerCase() && (
        <span className="text-navy-400 dark:text-d-secondary normal-case tracking-normal">{feed.detail}</span>
      )}
    </span>
  );
}
