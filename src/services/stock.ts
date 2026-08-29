/**
 * What is on hand, worked out from what moved.
 *
 * Stock is the sum of its movements rather than a number anyone edits. A
 * stored total drifts the first time someone corrects it without recording
 * why, and nothing afterwards can reconstruct what happened — which is the
 * whole reason a store keeps a book rather than a note on the shelf.
 *
 * Quantity is always positive and the movement type carries the direction, so
 * a figure can never contradict its own label. "Issued −50" and "Issued 50"
 * both being possible is how stock ledgers go wrong.
 */

export type MovementType =
  | "Received" | "Issued" | "Returned"
  | "Written off" | "Adjustment up" | "Adjustment down";

export interface Movement {
  id?: string;
  /** Either a material or an input — a sack of NPK is stock too. */
  material?: string;
  input?: string;
  date?: string;
  type?: string;
  quantity?: number;
  unitCost?: number;
}

export interface StockItem {
  /** Material or input name, as the movement records it. */
  item: string;
  onHand: number;
  received: number;
  issued: number;
  /** Most recent movement, so a stale figure can be spotted. */
  lastMoved?: string;
  /** What the remaining stock cost, at the latest price paid. */
  value?: number;
}

/** Which way each type moves stock. Unknown types are ignored, not guessed. */
export function direction(type: string | undefined): 1 | -1 | 0 {
  switch (type) {
    case "Received":
    case "Returned":
    case "Adjustment up":
      return 1;
    case "Issued":
    case "Written off":
    case "Adjustment down":
      return -1;
    default:
      return 0;
  }
}

const nameOf = (m: Movement) => String(m.material ?? m.input ?? "");

/** On-hand per item, from every movement recorded against it. */
export function stockLevels(movements: Movement[]): StockItem[] {
  const byItem = new Map<string, StockItem & { lastCost?: number }>();

  for (const m of movements) {
    const item = nameOf(m);
    if (!item) continue;
    const dir = direction(m.type);
    if (dir === 0) continue;

    const qty = Math.abs(Number(m.quantity) || 0);
    const row = byItem.get(item) ?? { item, onHand: 0, received: 0, issued: 0 };

    row.onHand += dir * qty;
    if (dir > 0) row.received += qty;
    else row.issued += qty;

    const when = String(m.date ?? "").slice(0, 10);
    if (when && (!row.lastMoved || when > row.lastMoved)) row.lastMoved = when;
    // The latest price paid is what values what is left; an issue carries no
    // price of its own.
    if (dir > 0 && m.unitCost) row.lastCost = m.unitCost;

    byItem.set(item, row);
  }

  return [...byItem.values()]
    .map(({ lastCost, ...row }) => ({
      ...row,
      value: lastCost ? Math.round(row.onHand * lastCost * 100) / 100 : undefined,
    }))
    .sort((a, b) => a.item.localeCompare(b.item));
}

export interface LowStock {
  item: string;
  onHand: number;
  reorderLevel: number;
  short: number;
}

/**
 * What has fallen to or below its reorder level.
 *
 * An item with no reorder level is never flagged — not everything is
 * reordered on a threshold, and inventing one would cry wolf.
 */
export function lowStock(
  levels: StockItem[],
  reorderLevels: Map<string, number | undefined>
): LowStock[] {
  const out: LowStock[] = [];
  for (const level of levels) {
    const threshold = reorderLevels.get(level.item);
    if (threshold === undefined || threshold === null || threshold <= 0) continue;
    if (level.onHand > threshold) continue;
    out.push({
      item: level.item,
      onHand: level.onHand,
      reorderLevel: threshold,
      short: Math.round((threshold - level.onHand) * 100) / 100,
    });
  }
  return out.sort((a, b) => b.short - a.short);
}

/** A movement reading as a sentence, for the name column. */
export function describe(m: Movement): string {
  const item = nameOf(m);
  const qty = Math.abs(Number(m.quantity) || 0);
  return [item, m.type?.toLowerCase(), qty].filter(Boolean).join(" · ");
}
