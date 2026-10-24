import { useMemo } from "react";
import type { VisualizationProps } from "@/viz/registry";
import type { VisualizationConfig } from "@/types";
import { RENDER_CAP } from "@/data/limits";
import { useScatterEncoding } from "@/viz/encoding";
import { useDataStore } from "@/store/useDataStore";
import { Scatter3D } from "@/components/viz/Scatter3D";
import { WebGLBoundary, supportsWebGL } from "@/components/viz/WebGLBoundary";
import { requestOpenView } from "@/workspace/events";
import { FilteredEmpty, ViewNotice } from "./ViewShared";

export function Scatter3DView({ view, instance }: VisualizationProps) {
  const config = useDataStore((state) => state.config);
  const theme = useDataStore((state) => state.theme);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const clearFilters = useDataStore((state) => state.clearFilters);
  const webgl = useMemo(() => supportsWebGL(), []);

  const axes = useMemo(
    () => ({
      x: instance.fields.x ?? null,
      y: instance.fields.y ?? null,
      z: instance.fields.z ?? null,
    }),
    [instance.fields.x, instance.fields.y, instance.fields.z],
  );

  const panelConfig = useMemo<VisualizationConfig | null>(
    () => (config ? { ...config, axes } : null),
    [config, axes],
  );

  const encoding = useScatterEncoding(view.filteredRows, view.dataset, panelConfig, {
    dimensions: 3,
    cap: RENDER_CAP,
    selectedId: selectedRowId,
    theme,
  });

  if (view.filteredCount === 0) return <FilteredEmpty onClear={clearFilters} />;
  if (!encoding) return null;
  if (!webgl) {
    return (
      <ViewNotice
        title="WebGL is not available"
        detail="The 3D view needs WebGL. Open the 2D scatter, table, or another 2D view for the same filtered records."
      />
    );
  }
  if (encoding.points.length === 0) {
    return (
      <ViewNotice
        title="No plottable rows"
        detail={`Every filtered record is missing a value on the mapped axes (${encoding.skipped.toLocaleString()} skipped). Choose different columns in Configure.`}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <WebGLBoundary onUse2D={() => requestOpenView("scatter2d")}>
          <Scatter3D encoding={encoding} axes={axes} />
        </WebGLBoundary>
      </div>
      {encoding.skipped > 0 ? (
        <p className="border-t border-border px-3 py-1 text-[10px] text-faint">
          {`${encoding.skipped.toLocaleString()} ${view.activeFilters > 0 ? "filtered " : ""}row${encoding.skipped === 1 ? "" : "s"} skipped by missing axis values.`}
        </p>
      ) : null}
    </div>
  );
}
