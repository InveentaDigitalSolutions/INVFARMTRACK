import { useState, useMemo } from "react";
import {
  Search, Plus, SlidersHorizontal, Trash2, Pencil, X,
  ChevronUp, ChevronDown, ChevronsUpDown, Columns3,
} from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  searchable?: boolean;
  filterable?: boolean;
  /** Right-align and use tabular figures so digits line up column-wise. */
  numeric?: boolean;
  /** Tint each cell by magnitude relative to the other visible rows. */
  heatmap?: boolean;
  /** Defaults to true. */
  sortable?: boolean;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;
type Limit = "all" | "top5" | "top10" | "bot5";

/** Pull a comparable number out of "L 27,700", "83%", "1.2M t" etc. */
function toNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onAdd?: () => void;
  /**
   * Both are handed the row's index in `data` — not in what is on screen.
   *
   * Pages act on that index: delete filters it out of the source array, edit
   * writes back over it. The table hands out the position within the rows it
   * is showing, which is the same number only when nothing is searched,
   * filtered, sorted or limited. Search "E1-05-01", press delete, and the
   * first bed in the table was the one that went — while the row in front of
   * you stayed exactly where it was, which reads as nothing happening.
   */
  onEdit?: (row: T, index: number) => void;
  onDelete?: (row: T, index: number) => void;
  addLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Footer note explaining how to read the table. */
  hint?: string;
  /** Show the ALL / TOP 5 / TOP 10 / BOT 5 shortcut pills. */
  showLimits?: boolean;
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
  hint,
  showLimits = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>(null);
  const [limit, setLimit] = useState<Limit>("all");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const visibleColumns = columns.filter((c) => !hidden.has(c.key));

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key !== key
        ? { key, dir: "desc" }
        : prev.dir === "desc"
          ? { key, dir: "asc" }
          : null
    );
  };

  const toggleColumn = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      // Never let the user hide the last column.
      else if (columns.length - next.size > 1) next.add(key);
      return next;
    });
  };

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

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { key, dir } = sort;
    const factor = dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const na = toNumber(a[key]);
      const nb = toNumber(b[key]);
      // Numbers sort numerically; blanks always sink to the bottom.
      if (na !== null && nb !== null) return (na - nb) * factor;
      if (na !== null) return -1;
      if (nb !== null) return 1;
      return String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * factor;
    });
  }, [filtered, sort]);

  const visible = useMemo(() => {
    if (limit === "all") return sorted;
    if (limit === "bot5") return sorted.slice(-5);
    return sorted.slice(0, limit === "top5" ? 5 : 10);
  }, [sorted, limit]);

  /**
   * Where a visible row sits in the data the page holds.
   *
   * Filtering, sorting and slicing all preserve object identity, so the row
   * on screen is the same object the page passed in and can be found by it.
   */
  const sourceIndex = (row: T) => data.indexOf(row);

  /** Min/max per heatmap column, computed over the rows actually on screen. */
  const heatRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};
    for (const col of columns) {
      if (!col.heatmap) continue;
      const nums = visible.map((r) => toNumber(r[col.key])).filter((n): n is number => n !== null);
      if (nums.length > 1) {
        ranges[col.key] = { min: Math.min(...nums), max: Math.max(...nums) };
      }
    }
    return ranges;
  }, [visible, columns]);

  const heatStyle = (col: Column<T>, row: T) => {
    const range = heatRanges[col.key];
    if (!range) return undefined;
    const n = toNumber(row[col.key]);
    if (n === null) return undefined;
    const span = range.max - range.min;
    const t = span === 0 ? 0 : (n - range.min) / span;
    // Translucent so it sits correctly on both light and dark card surfaces.
    return { backgroundColor: `rgba(163, 184, 53, ${(0.05 + t * 0.3).toFixed(3)})` };
  };

  const hasHeatmap = Object.keys(heatRanges).length > 0;

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
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker((v) => !v)}
              className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
                showColumnPicker || hidden.size > 0
                  ? "border-lime-400 text-lime-600 bg-lime-50/50"
                  : "border-sand-200 text-navy-400 hover:text-navy-600 hover:bg-sand-50"
              }`}
              title="Choose columns"
            >
              <Columns3 className="w-3.5 h-3.5" />
            </button>
            {showColumnPicker && (
              <div className="absolute z-20 mt-1.5 left-0 w-52 p-1.5 rounded-lg border border-sand-200 bg-white shadow-lg">
                <p className="px-2 py-1 text-[10px] font-semibold text-navy-400 uppercase tracking-[0.1em]">
                  Columns
                </p>
                {columns.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-navy-700 rounded-md hover:bg-sand-50 cursor-pointer text-left"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        hidden.has(col.key) ? "border-sand-300" : "border-lime-400 bg-lime-400"
                      }`}
                    >
                      {!hidden.has(col.key) && (
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-none stroke-navy-900" strokeWidth="2">
                          <path d="M1 4l2.5 2.5L9 1" />
                        </svg>
                      )}
                    </span>
                    {col.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(search || activeFilterCount > 0 || limit !== "all") && (
            <span className="text-[11px] text-navy-400 tabular-nums">
              {visible.length} of {data.length}
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
                         btn-primary rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Shortcuts strip */}
      {(showLimits || hasHeatmap) && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-sand-100 bg-sand-50/40">
          {showLimits && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-navy-400 uppercase tracking-[0.1em] mr-0.5">
                Show
              </span>
              {([
                ["all", "All"],
                ["top5", "Top 5"],
                ["top10", "Top 10"],
                ["bot5", "Bottom 5"],
              ] as [Limit, string][]).map(([key, text]) => (
                <button
                  key={key}
                  onClick={() => setLimit(key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                    limit === key
                      ? "chip-selected"
                      : "text-navy-500 hover:bg-sand-100"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          )}

          {hasHeatmap && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px] font-semibold text-navy-400 uppercase tracking-[0.1em]">
                Heatmap
              </span>
              <span
                className="h-2 w-20 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(163,184,53,0.05), rgba(163,184,53,0.35))",
                }}
              />
              <span className="text-[10px] text-navy-400">Low → High</span>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 || showFilters ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-sand-100 bg-sand-50/50">
                {visibleColumns.map((col) => {
                  const canSort = col.sortable !== false;
                  const active = sort?.key === col.key;
                  const Indicator = !active
                    ? ChevronsUpDown
                    : sort.dir === "desc"
                      ? ChevronDown
                      : ChevronUp;
                  return (
                    <th
                      key={col.key}
                      onClick={canSort ? () => toggleSort(col.key) : undefined}
                      className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        col.numeric ? "text-right" : "text-left"
                      } ${active ? "text-navy-700" : "text-navy-400"} ${
                        canSort ? "cursor-pointer select-none hover:text-navy-600 transition-colors" : ""
                      }`}
                      style={col.width ? { width: col.width } : undefined}
                    >
                      <span className={`inline-flex items-center gap-1 ${col.numeric ? "flex-row-reverse" : ""}`}>
                        {col.label}
                        {canSort && (
                          <Indicator
                            className={`w-3 h-3 shrink-0 ${active ? "opacity-100" : "opacity-25"}`}
                          />
                        )}
                      </span>
                    </th>
                  );
                })}
                {(onEdit || onDelete) && (
                  <th className="sticky right-0 z-20 px-4 py-2.5 text-right text-[10px] font-semibold text-navy-400 uppercase tracking-[0.08em] w-20 bg-sand-50 border-l border-sand-200/70">
                    Actions
                  </th>
                )}
              </tr>
              {/* Filter row */}
              {showFilters && (
                <tr className="border-b border-sand-100 bg-sand-50/30">
                  {visibleColumns.map((col) => (
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
                  {(onEdit || onDelete) && (
                    <th className="sticky right-0 z-20 px-4 py-2 bg-sand-50 border-l border-sand-200/70" />
                  )}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-sand-100/80">
              {visible.map((row, i) => (
                <tr
                  key={i}
                  className={`transition-colors ${
                    onEdit ? "hover:bg-lime-50/30 cursor-pointer" : "hover:bg-sand-50/50"
                  }`}
                  onClick={() => { const at = sourceIndex(row); if (at >= 0) onEdit?.(row, at); }}
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      style={heatStyle(col, row)}
                      className={`px-4 py-3 text-navy-800 ${
                        col.numeric ? "text-right tabular-nums font-medium" : ""
                      }`}
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="sticky right-0 z-10 px-4 py-3 text-right bg-white border-l border-sand-200/70">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); const at = sourceIndex(row); if (at >= 0) onEdit(row, at); }}
                            className="p-1.5 rounded-md text-navy-400 hover:text-navy-700 hover:bg-sand-100 cursor-pointer transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); const at = sourceIndex(row); if (at >= 0) onDelete(row, at); }}
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
          {hint && filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-sand-100 bg-sand-50/40">
              <p className="text-[11px] text-navy-400">
                Click a header to sort · {hint}
              </p>
            </div>
          )}
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
