import { useState, useCallback } from "react";

type FormValues = Record<string, unknown>;

export function useFormModal(defaults: FormValues) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(defaults);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const openCreate = useCallback(() => {
    setValues({ ...defaults });
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
