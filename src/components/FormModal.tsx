import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Lock } from "lucide-react";
import BedSelector from "./BedSelector";
import PlantLines, { type PlantLine } from "./PlantLines";
import { useLookupOptionsFor } from "../hooks/useLookupOptions";

// Field definition types
interface BaseField {
  /**
   * Show this field only when the form is in a particular state — the basket
   * capacity is meaningless for a variety grown only in the ground. On the base
   * so every kind of field can use it; putting it on one variant left the union
   * unable to see it at all.
   */
  showWhen?: (values: Record<string, unknown>) => boolean;
  /**
   * Rendered under the control. For a figure whose meaning is not obvious from
   * the number — a density, a rate — this is where it gets spelled out.
   */
  below?: (values: Record<string, unknown>) => React.ReactNode;
  key: string;
  label: string;
  required?: boolean;
  span?: 1 | 2 | 3 | 4;
  /**
   * System-owned value the user must not set — record IDs in particular.
   * Dataverse generates these via autonumber, so the field is shown for
   * context but never accepts input.
   */
  readOnly?: boolean;
}

interface TextField extends BaseField {
  type: "text" | "email" | "date" | "datetime-local";
  placeholder?: string;
}

interface NumberInputField extends BaseField {
  type: "number";
  min?: number;
  max?: number;
  suffix?: string;
  placeholder?: string;
}

/**
 * A bounded number, set by dragging.
 *
 * Only for figures with real ends: weeks in a growth cycle, a bundle size, a
 * percentage. A slider on an unbounded quantity — cuttings packed, plants per
 * bed — is worse than a text box, because it makes an exact number hard to hit
 * and hides the range it is really drawn from. The typed box stays alongside,
 * so the slider is the quick way in and never the only way.
 */
/**
 * A control that writes more than one key — a scale with two ends, a pair that
 * only makes sense together. `render` gets the whole form and sets what it
 * needs, rather than the single value a normal field owns.
 */
interface CustomField extends BaseField {
  type: "custom";
  render: (
    values: Record<string, unknown>,
    onChange: (key: string, value: unknown) => void
  ) => React.ReactNode;
}

interface RangeField extends BaseField {
  type: "range";
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  /** Labels under the ends, e.g. "faster" / "slower". */
  hint?: string;
}

interface SelectField extends BaseField {
  type: "select";
  /** Fallback choices, used until the live ones load and in demo mode. */
  options: { value: string; label: string }[];
  /**
   * App table key whose rows are the real choices ("plants", "customers").
   * Set this for any field backed by a Dataverse lookup: a hand-written list
   * drifts from the table, and picking a name that no longer exists saves the
   * record with the lookup empty.
   */
  optionsFrom?: string;
  /**
   * Choices worked out from what the form already holds — the rows still free
   * in the chosen field, the levels a ground bed may sit at. Returning []
   * disables the control, which is the honest state when nothing has been
   * picked yet for it to depend on.
   */
  optionsWhen?: (values: Record<string, unknown>) => { value: string; label: string }[];
  /** Shown in place of "Select..." when there is nothing to offer. */
  emptyHint?: string;
}

interface PlantLinesField extends BaseField {
  type: "plantlines";
  /** App table key whose rows are the varieties on offer. */
  optionsFrom?: string;
  options?: { value: string; label: string }[];
}

interface ToggleField extends BaseField {
  type: "toggle";
  options: { value: string; label: string }[];
  /**
   * Let several be chosen at once. The value stored is the chosen labels joined
   * by `join`, so the combination is itself a valid choice label in Dataverse —
   * "Ground", "Basket", or "Ground & Basket" — and needs no mapping either way.
   */
  multi?: boolean;
  join?: string;
}

interface TextareaField extends BaseField {
  type: "textarea";
  placeholder?: string;
  rows?: number;
}

interface BooleanField extends BaseField {
  type: "boolean";
}

interface MultiSelectField extends BaseField {
  type: "multiselect";
  /** Fallback choices, used until the live ones load and in demo mode. */
  options: { value: string; label: string }[];
  /**
   * App table key whose rows are the real choices ("plants", "customers").
   * Set this for any field backed by a Dataverse lookup: a hand-written list
   * drifts from the table, and picking a name that no longer exists saves the
   * record with the lookup empty.
   */
  optionsFrom?: string;
}

interface BedSelectorField extends BaseField {
  type: "bedselector";
  multiSelect?: boolean;
}

export type FieldDef =
  | TextField
  | NumberInputField
  | SelectField
  | ToggleField
  | TextareaField
  | BooleanField
  | MultiSelectField
  | PlantLinesField
  | RangeField
  | CustomField
  | BedSelectorField;

interface FieldGroupDef {
  title: string;
  fields: FieldDef[];
  columns?: 2 | 3 | 4;
}

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
  title: string;
  subtitle?: string;
  groups: FieldGroupDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  submitLabel?: string;
  isEdit?: boolean;
}

const colsClass = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };
const spanClass = { 1: "col-span-1", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4" };

function renderField(
  field: FieldDef,
  value: unknown,
  onChange: (key: string, value: unknown) => void,
  liveOptions: Record<string, { value: string; label: string }[]> = {},
  values: Record<string, unknown> = {}
) {
  const v = value ?? "";

  /**
   * The choices to show: the live rows of the table this field points at,
   * falling back to the declared list before they load or in demo mode.
   */
  const optionsFor = (f: {
    options: { value: string; label: string }[];
    optionsFrom?: string;
    optionsWhen?: (values: Record<string, unknown>) => { value: string; label: string }[];
  }) => {
    // Computed choices win: they depend on the rest of the form, so a stale
    // list would offer a row that is already taken.
    if (f.optionsWhen) return f.optionsWhen(values);
    const live = f.optionsFrom ? liveOptions[f.optionsFrom] : undefined;
    return live && live.length > 0 ? live : f.options;
  };

  switch (field.type) {
    case "text":
    case "email":
    case "date":
    case "datetime-local":
      if (field.readOnly) {
        return (
          <div
            className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-sand-100
                       text-navy-500 flex items-center gap-2 select-none"
            title="Generated automatically — not editable"
          >
            <Lock className="w-3.5 h-3.5 text-navy-300 shrink-0" />
            <span className={String(v) ? "" : "text-navy-300 italic"}>
              {String(v) || field.placeholder || "Generated on save"}
            </span>
          </div>
        );
      }
      return (
        <input
          type={field.type}
          value={String(v)}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-white
                     text-navy-900 placeholder:text-navy-300
                     focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400 transition-all"
        />
      );

    case "custom":
      return field.render(values, onChange);

    case "range": {
      const n = v === "" || v === null || v === undefined ? null : Number(v);
      const shown = n === null || !Number.isFinite(n) ? field.min : n;
      return (
        <div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              value={shown}
              onChange={(e) => onChange(field.key, Number(e.target.value))}
              aria-label={field.label}
              className="flex-1 accent-lime-400 cursor-pointer"
            />
            {/* The typed box is not decoration: it is how an exact value gets
                set, and how "not filled in yet" stays distinguishable from the
                slider's resting position at the minimum. */}
            <input
              type="number"
              value={n === null || !Number.isFinite(n) ? "" : String(n)}
              onChange={(e) => onChange(field.key, e.target.value === "" ? "" : Number(e.target.value))}
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              placeholder="—"
              aria-label={`${field.label}, exact value`}
              className="w-[4.5rem] px-2 py-1.5 text-[13px] text-center rounded-lg border border-sand-200
                         bg-white text-navy-900 tabular-nums placeholder:text-navy-300
                         focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                         [&::-webkit-inner-spin-button]:appearance-none transition-all"
            />
            {field.suffix && (
              <span className="text-[11px] text-navy-400 shrink-0">{field.suffix}</span>
            )}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-navy-300 tabular-nums">
            <span>{field.min}</span>
            {field.hint && <span className="text-navy-400">{field.hint}</span>}
            <span>{field.max}</span>
          </div>
        </div>
      );
    }

    case "number":
      return (
        <div className="relative">
          <input
            type="number"
            value={v === "" || v === 0 ? "" : String(v)}
            onChange={(e) => onChange(field.key, e.target.value === "" ? "" : Number(e.target.value))}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-white
                       text-navy-900 placeholder:text-navy-300
                       focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400
                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
          />
          {field.suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-navy-400">
              {field.suffix}
            </span>
          )}
        </div>
      );

    case "select":
      return (
        <div className="relative">
          <select
            value={String(v)}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-white
                       text-navy-900 appearance-none cursor-pointer
                       focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400 transition-all"
          >
            {/* An empty list is not "Select..." — there is nothing to select.
                Saying so is the difference between a control that looks broken
                and one that is waiting on something. */}
            <option value="">
              {optionsFor(field).length === 0
                ? (field.emptyHint ?? "Nothing to choose yet")
                : "Select..."}
            </option>
            {optionsFor(field).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300 pointer-events-none" />
        </div>
      );

    case "toggle": {
      const join = field.join ?? " & ";
      const chosen = field.multi
        ? String(v ?? "").split(join).map((x) => x.trim()).filter(Boolean)
        : [];
      return (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={field.label}>
          {optionsFor(field).map((o) => {
            const selected = field.multi ? chosen.includes(o.value) : String(v) === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={selected}
                // Tapping the chosen option clears it. A dropdown always had a
                // "Select..." to go back to; without this, an optional field
                // could be set once and never unset again.
                onClick={() => {
                  if (!field.multi) {
                    onChange(field.key, selected && !field.required ? "" : o.value);
                    return;
                  }
                  // Keep the option order the form declares, so "Ground & Basket"
                  // never comes out as "Basket & Ground" and fails to match the
                  // choice label.
                  const order = optionsFor(field).map((x) => x.value);
                  const next = selected
                    ? chosen.filter((x) => x !== o.value)
                    : [...chosen, o.value];
                  onChange(field.key, order.filter((x) => next.includes(x)).join(join));
                }}
                className={`flex-1 min-w-[5.5rem] py-2.5 px-2 text-[13px] font-medium rounded-lg border
                  transition-colors cursor-pointer focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-lime-400/40 ${
                  selected
                    ? "chip-selected"
                    : "bg-white text-navy-600 border-sand-200 hover:border-lime-300"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "textarea":
      return (
        <textarea
          value={String(v)}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-sand-200 bg-white
                     text-navy-900 placeholder:text-navy-300 resize-none
                     focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400 transition-all"
        />
      );

    case "bedselector":
      return (
        <BedSelector
          selected={Array.isArray(v) ? (v as string[]) : v ? [String(v)] : []}
          onChange={(beds) => onChange(field.key, beds)}
          multiSelect={field.multiSelect !== false}
          label=""
        />
      );

    case "plantlines":
      return (
        <PlantLines
          value={Array.isArray(v) ? (v as PlantLine[]) : []}
          options={optionsFor(field as never)}
          onChange={(lines) => onChange(field.key, lines)}
        />
      );

    case "multiselect": {
      const selected = Array.isArray(v) ? (v as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {optionsFor(field).map((o) => {
            const isSelected = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? selected.filter((s) => s !== o.value)
                    : [...selected, o.value];
                  onChange(field.key, next);
                }}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? "chip-selected"
                    : "bg-white text-navy-600 border-sand-200 hover:border-lime-300"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "boolean":
      return (
        <button
          type="button"
          onClick={() => onChange(field.key, !v)}
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
            v ? "bg-lime-400" : "bg-sand-300"
          }`}
        >
          <motion.div
            animate={{ x: v ? 20 : 2 }}
            transition={{ duration: 0.15 }}
            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
          />
        </button>
      );
  }
}

export default function FormModal({
  open,
  onClose,
  onSubmit,
  title,
  subtitle,
  groups,
  values,
  onChange,
  submitLabel = "Save",
  isEdit = false,
}: FormModalProps) {
  // Every table this form draws choices from. The field list is static, so
  // this set is stable and safe to drive a hook with.
  const lookupTables = useMemo(
    () =>
      [
        ...new Set(
          groups.flatMap((g) =>
            g.fields.map((f) => ("optionsFrom" in f ? f.optionsFrom : undefined))
          )
        ),
      ].filter((t): t is string => Boolean(t)),
    [groups]
  );
  const liveOptions = useLookupOptionsFor(lookupTables);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4 overflow-y-auto"
          >
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-sand-200/80 mb-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-100">
                <div>
                  <h2 className="text-base font-bold text-navy-900">{title}</h2>
                  {subtitle && (
                    <p className="text-[12px] text-navy-400 mt-0.5">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-sand-100 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-6">
                {groups.map((group, gi) => {
                  // A field can rule itself out of the form — the basket
                  // capacity means nothing for a variety grown in the ground.
                  // A group with nothing left to show is dropped along with its
                  // heading, rather than leaving a title over empty space.
                  const shown = group.fields.filter(
                    (f) => !f.showWhen || f.showWhen(values)
                  );
                  if (shown.length === 0) return null;
                  return (
                  <div key={gi}>
                    <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-[0.1em] mb-3">
                      {group.title}
                    </p>
                    <div className={`grid ${colsClass[group.columns ?? 2]} gap-4`}>
                      {shown.map((field) => (
                        <div key={field.key} className={spanClass[field.span ?? 1]}>
                          <label className="block text-[12px] font-medium text-navy-600 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          {renderField(field, values[field.key], onChange, liveOptions, values)}
                          {field.below?.(values)}
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-sand-100 bg-sand-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-[13px] font-medium text-navy-500 hover:text-navy-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-[13px] font-semibold text-white bg-navy-800 rounded-lg
                             hover:bg-navy-700 cursor-pointer transition-colors shadow-sm
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50"
                >
                  {isEdit ? "Update" : submitLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
