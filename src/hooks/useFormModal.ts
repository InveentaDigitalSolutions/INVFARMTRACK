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
