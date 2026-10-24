import { useMemo } from "react";
import { ArrowLeftRight, Box, Camera, ChartScatter, CircleHelp, MousePointer2 } from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import { RENDER_CAP } from "@/data/limits";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";
import { useScatterEncoding } from "@/viz/encoding";
import { formatCompact } from "@/lib/utils";
import { Scatter3D } from "./Scatter3D";
import { Scatter2D } from "./Scatter2D";
import { ColorLegend } from "./ColorLegend";
import { WebGLBoundary, supportsWebGL } from "./WebGLBoundary";
import { SegmentedControl, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

const CAP_2D = 4_000;

function EmptyPlot({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="checker flex h-14 w-14 items-center justify-center rounded-full border border-border" aria-hidden>
        <MousePointer2 size={20} className="text-faint" />
      </div>
      <div className="space-y-1">
        <p className="text-[13px] font-medium text-ink">{filtered ? "No records match the filters" : "No plottable rows"}</p>
        <p className="max-w-xs text-[12px] leading-relaxed text-muted">
          {filtered
            ? "Every record is currently excluded. Clear or widen the filters to bring points back."
            : "The mapped axes contain only missing or invalid values. Choose different columns in Configure."}
        </p>
      </div>
      {filtered ? (
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear all filters
        </Button>
      ) : null}
    </div>
  );
}

function PaneHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-1.5">
      <div className="flex min-w-0 items-baseline gap-2">
        <h3 className="panel-title">{title}</h3>
        <p className="truncate text-[11px] text-muted" title={detail}>
          {detail}
        </p>
      </div>
    </div>
  );
}

export function VizStage({ view }: { view: DatasetView }) {
  const config = useDataStore((state) => state.config);
  const theme = useDataStore((state) => state.theme);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const requestCameraReset = useDataStore((state) => state.requestCameraReset);
  const clearFilters = useDataStore((state) => state.clearFilters);
  const setLayout = useDataStore((state) => state.setLayout);
  const setHelpOpen = useUiStore((state) => state.setHelpOpen);
  const webgl = useMemo(() => supportsWebGL(), []);

  const encoding3D = useScatterEncoding(view.filteredRows, view.dataset, config, {
    dimensions: 3,
    cap: RENDER_CAP,
    selectedId: selectedRowId,
    theme,
  });
  const encoding2D = useScatterEncoding(view.filteredRows, view.dataset, config, {
    dimensions: 2,
    cap: CAP_2D,
    selectedId: selectedRowId,
    theme,
  });

  if (!config || !encoding3D || !encoding2D) return null;
  const layout = config.layout;
  const show3D = layout === "3d" || layout === "split";
  const show2D = layout === "2d" || layout === "split";
  const empty = view.filteredCount === 0;
  const axis3D = [config.axes.x, config.axes.y, config.axes.z].map((name) => name ?? "—").join(" × ");
  const axis2D = `${config.twoD.x ?? "—"} × ${config.twoD.y ?? "—"}`;
  const activeEncoding = show3D ? encoding3D : encoding2D;
  const shown = activeEncoding.points.length;
  const skipped = activeEncoding.skipped;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface shadow-panel" aria-label="Visualization workspace">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <SegmentedControl
          label="Visualization layout"
          value={layout}
          onChange={setLayout}
          className="w-full max-w-[268px]"
          options={[
            { value: "3d", label: "3D", icon: <Box size={12} />, title: "3D scatter plot" },
            { value: "2d", label: "2D", icon: <ChartScatter size={12} />, title: "2D scatter plot" },
            { value: "split", label: "Compare", icon: <ArrowLeftRight size={12} />, title: "Side-by-side comparison" },
          ]}
        />
        <div className="flex items-center gap-1.5">
          {view.activeFilters > 0 ? (
            <Badge tone="accent" className="hidden sm:inline-flex">
              {view.activeFilters} filter{view.activeFilters === 1 ? "" : "s"}
            </Badge>
          ) : null}
          <span className="mono-num mr-1 hidden text-[11px] text-muted sm:inline">
            {formatCompact(view.filteredCount)} / {formatCompact(view.totalCount)} rows
          </span>
          {show3D ? (
            <Tooltip content="Reset camera to the default angle">
              <Button variant="ghost" size="iconSm" onClick={requestCameraReset} aria-label="Reset 3D camera">
                <Camera size={15} />
              </Button>
            </Tooltip>
          ) : null}
          <Tooltip content="Navigation, scaling, and comparison guide">
            <Button variant="ghost" size="iconSm" onClick={() => setHelpOpen(true)} aria-label="Open exploration guide">
              <CircleHelp size={15} />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col ${layout === "split" ? "md:flex-row" : ""}`}>
        {show3D ? (
          <div className={`relative min-h-[320px] flex-1 lg:min-h-0 ${layout === "split" ? "md:min-h-0" : ""}`}>
            <PaneHeader title="3D" detail={axis3D} />
            <div className="relative h-[calc(100%-31px)] min-h-[289px] lg:min-h-0">
              {empty ? (
                <EmptyPlot filtered onClear={clearFilters} />
              ) : encoding3D.points.length === 0 ? (
                <EmptyPlot filtered={false} onClear={clearFilters} />
              ) : !webgl ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="surface-grid h-20 w-20 rounded-md border border-dashed border-border-strong" aria-hidden />
                  <p className="max-w-xs text-[12.5px] leading-relaxed text-muted">
                    WebGL is not available in this browser. The linked 2D view shows the same records and selection.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => setLayout("2d")}>
                    Open 2D view
                  </Button>
                </div>
              ) : (
                <WebGLBoundary onUse2D={() => setLayout("2d")}>
                  <Scatter3D encoding={encoding3D} />
                </WebGLBoundary>
              )}
            </div>
          </div>
        ) : null}

        {show2D ? (
          <div
            className={`relative min-h-[320px] flex-1 lg:min-h-0 ${
              layout === "split" ? "border-t border-border md:min-h-0 md:border-l md:border-t-0" : ""
            }`}
          >
            <PaneHeader title="2D" detail={axis2D} />
            <div className="relative h-[calc(100%-31px)] min-h-[289px] lg:min-h-0">
              {empty ? (
                <EmptyPlot filtered onClear={clearFilters} />
              ) : encoding2D.unmapped ? (
                <div className="flex h-full items-center justify-center p-8 text-center">
                  <p className="max-w-xs text-[12.5px] leading-relaxed text-muted">
                    Choose two numeric columns for the 2D axes in the Configure panel.
                  </p>
                </div>
              ) : encoding2D.points.length === 0 ? (
                <EmptyPlot filtered={false} onClear={clearFilters} />
              ) : (
                <Scatter2D encoding={encoding2D} />
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border px-3 py-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <ColorLegend encoding={activeEncoding} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-faint">
            <span>
              {show3D ? "Drag to rotate · scroll to zoom · right-drag to pan · click a point" : "Hover for values · click to select"}
            </span>
            {activeEncoding.sampled ? (
              <span className="text-warning">
                {formatCompact(shown)} of {formatCompact(activeEncoding.total)} points drawn (sampled)
              </span>
            ) : null}
            {skipped > 0 ? <span>{formatCompact(skipped)} rows hidden by missing axis values</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
