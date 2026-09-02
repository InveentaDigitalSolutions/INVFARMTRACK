/**
 * Everything the app can be asked to do, as a short list of named actions.
 *
 * Taken from God's Eye View, where every capability is a named tool — fly to a
 * place, show a layer, what is near here — and the voice agent is only one
 * caller of that list. The list is the useful part: once it exists, a command
 * palette, keyboard shortcuts, an alert that jumps you to a bed, and voice
 * later are all the same mechanism rather than four separate builds.
 *
 * An action is deliberately small: an id, words a person would use, and
 * something to run. Anything that needs the scene or the records closes over
 * them where it is registered.
 */

export interface AppAction {
  /** Stable, dotted, and never shown: "bed.focus", "layer.toggle". */
  id: string;
  /** What it does, in the nursery's words. */
  title: string;
  /** Where it applies — "3D view", "Production" — for grouping. */
  group: string;
  /** Extra words somebody might type looking for it. */
  keywords?: string;
  /** Shown on the right: a shortcut, a count, the current state. */
  hint?: string;
  run: () => void;
}

const norm = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Actions matching what has been typed, best first.
 *
 * Subsequence matching rather than substring: "e105" should find "Go to bed
 * E1-05" without anybody typing the hyphen, and "wat" should find watering.
 * An empty query returns everything, in the order it was registered, because
 * that order is the app's own idea of importance.
 */
export function matchActions(actions: AppAction[], query: string): AppAction[] {
  const q = norm(query).replace(/\s+/g, "");
  if (!q) return actions;
  // "E1-05" and "e105" are the same search. The haystack has its punctuation
  // stripped, so the query must lose its own or it can never match.
  const qFlat = q.replace(/[^a-z0-9]/g, "");

  const scored: { action: AppAction; score: number }[] = [];
  for (const action of actions) {
    const title = norm(action.title);
    const haystack = norm(`${action.title} ${action.group} ${action.keywords ?? ""}`);
    const flat = haystack.replace(/[^a-z0-9]/g, "");

    let score: number | null = null;
    if (title.startsWith(q)) score = 0;
    else if (flat.includes(qFlat)) score = 1;
    else if (isSubsequence(qFlat, flat)) score = 2;
    if (score === null) continue;
    scored.push({ action, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.action.title.localeCompare(b.action.title))
    .map((s) => s.action);
}

/** Every character of `needle`, in order, somewhere in `hay`. */
function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return needle.length === 0;
}
