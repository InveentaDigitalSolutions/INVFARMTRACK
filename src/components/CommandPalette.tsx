/**
 * Type what you want, press enter.
 *
 * The visible half of the action list: every capability the screen registered,
 * searchable by the words a person would use. Opened with ⌘K or Ctrl-K, which
 * is where everybody's fingers already go.
 *
 * Deliberately not a menu. A menu has to be organised, and its shape decides
 * what is easy to reach; a list you type into is flat, so "go to bed C1-04"
 * costs the same as toggling a layer, and adding an action costs nothing.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { matchActions, type AppAction } from "../services/actions";

export default function CommandPalette({
  actions,
  open,
  onClose,
}: {
  actions: AppAction[];
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => matchActions(actions, query).slice(0, 40), [actions, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    // A frame, so the field exists before the focus lands on it.
    const id = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  if (!open) return null;

  const run = (action: AppAction | undefined) => {
    if (!action) return;
    onClose();
    action.run();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-navy-950/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-xl bg-white dark:bg-d-card shadow-2xl ring-1 ring-sand-200 dark:ring-white/10 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-sand-100 dark:border-white/10">
            <Search className="w-4 h-4 text-navy-300 shrink-0" />
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
                if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, shown.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); run(shown[cursor]); }
              }}
              placeholder="Go to a bed, show a layer, find what needs water…"
              aria-label="Command"
              className="flex-1 bg-transparent text-[14px] text-navy-900 dark:text-d-primary
                         placeholder:text-navy-300 focus:outline-none"
            />
            <kbd className="text-[10px] text-navy-300 border border-sand-200 rounded px-1.5 py-0.5">esc</kbd>
          </div>

          <ul className="max-h-[50vh] overflow-y-auto py-1">
            {shown.length === 0 && (
              <li className="px-4 py-6 text-center text-[12px] text-navy-400">
                Nothing matches “{query}”.
              </li>
            )}
            {shown.map((action, i) => (
              <li key={action.id}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => run(action)}
                  className={`w-full flex items-baseline gap-3 px-4 py-2 text-left cursor-pointer ${
                    i === cursor ? "bg-lime-50 dark:bg-white/5" : ""
                  }`}
                >
                  <span className="text-[13px] text-navy-800 dark:text-d-primary truncate">{action.title}</span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.1em] text-navy-300">
                    {action.hint ?? action.group}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
