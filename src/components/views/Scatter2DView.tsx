import { useMemo } from "react";
import type { VisualizationProps } from "@/viz/registry";
import type { VisualizationConfig } from "@/types";
import { RENDER_CAP } from "@/data/limits";
import { useScatterEncoding } from "@/viz/encoding";
import { useDataStore } from "@/store/useDataStore";
import { Scatter2D } from "@/components/viz/Scatter2D";
import { FilteredEmpty, ViewNotice } from "./ViewShared";

const CAP_2D = 4_000;

export function Scatter2DView({ view, instance }: VisualizationProps) {
  const config = useDataStore((state) => state.config);
  const theme = useDataStore((state) => state.theme);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const clearFilters = useDataStore((state) => state.clearFilters);

  const twoD = useMemo(
    () => ({ x: instance.fields.x ?? null, y: instance.fields.y ?? null }),
    [instance.fields.x, instance.fields.y],
  );
  const panelConfig = useMemo<VisualizationConfig | null>(
    () => (config ? { ...config, twoD } : null),
    [config, twoD],
  );
  const encoding = useScatterEncoding(view.filteredRows, view.dataset, panelConfig, {
    dimensions: 2,
    cap: Math.min(CAP_2D, RENDER_CAP),
    selectedId: selectedRowId,
    theme,
  });

  if (view.filteredCount === 0) return <FilteredEmpty onClear={clearFilters} />;
  if (!encoding) return null;
  if (encoding.unmapped) {
    return (
      <ViewNotice
        title="2D axes are not mapped"
        detail="Choose two numeric columns in the Configure panel to draw this view."
      />
    );
  }
  if (encoding.points.length === 0) {
    return (
      <ViewNotice
        title="No plottable rows"
        detail="The mapped axes contain only missing or invalid values. Choose different columns in Configure."
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <Scatter2D encoding={encoding} />
      </div>
      {encoding.sampled || encoding.skipped > 0 ? (
        <p className="border-t border-border px-3 py-1 text-[10px] text-faint">
          {encoding.sampled ? `Drawing a deterministic ${encoding.points.length.toLocaleString()}-point sample. ` : ""}
          {encoding.skipped > 0 ? `${encoding.skipped.toLocaleString()} row${encoding.skipped === 1 ? "" : "s"} skipped by missing axis values.` : ""}
          {" "}Statistics and export still use every filtered row.
        </p>
      ) : null}
    </div>
  );
}
