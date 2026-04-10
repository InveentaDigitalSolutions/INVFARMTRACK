import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Plus, SlidersHorizontal, Pencil, Trash2 } from "lucide-react";

interface GridField {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
  primary?: boolean;
  secondary?: boolean;
}

interface DataGridProps {
  fields: GridField[];
  data: Record<string, unknown>[];
  onAdd?: () => void;
  onEdit?: (row: Record<string, unknown>, index: number) => void;
  onDelete?: (row: Record<string, unknown>, index: number) => void;
  addLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export default function DataGrid({
  fields,
  data,
  onAdd,
  onEdit,
  onDelete,
  addLabel = "Add New",
  searchPlaceholder = "Search...",
  emptyMessage = "No records yet",
}: DataGridProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      fields.some((f) => {
        const val = row[f.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, fields]);

  const primaryField = fields.find((f) => f.primary) || fields[0];
  const secondaryField = fields.find((f) => f.secondary) || fields[1];
  const detailFields = fields.filter((f) => !f.primary && !f.secondary);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-sand-200 bg-sand-50
                         placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400
                         text-navy-800 transition-all"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {search && (
            <span className="text-[11px] text-navy-400">{filtered.length} of {data.length}</span>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-navy-900
                         bg-lime-400 rounded-lg hover:bg-lime-300 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-sand-200/80 p-4 hover:shadow-md hover:shadow-navy-900/5
                         transition-shadow cursor-pointer group"
              onClick={() => onEdit?.(row, i)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[13px] font-semibold text-navy-900">
                    {primaryField.render ? primaryField.render(row) : String(row[primaryField.key] ?? "")}
                  </p>
                  {secondaryField && (
                    <p className="text-[11px] text-navy-400 mt-0.5">
                      {secondaryField.render ? secondaryField.render(row) : String(row[secondaryField.key] ?? "")}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(row, i); }}
                      className="p-1 rounded-md text-navy-400 hover:text-navy-700 hover:bg-sand-100 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(row, i); }}
                      className="p-1 rounded-md text-navy-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {detailFields.slice(0, 4).map((f) => (
                  <div key={f.key} className="text-[11px]">
                    <span className="text-navy-400">{f.label}: </span>
                    <span className="text-navy-700">
                      {f.render ? f.render(row) : String(row[f.key] ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-navy-300 bg-white rounded-xl border border-sand-200/80">
          <p className="text-[13px]">{search ? `No results for "${search}"` : emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
