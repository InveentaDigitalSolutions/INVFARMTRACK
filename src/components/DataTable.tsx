import { useState, useMemo } from "react";
import { Search, Plus, SlidersHorizontal, Trash2, Pencil, X } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  searchable?: boolean;
  filterable?: boolean;
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
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;

  // Build unique values for each filterable column
  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    for (const col of columns) {
      if (col.filterable === false) continue;
      const values = new Set<string>();
      for (const row of data) {
        const val = row[col.key];
        if (val != null && String(val).trim()) values.add(String(val));
      }
      if (values.size > 1 && values.size <= 50) {
        opts[col.key] = Array.from(values).sort();
      }
    }
    return opts;
  }, [data, columns]);

  const filtered = useMemo(() => {
    let result = data;

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          if (col.searchable === false) return false;
          const val = row[col.key];
          if (val == null) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    // Apply column filters
    for (const [key, filterVal] of Object.entries(columnFilters)) {
      if (!filterVal) continue;
      // Dropdown filters use exact match, text filters use contains
      if (filterOptions[key]) {
        result = result.filter((row) => String(row[key] ?? "") === filterVal);
      } else {
        const q = filterVal.toLowerCase();
        result = result.filter((row) => String(row[key] ?? "").toLowerCase().includes(q));
      }
    }

    return result;
  }, [data, search, columns, columnFilters]);

  const clearFilters = () => {
    setColumnFilters({});
    setShowFilters(false);
  };

  return (
    <div className="card-surface bg-white rounded-xl border border-sand-200/80 overflow-hidden shadow-sm">
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
              showFilters || activeFilterCount > 0
                ? "border-lime-400 text-lime-600 bg-lime-50/50"
                : "border-sand-200 text-navy-400 hover:text-navy-600 hover:bg-sand-50"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[9px] font-bold bg-lime-400 text-navy-900 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {(search || activeFilterCount > 0) && (
            <span className="text-[11px] text-navy-400">
              {filtered.length} of {data.length}
            </span>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
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
      {filtered.length > 0 || showFilters ? (
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
              {/* Filter row */}
              {showFilters && (
                <tr className="border-b border-sand-100 bg-sand-50/30">
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-2">
                      {filterOptions[col.key] ? (
                        <select
                          value={columnFilters[col.key] || ""}
                          onChange={(e) =>
                            setColumnFilters((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1.5 text-[11px] rounded-md border border-sand-200 bg-white
                                     text-navy-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-lime-400/30
                                     focus:border-lime-400 appearance-none transition-all"
                        >
                          <option value="">All</option>
                          {filterOptions[col.key].map((val) => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={columnFilters[col.key] || ""}
                          onChange={(e) =>
                            setColumnFilters((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          placeholder="Filter..."
                          className="w-full px-2 py-1.5 text-[11px] rounded-md border border-sand-200 bg-white
                                     text-navy-700 placeholder:text-navy-300
                                     focus:outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400 transition-all"
                        />
                      )}
                    </th>
                  ))}
                  {(onEdit || onDelete) && <th className="px-4 py-2" />}
                </tr>
              )}
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
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-navy-300">
              <p className="text-[13px]">No results match the active filters</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-[13px] text-lime-600 font-semibold hover:text-lime-700 cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
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
