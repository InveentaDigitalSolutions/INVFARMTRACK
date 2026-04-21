/**
 * Invoice Number Service — manages CAI-based invoice number allocation.
 *
 * Uses the active fiscal authorization (CAI) to generate sequential invoice numbers,
 * persists used numbers to localStorage to prevent duplicates across sessions.
 */

const STORAGE_KEY = "dni_usedInvoiceNumbers";
const CAI_STORAGE_KEY = "dni_fiscalAuth";

export interface FiscalAuth {
  id: string;
  name: string;
  cai: string;
  rtn: string;
  rangeStart: string;
  rangeEnd: string;
  expiry: string;
  total: number;
  next: number;
  requestDate: string;
  active: boolean;
}

function getUsedNumbers(): Set<number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore */ }
  return new Set();
}

function saveUsedNumbers(used: Set<number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...used]));
  } catch { /* ignore */ }
}

function getActiveFiscalAuth(): FiscalAuth | null {
  try {
    const stored = localStorage.getItem(CAI_STORAGE_KEY);
    if (stored) {
      const records: FiscalAuth[] = JSON.parse(stored);
      return records.find((r) => r.active) || null;
    }
  } catch { /* ignore */ }
  return null;
}

function updateFiscalAuthNext(id: string, next: number): void {
  try {
    const stored = localStorage.getItem(CAI_STORAGE_KEY);
    if (stored) {
      const records: FiscalAuth[] = JSON.parse(stored);
      const updated = records.map((r) => r.id === id ? { ...r, next } : r);
      localStorage.setItem(CAI_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch { /* ignore */ }
}

function parseRangeNumber(range: string): number {
  const parts = range.split("-");
  return parseInt(parts[parts.length - 1], 10);
}

function formatInvoiceNumber(prefix: string, num: number): string {
  // Format: 000-001-01-00001462
  return `${prefix}${String(num).padStart(8, "0")}`;
}

export function getNextInvoiceNumber(): {
  invoiceNumber: string;
  cai: string;
  rangeDisplay: string;
  remaining: number;
  expiry: string;
} | null {
  const auth = getActiveFiscalAuth();
  if (!auth) return null;

  const rangeEndNum = parseRangeNumber(auth.rangeEnd);
  const used = getUsedNumbers();

  // Find next available number starting from auth.next
  let nextNum = auth.next;
  while (used.has(nextNum) && nextNum <= rangeEndNum) {
    nextNum++;
  }

  if (nextNum > rangeEndNum) return null; // Range exhausted

  // Extract prefix from rangeStart (everything before the last 8 digits)
  const prefix = auth.rangeStart.slice(0, auth.rangeStart.length - 8);
  const invoiceNumber = formatInvoiceNumber(prefix, nextNum);
  const remaining = rangeEndNum - nextNum;

  return {
    invoiceNumber,
    cai: auth.cai,
    rangeDisplay: `${auth.rangeStart} hasta ${auth.rangeEnd}`,
    remaining,
    expiry: auth.expiry,
  };
}

export function allocateInvoiceNumber(invoiceNumber: string): boolean {
  const auth = getActiveFiscalAuth();
  if (!auth) return false;

  const num = parseRangeNumber(invoiceNumber);
  const used = getUsedNumbers();

  if (used.has(num)) return false; // Already used

  used.add(num);
  saveUsedNumbers(used);

  // Advance the "next" pointer past used numbers
  const rangeEndNum = parseRangeNumber(auth.rangeEnd);
  let newNext = num + 1;
  while (used.has(newNext) && newNext <= rangeEndNum) {
    newNext++;
  }
  updateFiscalAuthNext(auth.id, newNext);

  return true;
}

export function getUsedInvoiceNumbers(): string[] {
  const auth = getActiveFiscalAuth();
  if (!auth) return [];

  const prefix = auth.rangeStart.slice(0, auth.rangeStart.length - 8);
  const used = getUsedNumbers();
  return [...used].sort((a, b) => a - b).map((n) => formatInvoiceNumber(prefix, n));
}

export function getRemainingCount(): number {
  const auth = getActiveFiscalAuth();
  if (!auth) return 0;

  const rangeEndNum = parseRangeNumber(auth.rangeEnd);
  const used = getUsedNumbers();
  const rangeStartNum = parseRangeNumber(auth.rangeStart);

  let remaining = 0;
  for (let i = rangeStartNum; i <= rangeEndNum; i++) {
    if (!used.has(i)) remaining++;
  }
  return remaining;
}
