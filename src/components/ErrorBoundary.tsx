import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon } from "lucide-react";

/**
 * Shows what went wrong instead of a white screen.
 *
 * An exception thrown while rendering unmounts the whole React tree, and the
 * app becomes a blank page with the reason only in the browser console — which
 * nobody has open. That is exactly how a crash on every module went unnoticed:
 * emptying the demo seed arrays left `initRows[0]` undefined, `useFormModal`
 * called Object.entries on it inside a useState initialiser, and every screen
 * with a form took the app down.
 *
 * A boundary cannot fix the fault, but a named error someone can send on is
 * worth more than a white rectangle.
 */

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[app] render failed", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="h-full flex items-start justify-center p-8 overflow-auto">
        <div className="max-w-xl w-full bg-white rounded-xl border border-sand-200/80 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />
            <h2 className="text-[15px] font-semibold text-navy-900">This screen could not load</h2>
          </div>
          <p className="text-[13px] text-navy-600 mb-4">
            Nothing was lost — the data is untouched. Send this message on and try
            another module in the meantime.
          </p>
          <pre className="text-[11px] font-mono bg-sand-100 text-navy-800 rounded-lg p-3
                          whitespace-pre-wrap break-words max-h-56 overflow-auto">
            {error.message || String(error)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-primary mt-4 text-[12px] px-3 py-2 rounded-lg"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
