import { useState, useCallback } from "react";

type FormValues = Record<string, unknown>;

/**
 * Build an empty record with the same shape as a sample row.
 *
 * Pages pass an existing record purely to describe the field set. Using that
 * record as the create-form's initial values pre-fills every new record with a
 * copy of row one — including its ID, which the user can no longer correct now
 * that IDs are system-generated. Keys are kept, scalars are cleared.
 *
 * Booleans are carried over: they are flags like "active", where the sample's
 * value is a reasonable default rather than someone else's data.
 *
 * There may be no sample at all. Pages used to pass `initRows[0]` from a demo
 * array; those arrays are empty now, so that argument is `undefined` and this
 * threw inside a useState initialiser — which unmounted the whole app and left
 * a blank screen on every module with a form. The field set comes from the
 * form's own `groups` and FormModal already treats a missing key as empty, so
 * no sample is a perfectly good answer.
 */
function blankFrom(sample: FormValues | undefined): FormValues {
  const blank: FormValues = {};
  if (!sample || typeof sample !== "object") return blank;
  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === "boolean") blank[key] = value;
    else if (Array.isArray(value)) blank[key] = [];
    else if (value && typeof value === "object") blank[key] = {};
    else blank[key] = "";
  }
  return blank;
}

export function useFormModal(defaults?: FormValues) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(() => blankFrom(defaults));
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const openCreate = useCallback(() => {
    setValues(blankFrom(defaults));
    setEditIndex(null);
    setOpen(true);
  }, [defaults]);

  /**
   * Open a blank form with what the context already knows filled in — pressing
   * "Add Airport" on the airports tab should not then ask which kind it is.
   *
   * Kept separate from openCreate because that one is passed straight to
   * onClick in a dozen places, and a MouseEvent is not a set of values.
   */
  const openCreateWith = useCallback((preset: FormValues) => {
    setValues({ ...blankFrom(defaults), ...preset });
    setEditIndex(null);
    setOpen(true);
  }, [defaults]);

  const openEdit = useCallback((row: FormValues, index: number) => {
    setValues({ ...row });
    setEditIndex(index);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEditIndex(null);
  }, []);

  const onChange = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    open,
    values,
    editIndex,
    isEdit: editIndex !== null,
    openCreate,
    openCreateWith,
    openEdit,
    close,
    onChange,
  };
}

export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<{ row: unknown; index: number } | null>(null);

  const requestDelete = useCallback((row: unknown, index: number) => {
    setPending({ row, index });
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPending(null);
  }, []);

  return { open, pending, requestDelete, close };
}

/**
 * The rows that survive a confirmed delete.
 *
 * By identity, not by position. A position is captured when the delete button
 * is pressed and used when the dialog is confirmed a second or two later, and
 * in between the table can reload: `useRecords` re-reads after any write, and
 * Dataverse does not promise the same order twice. The row at index 7 is then
 * a different row, and a basket in C1 deletes one in E3.
 *
 * Falling back to the index keeps LocalStore rows working, where a record that
 * has never been saved has no id yet.
 */
export function withoutPending<T>(
  data: T[],
  pending: { row: unknown; index: number } | null
): T[] {
  if (!pending) return data;
  const id = (pending.row as { id?: unknown } | null)?.id;
  if (id !== undefined && id !== null && id !== "") {
    const next = data.filter((row) => (row as { id?: unknown }).id !== id);
    // A delete that removes nothing looks exactly like a button that does not
    // work, which is how the last one went unnoticed for a week.
    if (next.length === data.length) {
      console.error("[data] nothing to delete: no row with id", id);
    }
    return next;
  }
  return data.filter((_, i) => i !== pending.index);
}

/**
 * The rows after an edit is saved, with the edited one replaced.
 *
 * Same hazard as deleting, same answer: the record being edited is found by
 * its id, and only falls back to the position when it has none.
 */
export function withEdited<T>(
  data: T[],
  form: { editIndex: number | null; values: Record<string, unknown> },
  values: Record<string, unknown>
): T[] {
  const id = form.values?.id;
  if (id !== undefined && id !== null && id !== "") {
    const at = data.findIndex((row) => (row as { id?: unknown }).id === id);
    if (at >= 0) {
      const next = [...data];
      next[at] = values as T;
      return next;
    }
  }
  if (form.editIndex === null) return [...data, values as T];
  const next = [...data];
  next[form.editIndex] = values as T;
  return next;
}
