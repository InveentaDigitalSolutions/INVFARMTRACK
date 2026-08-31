/**
 * Where a failed write goes so somebody sees it.
 *
 * Every save ran inside an un-awaited async block with no catch, so a rejected
 * write became an unhandled promise rejection: the row appeared on screen
 * because React state had taken it, the request failed, and the record was
 * gone the next time the screen loaded. Nothing anywhere said so.
 *
 * This is a plain subscription rather than context so the store layer — which
 * knows nothing about React — can report into it.
 */

export interface WriteError {
  id: number;
  table: string;
  /**
   * "read" included on purpose: a read that fails leaves a screen looking like
   * the nursery has no records, which is the one failure a person cannot tell
   * from the truth. It used to go to the console and nowhere else.
   */
  action: "create" | "update" | "delete" | "read";
  message: string;
}

type Listener = (errors: WriteError[]) => void;

let errors: WriteError[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l([...errors]));

/** Pull the useful sentence out of whatever the SDK threw. */
export function describeError(err: unknown): string {
  if (typeof err === "string") return err;
  const e = err as { message?: string; error?: { message?: string }; body?: unknown };
  const raw = e?.error?.message ?? e?.message ?? (typeof e?.body === "string" ? e.body : "");
  const text = String(raw || "The write was rejected and gave no reason.");
  // Dataverse wraps the real cause several layers deep; the tail is the part
  // that says which column it objected to.
  const inner = /InnerException\s*:\s*([\s\S]+)$/.exec(text);
  return (inner ? inner[1] : text).replace(/\s+/g, " ").slice(0, 300);
}

export function reportWriteError(table: string, action: WriteError["action"], err: unknown): void {
  const message = describeError(err);
  console.error(`[data] ${action} on "${table}" failed: ${message}`, err);
  errors = [...errors, { id: nextId++, table, action, message }].slice(-5);
  emit();
}

export function dismissWriteError(id: number): void {
  errors = errors.filter((e) => e.id !== id);
  emit();
}

export function subscribeWriteErrors(listener: Listener): () => void {
  listeners.add(listener);
  listener([...errors]);
  return () => listeners.delete(listener);
}
