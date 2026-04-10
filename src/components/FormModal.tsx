import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";

// Field definition types
interface BaseField {
  key: string;
  label: string;
  required?: boolean;
  span?: 1 | 2 | 3 | 4;
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

interface SelectField extends BaseField {
  type: "select";
  options: { value: string; label: string }[];
}

interface ToggleField extends BaseField {
  type: "toggle";
  options: { value: string; label: string }[];
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
  options: { value: string; label: string }[];
}

export type FieldDef =
  | TextField
  | NumberInputField
  | SelectField
  | ToggleField
  | TextareaField
  | BooleanField
  | MultiSelectField;

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
  onChange: (key: string, value: unknown) => void
) {
  const v = value ?? "";

  switch (field.type) {
    case "text":
    case "email":
    case "date":
    case "datetime-local":
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
            <option value="">Select...</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300 pointer-events-none" />
        </div>
      );

    case "toggle":
      return (
        <div className="flex gap-1.5">
          {field.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(field.key, o.value)}
              className={`flex-1 py-2.5 text-[13px] font-medium rounded-lg border transition-colors cursor-pointer ${
                String(v) === o.value
                  ? "bg-navy-700 text-white border-navy-700"
                  : "bg-white text-navy-600 border-sand-200 hover:border-lime-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      );

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

    case "multiselect": {
      const selected = Array.isArray(v) ? (v as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((o) => {
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
                    ? "bg-navy-700 text-white border-navy-700"
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
                {groups.map((group, gi) => (
                  <div key={gi}>
                    <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-[0.1em] mb-3">
                      {group.title}
                    </p>
                    <div className={`grid ${colsClass[group.columns ?? 2]} gap-4`}>
                      {group.fields.map((field) => (
                        <div key={field.key} className={spanClass[field.span ?? 1]}>
                          <label className="block text-[12px] font-medium text-navy-600 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          {renderField(field, values[field.key], onChange)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
                  className="px-5 py-2.5 text-[13px] font-semibold text-navy-900 bg-lime-400 rounded-lg
                             hover:bg-lime-300 cursor-pointer transition-colors shadow-sm"
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
