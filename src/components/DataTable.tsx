import { useState, useMemo } from "react";
import { Search, Plus, SlidersHorizontal, Trash2, Pencil } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  searchable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onAdd?: () => void;
  onEdit?: (row: T, index: number) => void;
  onDelete?: (row: T, index: number) => void;
  addLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onAdd,
  onEdit,
  onDelete,
  addLabel = "Add New",
  searchPlaceholder = "Search...",
  emptyMessage = "No records yet",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        if (col.searchable === false) return false;
        const val = row[col.key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  return (
    <div className="bg-white rounded-xl border border-sand-200/80 overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-sand-100">
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
          <button className="p-2 rounded-lg border border-sand-200 text-navy-400 hover:text-navy-600 hover:bg-sand-50 cursor-pointer transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {search && (
            <span className="text-[11px] text-navy-400">
              {filtered.length} of {data.length}
            </span>
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

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-sand-100 bg-sand-50/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold text-navy-400 uppercase tracking-[0.08em]"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.label}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-navy-400 uppercase tracking-[0.08em] w-20">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100/80">
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={`transition-colors ${
                    onEdit ? "hover:bg-lime-50/30 cursor-pointer" : "hover:bg-sand-50/50"
                  }`}
                  onClick={() => onEdit?.(row, i)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-navy-800">
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(row, i); }}
                            className="p-1.5 rounded-md text-navy-400 hover:text-navy-700 hover:bg-sand-100 cursor-pointer transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(row, i); }}
                            className="p-1.5 rounded-md text-navy-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-navy-300">
          <p className="text-[13px]">
            {search ? `No results for "${search}"` : emptyMessage}
          </p>
          {!search && onAdd && (
            <button
              onClick={onAdd}
              className="mt-3 text-[13px] text-lime-600 font-semibold hover:text-lime-700 cursor-pointer"
            >
              + {addLabel}
            </button>
          )}
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-[13px] text-lime-600 font-semibold hover:text-lime-700 cursor-pointer"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
