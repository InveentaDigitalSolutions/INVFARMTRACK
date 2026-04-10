import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  variant = "danger",
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-sand-200/80 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                  variant === "danger" ? "bg-red-50" : "bg-amber-50"
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    variant === "danger" ? "text-red-500" : "text-amber-500"
                  }`} />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-navy-900">{title}</h3>
                  <p className="text-[13px] text-navy-500 mt-1 leading-relaxed">{message}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-[13px] font-medium text-navy-500 hover:text-navy-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onConfirm(); onClose(); }}
                  className={`px-4 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors shadow-sm ${
                    variant === "danger"
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-amber-500 text-white hover:bg-amber-600"
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
