import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, Check, AlertCircle, X, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import Badge from "./Badge";

interface ParsedRow {
  variety: string;
  size: string;
  requestType: string;
  description: string;
  weeks: Record<number, number>; // weekNumber → quantity
}

interface ImportResult {
  rows: ParsedRow[];
  weekNumbers: number[];
  totalRows: number;
  totalQuantity: number;
  fileName: string;
}

interface ExcelImportProps {
  onImport: (data: ImportResult) => void;
  onClose: () => void;
  customer?: string;
  year?: number;
}

// Try to detect variety from description
function detectVariety(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("hawaiian")) return "Pothos / Hawaiian";
  if (d.includes("jade")) return "Pothos / Jade";
  if (d.includes("marble")) return "Pothos / Marble Queen";
  if (d.includes("n'joy") || d.includes("njoy")) return "Pothos / N'Joy";
  if (d.includes("neon")) return "Pothos / Neon";
  if (d.includes("golden glen")) return "Pothos / Golden Glen";
  if (d.includes("high color")) return "Pothos / High Color";
  if (d.includes("sansevieria")) return "Sansevieria / Sansevieria";
  if (d.includes("epipremnum")) return desc;
  return desc;
}

// Detect request type
function detectRequestType(val: string): string {
  const v = val.toLowerCase().trim();
  if (v.includes("additional request")) return "Additional Request";
  if (v.includes("additional order")) return "Additional Order";
  if (v.includes("current order")) return "Current Order";
  return val;
}

export default function ExcelImport({ onImport, onClose, customer = "The Plant Company, LLC", year = 2026 }: ExcelImportProps) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: "A", defval: "" });

        if (json.length < 2) {
          setError("File appears empty or has no data rows");
          return;
        }

        // Find header row — look for a row containing "Description" or week numbers
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(json.length, 10); i++) {
          const row = json[i];
          const vals = Object.values(row).map(String).join(" ").toLowerCase();
          if (vals.includes("description") || vals.includes("request")) {
            headerRowIdx = i;
            break;
          }
        }

        const headerRow = json[headerRowIdx];
        const colKeys = Object.keys(headerRow);

        // Find key columns
        let requestCol = "";
        let sizeCol = "";
        let descCol = "";
        const weekCols: { col: string; week: number }[] = [];

        colKeys.forEach((col) => {
          const val = String(headerRow[col]).toLowerCase().trim();
          if (val.includes("request") && !requestCol) requestCol = col;
          else if ((val.includes("size") || val.includes("vlam") || val.includes("pot")) && !sizeCol) sizeCol = col;
          else if (val.includes("description") && !descCol) descCol = col;
          else {
            // Check if it's a week number
            const num = parseInt(String(headerRow[col]));
            if (!isNaN(num) && num >= 1 && num <= 52) {
              weekCols.push({ col, week: num });
            }
          }
        });

        // If we couldn't auto-detect, try positional
        if (!descCol) {
          // Description is usually column F (index 5)
          descCol = colKeys[5] || colKeys[4] || "";
        }
        if (!requestCol) requestCol = colKeys[1] || "";
        if (!sizeCol) sizeCol = colKeys[3] || "";

        // If no week columns found, try columns G onward as week numbers
        if (weekCols.length === 0) {
          for (let i = 6; i < colKeys.length; i++) {
            const val = headerRow[colKeys[i]];
            const num = parseInt(String(val));
            if (!isNaN(num) && num >= 1 && num <= 52) {
              weekCols.push({ col: colKeys[i], week: num });
            }
          }
        }

        // Parse data rows
        const rows: ParsedRow[] = [];
        for (let i = headerRowIdx + 1; i < json.length; i++) {
          const row = json[i];
          const desc = String(row[descCol] || "").trim();
          const reqType = String(row[requestCol] || "").trim();

          // Skip empty, total, or estimate rows
          if (!desc || desc.toLowerCase().includes("total") || desc.toLowerCase().includes("estimate")) continue;
          if (!reqType) continue;

          // Check if any week has a value
          const weeks: Record<number, number> = {};
          let hasData = false;
          weekCols.forEach(({ col, week }) => {
            const val = parseInt(String(row[col]));
            if (!isNaN(val) && val > 0) {
              weeks[week] = val;
              hasData = true;
            }
          });

          if (!hasData) continue;

          rows.push({
            variety: detectVariety(desc),
            size: String(row[sizeCol] || "").trim(),
            requestType: detectRequestType(reqType),
            description: desc,
            weeks,
          });
        }

        const weekNumbers = [...new Set(weekCols.map((w) => w.week))].sort((a, b) => a - b);
        const totalQuantity = rows.reduce((s, r) => s + Object.values(r.weeks).reduce((ss, v) => ss + v, 0), 0);

        setResult({
          rows,
          weekNumbers,
          totalRows: rows.length,
          totalQuantity,
          fileName: file.name,
        });
        setStep("preview");
        setError(null);
      } catch (err) {
        setError(`Failed to parse Excel: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Please upload an Excel file (.xlsx, .xls) or CSV");
      return;
    }
    parseExcel(file);
  }, [parseExcel]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleConfirm = () => {
    if (result) {
      onImport(result);
      setStep("done");
      setTimeout(onClose, 1500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[6vh] px-4 overflow-y-auto"
    >
      <div className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-sand-200/80 mb-8 z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-900">Import Demand Forecast</h2>
              <p className="text-[12px] text-navy-400">{customer} · {year}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-sand-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed transition-colors ${
                dragging
                  ? "border-lime-400 bg-lime-50/50"
                  : "border-sand-300 hover:border-lime-300 hover:bg-sand-50"
              }`}
            >
              <Upload className={`w-10 h-10 mb-4 ${dragging ? "text-lime-500" : "text-navy-300"}`} />
              <p className="text-[14px] font-semibold text-navy-800 mb-1">
                Drop your Excel file here
              </p>
              <p className="text-[12px] text-navy-400 mb-4">
                or click to browse (.xlsx, .xls, .csv)
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 text-[13px] font-semibold text-navy-900 bg-lime-400 rounded-lg hover:bg-lime-300 cursor-pointer"
              >
                Browse Files
              </button>
              {error && (
                <div className="flex items-center gap-2 mt-4 text-[12px] text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && result && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-sand-50 rounded-lg p-3">
                  <p className="text-[10px] text-navy-400 uppercase">File</p>
                  <p className="text-[13px] font-semibold text-navy-900 truncate">{result.fileName}</p>
                </div>
                <div className="bg-sand-50 rounded-lg p-3">
                  <p className="text-[10px] text-navy-400 uppercase">Order Lines</p>
                  <p className="text-[13px] font-semibold text-navy-900">{result.totalRows}</p>
                </div>
                <div className="bg-sand-50 rounded-lg p-3">
                  <p className="text-[10px] text-navy-400 uppercase">Weeks</p>
                  <p className="text-[13px] font-semibold text-navy-900">{result.weekNumbers.length} (wk {result.weekNumbers[0]}–{result.weekNumbers[result.weekNumbers.length - 1]})</p>
                </div>
                <div className="bg-sand-50 rounded-lg p-3">
                  <p className="text-[10px] text-navy-400 uppercase">Total Quantity</p>
                  <p className="text-[13px] font-semibold text-navy-900">{result.totalQuantity.toLocaleString()}</p>
                </div>
              </div>

              {/* Data preview table */}
              <div className="overflow-x-auto rounded-lg border border-sand-200 mb-4">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-sand-50 border-b border-sand-100">
                      <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase sticky left-0 bg-sand-50 z-10">Variety</th>
                      <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase">Size</th>
                      <th className="px-3 py-2 text-left text-[9px] font-semibold text-navy-400 uppercase">Type</th>
                      {result.weekNumbers.map((wk) => (
                        <th key={wk} className="px-2 py-2 text-center text-[9px] font-semibold text-navy-400 uppercase min-w-[50px]">
                          Wk {wk}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100/80">
                    {result.rows.slice(0, 30).map((row, i) => (
                      <tr key={i} className="hover:bg-sand-50/50">
                        <td className="px-3 py-1.5 font-medium text-navy-800 sticky left-0 bg-white z-10">{row.variety}</td>
                        <td className="px-3 py-1.5 text-navy-600">{row.size}</td>
                        <td className="px-3 py-1.5">
                          <Badge variant={row.requestType === "Current Order" ? "green" : row.requestType === "Additional Order" ? "blue" : "amber"}>
                            {row.requestType}
                          </Badge>
                        </td>
                        {result.weekNumbers.map((wk) => (
                          <td key={wk} className={`px-2 py-1.5 text-center font-mono ${
                            row.weeks[wk] ? "text-navy-800 font-medium" : "text-navy-200"
                          }`}>
                            {row.weeks[wk] ? row.weeks[wk].toLocaleString() : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows.length > 30 && (
                  <div className="px-3 py-2 text-[11px] text-navy-400 bg-sand-50 border-t border-sand-100">
                    Showing 30 of {result.rows.length} rows
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-16">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4"
              >
                <Check className="w-8 h-8 text-green-600" />
              </motion.div>
              <p className="text-[16px] font-bold text-navy-900">Import Complete</p>
              <p className="text-[13px] text-navy-400 mt-1">
                {result?.totalRows} order lines imported across {result?.weekNumbers.length} weeks
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "preview" && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-sand-100 bg-sand-50/50 rounded-b-2xl">
            <button
              onClick={() => { setStep("upload"); setResult(null); }}
              className="text-[13px] text-navy-500 hover:text-navy-700 cursor-pointer"
            >
              Upload a different file
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2.5 text-[13px] text-navy-500 hover:text-navy-700 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-navy-900 bg-lime-400 rounded-lg hover:bg-lime-300 cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Import {result?.totalRows} Lines
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
