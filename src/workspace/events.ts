import type { VisualizationId } from "@/types";

/** Custom event used by views to request another registered view. */
export const OPEN_VIEW_EVENT = "dataspace:open-view";

export function requestOpenView(type: VisualizationId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<VisualizationId>(OPEN_VIEW_EVENT, { detail: type }));
}
