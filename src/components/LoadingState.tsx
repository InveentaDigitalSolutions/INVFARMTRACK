import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingSpinner({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-6 h-6 text-lime-500" />
      </motion.div>
      <p className="text-[13px] text-navy-400 mt-3">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-sand-200/80">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 mb-4">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-[14px] font-semibold text-navy-900 mb-1">Something went wrong</p>
      <p className="text-[13px] text-navy-400 mb-4 max-w-sm text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-navy-700
                     bg-sand-100 rounded-lg hover:bg-sand-200 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  message = "No records yet",
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-sand-200/80">
      {icon && <div className="mb-4">{icon}</div>}
      <p className="text-[13px] text-navy-400 mb-3">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-[13px] font-semibold text-lime-600 hover:text-lime-700 cursor-pointer"
        >
          + {actionLabel}
        </button>
      )}
    </div>
  );
}
