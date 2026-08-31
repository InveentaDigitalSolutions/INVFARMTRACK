/**
 * Says out loud when a record did not save.
 *
 * The screen shows a new row the moment it is typed, because that is what
 * makes a form feel responsive. If the write then fails, the row is a lie
 * until the next reload quietly removes it. This is the correction.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { subscribeWriteErrors, dismissWriteError, type WriteError } from "../services/writeErrors";

export default function WriteErrorBanner() {
  const [errors, setErrors] = useState<WriteError[]>([]);
  useEffect(() => subscribeWriteErrors(setErrors), []);

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[min(28rem,calc(100vw-2rem))] space-y-2">
      {errors.map((e) => (
        <div
          key={e.id}
          role="alert"
          className="rounded-xl bg-red-50 ring-1 ring-red-200 shadow-lg p-3.5 flex gap-3"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-red-800">
              {/* A failed read needs its own words: "not saved" would be a lie,
                  and the person is looking at an empty screen wondering whether
                  that is the truth. */}
              {e.action === "read"
                ? "Could not load"
                : e.action === "delete"
                  ? "Could not delete"
                  : "Not saved"} — {e.table}
            </p>
            <p className="text-[11px] text-red-700/90 mt-0.5 break-words">{e.message}</p>
          </div>
          <button
            onClick={() => dismissWriteError(e.id)}
            aria-label="Dismiss"
            className="shrink-0 text-red-400 hover:text-red-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
