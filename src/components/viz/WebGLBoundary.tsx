import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
}

/** Catches WebGL context/runtime failures so the 2D view stays usable. */
export class WebGLBoundary extends Component<{ children: ReactNode; onUse2D: () => void }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the failure visible in the console without exposing it in the UI.
    console.error("3D rendering failed", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="surface-grid h-20 w-20 rounded-md border border-dashed border-border-strong" aria-hidden />
          <div className="space-y-1">
            <p className="text-[13px] font-medium text-ink">The 3D view could not start</p>
            <p className="max-w-xs text-[12px] leading-relaxed text-muted">
              This device or browser may not support WebGL. The linked 2D view uses the same data, filters, and
              selection.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={this.props.onUse2D}>
            Switch to 2D view
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Cheap capability probe; avoids mounting R3F where WebGL is unavailable. */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    return Boolean(context);
  } catch {
    return false;
  }
}
