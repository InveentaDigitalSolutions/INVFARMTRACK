/**
 * A shipment as the screen sees it, from the two tables it really lives in.
 *
 * The header is one row in bv_shipments. Every box is its own row in
 * bv_packings, carrying the bed it was cut from — which is what makes a claim
 * traceable back to a specific bed rather than to a field.
 *
 * The page used to hold a shipment as a single object with `boxes` and
 * `orderLines` arrays inside it. Neither array is a column, so a shipment
 * created on that screen was written with its boxes silently dropped, and the
 * client-minted `SHP-2026-001` identifier meant the header did not save
 * either.
 */

export interface ShipmentHeader {
  id?: string;
  code?: string;
  customer?: string;
  order?: string;
  invoice?: string;
  date?: string;
  etd?: string;
  eta?: string;
  carrier?: string;
  awb?: string;
  status?: string;
  notes?: string;
}

export interface PackedBox {
  id: string;
  code?: string;
  barcode?: string;
  boxNumber?: number;
  plant?: string;
  bed?: string;
  size?: string;
  packingType?: string;
  bundleSize?: number;
  quantity?: number;
  grossWeight?: number;
  netWeight?: number;
  packedBy?: string;
  workerId?: string;
  shipment?: string;
}

export interface Shipment extends ShipmentHeader {
  id: string;
  boxes: PackedBox[];
  /** Cuttings packed across every box. */
  packed: number;
  grossWeight: number;
  netWeight: number;
  /** Boxes nobody has been assigned to yet. */
  unassigned: number;
}

/** The statuses a shipment moves through, in order. */
export const SHIPMENT_FLOW = ["Draft", "Packing", "Packed", "Shipped", "Delivered"] as const;

/** The next status, or undefined at the end of the flow or once cancelled. */
export function nextStatus(status: string | undefined): string | undefined {
  if (status === "Cancelled") return undefined;
  const i = SHIPMENT_FLOW.indexOf((status ?? "Draft") as (typeof SHIPMENT_FLOW)[number]);
  if (i === -1) return SHIPMENT_FLOW[1];
  return SHIPMENT_FLOW[i + 1];
}

/**
 * Join the headers to their boxes.
 *
 * The link is the shipment's code, because that is the column a lookup on
 * bv_packings resolves to. A box whose shipment is blank belongs to no
 * shipment and is left out rather than attached to the first one.
 */
export function assembleShipments(
  headers: ShipmentHeader[],
  boxes: PackedBox[]
): Shipment[] {
  const byShipment = new Map<string, PackedBox[]>();
  for (const b of boxes) {
    const key = String(b.shipment ?? "");
    if (!key) continue;
    const list = byShipment.get(key) ?? [];
    list.push(b);
    byShipment.set(key, list);
  }

  return headers
    .map((h) => {
      const own = (byShipment.get(String(h.code ?? "")) ?? [])
        .sort((a, b) => (a.boxNumber ?? 0) - (b.boxNumber ?? 0));
      return {
        ...h,
        id: String(h.id ?? ""),
        boxes: own,
        packed: own.reduce((s, b) => s + (Number(b.quantity) || 0), 0),
        grossWeight: Math.round(own.reduce((s, b) => s + (Number(b.grossWeight) || 0), 0) * 100) / 100,
        netWeight: Math.round(own.reduce((s, b) => s + (Number(b.netWeight) || 0), 0) * 100) / 100,
        unassigned: own.filter((b) => !b.packedBy).length,
      };
    })
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
}

/** The next free box number on a shipment, so two batches never collide. */
export function nextBoxNumber(boxes: PackedBox[]): number {
  return boxes.reduce((max, b) => Math.max(max, Number(b.boxNumber) || 0), 0) + 1;
}

/** Filter for the list: free text across the fields someone would search. */
export function matchesShipment(s: Shipment, query: string, status: string): boolean {
  if (status && String(s.status ?? "Draft") !== status) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [s.code, s.customer, s.carrier, s.awb, s.invoice, s.order, s.status]
    .some((v) => String(v ?? "").toLowerCase().includes(q));
}
