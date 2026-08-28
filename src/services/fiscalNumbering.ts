/**
 * Allocation of invoice numbers against a CAI authorization.
 *
 * In Honduras an invoice number is not the nursery's to choose. The SAR issues
 * a CAI with a fixed correlative range and an expiry, and every number issued
 * has to be accounted for — used in order, never reused, never past the range.
 *
 * This previously kept the used numbers in localStorage, which meant the
 * record of which fiscal numbers had been issued lived in one browser and
 * vanished with a cleared cache. Worse, once fiscal authorizations moved to
 * Dataverse nothing wrote the localStorage key any more, so the service found
 * no authorization and quietly stopped issuing numbers at all.
 *
 * Every allocation is now a row in bv_CAINumber: which number, when, and
 * against which invoice. That is the audit trail the correlative needs, and it
 * survives a browser.
 */

import type { Identified } from "./DataService";

export interface FiscalAuthRow extends Identified {
  name?: string;
  cai?: string;
  rtn?: string;
  rangeStart?: string;
  rangeEnd?: string;
  expiry?: string;
  total?: number;
  next?: number;
  active?: boolean;
}

export interface CaiNumberRow extends Identified {
  name?: string;
  sequence?: number;
  used?: boolean;
  usedDate?: string;
  fiscalAuth?: string;
  invoice?: string;
}

export interface NextNumber {
  /** The full printed number, e.g. "000-001-01-00001462". */
  invoiceNumber: string;
  /** The correlative on its own, which is what gets recorded. */
  sequence: number;
  cai: string;
  rangeDisplay: string;
  /** How many numbers are left in the authorization. */
  remaining: number;
  expiry: string;
  /** Set when the authorization cannot currently be used. */
  problem?: string;
}

/** The trailing correlative of "000-001-01-00001462". */
export function parseSequence(printed: string): number {
  const digits = printed.trim().split("-").pop() ?? "";
  return Number.parseInt(digits, 10);
}

/** Everything before the correlative, kept so the number prints identically. */
function prefixOf(rangeStart: string): string {
  const tail = rangeStart.trim().split("-").pop() ?? "";
  return rangeStart.slice(0, rangeStart.length - tail.length);
}

function format(rangeStart: string, sequence: number): string {
  const width = (rangeStart.trim().split("-").pop() ?? "").length;
  return `${prefixOf(rangeStart)}${String(sequence).padStart(width, "0")}`;
}

/** The authorization to invoice against: active, in date, and not exhausted. */
export function activeAuthorization(rows: FiscalAuthRow[]): FiscalAuthRow | undefined {
  return rows.find((r) => r.active && r.rangeStart && r.rangeEnd);
}

/**
 * The number the next invoice should carry, or an explanation of why there
 * isn't one. Returning the reason matters: an exhausted or expired CAI is
 * something the nursery has to act on, not a blank field.
 */
export function nextNumber(
  auth: FiscalAuthRow | undefined,
  issued: CaiNumberRow[],
  today = new Date()
): NextNumber | null {
  if (!auth?.rangeStart || !auth.rangeEnd) return null;

  const first = parseSequence(auth.rangeStart);
  const last = parseSequence(auth.rangeEnd);
  // Numbers already issued under this authorization. A row that names no
  // authorization is counted too — it still consumed a number, and treating
  // it as free would risk issuing the same one twice.
  const taken = new Set(
    issued
      .filter((r) => !r.fiscalAuth || r.fiscalAuth === auth.name)
      .map((r) => r.sequence)
      .filter((n): n is number => typeof n === "number")
  );

  let sequence = Math.max(auth.next ?? first, first);
  while (taken.has(sequence) && sequence <= last) sequence++;

  const base: Omit<NextNumber, "problem"> = {
    invoiceNumber: format(auth.rangeStart, Math.min(sequence, last)),
    sequence,
    cai: auth.cai ?? "",
    rangeDisplay: `${auth.rangeStart} hasta ${auth.rangeEnd}`,
    remaining: Math.max(0, last - sequence + 1),
    expiry: auth.expiry ?? "",
  };

  if (sequence > last) {
    return { ...base, remaining: 0, problem: "This CAI range is used up. Request a new authorization before invoicing." };
  }
  if (auth.expiry && new Date(auth.expiry) < today) {
    return { ...base, problem: `This CAI expired on ${auth.expiry}. Invoices issued against it are not valid.` };
  }
  return base;
}
