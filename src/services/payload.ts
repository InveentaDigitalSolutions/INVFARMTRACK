/**
 * Turning an app record into a Dataverse payload.
 *
 * Pulled out of DataverseStore so it can be tested without the Power Apps SDK,
 * because this is where saving was quietly failing: an untouched form field
 * arrives as "", Dataverse rejects that on a date, number, choice or boolean
 * with a 400, and the 400 fails the whole record — so one blank date threw
 * away everything else the user had typed.
 */

import type { ColumnKind } from "./columnKinds.generated";

export type Row = Record<string, unknown>;

export interface PayloadRules {
  /** app field -> Dataverse column */
  toColumn: Record<string, string>;
  /** Dataverse column -> what it holds */
  kinds: Record<string, ColumnKind>;
  /** The table's key column, which is never written. */
  primaryKey: string;
  /** Choice label -> option value, per column. */
  choices?: Record<string, Record<string, number>>;
  /** Called when a choice label is not one Dataverse knows. */
  onUnknownChoice?: (column: string, value: string, allowed: string[]) => void;
}

/**
 * What a value becomes on the wire, or `undefined` to leave the column out.
 *
 * `null` is a real answer: it clears a text column, which is what an emptied
 * text box means. For every other kind an empty box means "not set", and the
 * column must not appear in the payload at all.
 */
export function coerce(kind: ColumnKind, value: unknown): unknown | undefined {
  if (value === "" || value === null || value === undefined) {
    return kind === "text" ? null : undefined;
  }

  if (typeof value === "string") {
    // A number typed into a form arrives as a string; Dataverse rejects "12"
    // on an integer column.
    if (kind === "number") {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    if (kind === "boolean") return value === "true" || value === "Yes";
    // A date input gives "2026-08-26"; anything longer is trimmed to the day
    // so a DateOnly column is never handed a timestamp.
    if (kind === "date") return value.slice(0, 10);
  }

  if (typeof value === "number" && kind === "text") return String(value);
  return value;
}

/** The record as Dataverse should receive it. Lookups are bound separately. */
export function buildPayload(record: Row, rules: PayloadRules): Row {
  const out: Row = {};

  for (const [field, value] of Object.entries(record)) {
    if (field === "id" || field === rules.primaryKey) continue;
    // Autonumber and other server-computed columns must not be written.
    if (value === undefined) continue;

    const column = rules.toColumn[field] ?? field;
    // Only send columns Dataverse knows about; an unmapped app-only field
    // would be rejected for the whole request.
    if (!column.startsWith("bv_")) continue;
    // Lookups are bound by navigation property — see bindLookups.
    if (column.startsWith("_") && column.endsWith("_value")) continue;

    const kind = rules.kinds[column] ?? "text";

    // Choices hold integers. The label is translated first, so an empty label
    // is still recognised as "not set" rather than looked up and dropped.
    if (kind === "choice" && typeof value === "string" && value !== "") {
      const options = rules.choices?.[column];
      if (options) {
        const mapped = options[value];
        if (mapped === undefined) {
          rules.onUnknownChoice?.(column, value, Object.keys(options));
          continue;
        }
        out[column] = mapped;
        continue;
      }
    }

    const wire = coerce(kind, value);
    if (wire === undefined) continue;
    out[column] = wire;
  }

  return out;
}
