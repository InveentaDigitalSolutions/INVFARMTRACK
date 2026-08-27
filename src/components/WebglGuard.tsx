import { Component, useMemo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * A 3D view that fails silently is worse than one that refuses to start: a
 * blank canvas looks identical to "no data". This reports the actual reason.
 */

export interface WebglReport {
  ok: boolean;
  reason?: string;
  renderer?: string;
}

export function probeWebgl(): WebglReport {
  if (typeof window === "undefined") return { ok: false, reason: "No window" };
  if (!("WebGLRenderingContext" in window)) {
    return { ok: false, reason: "This browser has no WebGL support." };
  }
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) {
      return {
        ok: false,
        reason:
          "WebGL is blocked or unavailable here. In the Power Apps player this usually means hardware acceleration is off, or the host frame does not permit it.",
      };
    }
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug
      ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
      : "unknown renderer";
    return { ok: true, renderer };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "WebGL probe failed" };
  }
}

export function useWebgl(): WebglReport {
  return useMemo(() => probeWebgl(), []);
}

export function WebglUnavailable({ report }: { report: WebglReport }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
      <AlertTriangle className="w-6 h-6 text-amber-500" />
      <p className="text-[13px] font-semibold text-navy-800">3D view unavailable</p>
      <p className="text-[12px] text-navy-500 max-w-md">{report.reason}</p>
      <p className="text-[11px] text-navy-400">
        The Shadehouse Layout tab shows the same beds in 2D and works everywhere.
      </p>
    </div>
  );
}

/** Catches a throw from inside the Canvas so it cannot blank the whole page. */
export class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[3d] scene failed to render", error);
  }

  render() {
    if (this.state.error) {
      return (
        <WebglUnavailable
          report={{ ok: false, reason: `The 3D scene failed to start: ${this.state.error.message}` }}
        />
      );
    }
    return this.props.children;
  }
}
