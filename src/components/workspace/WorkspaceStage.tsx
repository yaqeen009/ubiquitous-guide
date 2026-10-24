import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Box,
  ChevronLeft,
  ChevronRight,
  Expand,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Orbit,
  Plus,
  Settings2,
  X,
} from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import type { ViewInstance, WorkspaceLayout } from "@/types";
import { visualizationById } from "@/viz/registry";
import { useDataStore } from "@/store/useDataStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useUiStore } from "@/store/useUiStore";
import { OPEN_VIEW_EVENT } from "@/workspace/events";
import { SegmentedControl, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ViewGallery } from "./ViewGallery";
import { SpatialStage } from "@/components/spatial/SpatialStage";
import { cn, formatCompact } from "@/lib/utils";

function panelDetail(panel: ViewInstance, view: DatasetView): string {
  const fields = panel.fields;
  if (panel.type === "scatter3d") {
    return [fields.x, fields.y, fields.z].map((name) => name ?? "—").join(" × ");
  }
  if (panel.type === "scatter2d") return `${fields.x ?? "—"} × ${fields.y ?? "—"}`;
  if (panel.type === "timeseries") return `${fields.value ?? "—"} over ${fields.date ?? "—"}`;
  if (panel.type === "histogram") return `${fields.value ?? "—"} · ${String(panel.options.bins ?? "auto")} bins`;
  if (panel.type === "correlation") return `Pearson · ${Math.min(view.numericColumns.length, Number(panel.options.maxColumns ?? 8))} variables`;
  if (panel.type === "parallel") {
    const axes = ["d1", "d2", "d3", "d4", "d5"].map((key) => fields[key]).filter(Boolean);
    return axes.join(" · ");
  }
  if (panel.type === "table") return `${view.filteredCount.toLocaleString()} ${view.activeFilters > 0 ? "filtered " : ""}rows`;
  return "";
}

function Splitter({
  ratio,
  onChange,
}: {
  ratio: number;
  onChange: (ratio: number) => void;
}) {
  const drag = useRef<{ x: number; ratio: number; width: number } | null>(null);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize visualization panels"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={25}
      aria-valuemax={75}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onChange(ratio - 0.05);
        if (event.key === "ArrowRight") onChange(ratio + 0.05);
      }}
      onPointerDown={(event) => {
        const parent = event.currentTarget.parentElement;
        if (!parent) return;
        drag.current = { x: event.clientX, ratio, width: parent.getBoundingClientRect().width };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const delta = (event.clientX - drag.current.x) / Math.max(1, drag.current.width);
        onChange(drag.current.ratio + delta);
      }}
      onPointerUp={(event) => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      className="group hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-transparent md:flex"
    >
      <span className="h-10 w-0.5 rounded-full bg-border-strong transition-colors group-hover:bg-accent" />
    </div>
  );
}

function PanelFrame({
  panel,
  view,
  active,
  maximized,
  index,
  count,
  onFocus,
  onRemove,
  onMaximize,
  onMove,
}: {
  panel: ViewInstance;
  view: DatasetView;
  active: boolean;
  maximized: boolean;
  index: number;
  count: number;
  onFocus: () => void;
  onRemove: () => void;
  onMaximize: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const definition = visualizationById(panel.type);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const setMobilePanel = useUiStore((state) => state.setMobilePanel);
  if (!definition) return null;
  const Component = definition.component;
  const title = panel.title ?? definition.shortName;

  return (
    <section
      aria-label={`${definition.name} view`}
      aria-current={active ? "true" : undefined}
      onPointerDownCapture={onFocus}
      onFocusCapture={onFocus}
      className={cn(
        "flex min-h-[340px] min-w-0 flex-col overflow-hidden rounded-md border bg-surface shadow-panel transition-colors",
        active ? "border-accent" : "border-border hover:border-border-strong",
      )}
    >
      <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-2 py-1">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="text-muted" aria-hidden>
            {panel.type === "scatter3d" ? <Box size={12} /> : panel.type === "scatter2d" ? <ArrowLeftRight size={12} /> : <LayoutGrid size={12} />}
          </span>
          <h3 className="truncate text-[11.5px] font-medium text-ink" title={definition.name}>
            {title}
          </h3>
          <span className="hidden max-w-52 truncate text-[10px] text-muted sm:inline" title={panelDetail(panel, view)}>
            {panelDetail(panel, view)}
          </span>
          {active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden /> : null}
        </div>
        <div className="flex items-center gap-0.5">
          <Badge tone="neutral" className="hidden xl:inline-flex">
            {definition.capabilities.selection === "none"
              ? "Aggregate"
              : definition.capabilities.selection === "filter"
                ? "Filter"
                : definition.capabilities.selection === "multiple"
                  ? "Multi-select"
                  : "Linked"}
          </Badge>
          <Tooltip content="Configure this view's fields">
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={`Configure ${title}`}
              onClick={() => {
                onFocus();
                setInspectorTab("view");
                setMobilePanel("config");
              }}
            >
              <Settings2 size={13} />
            </Button>
          </Tooltip>
          <Tooltip content="Move view earlier">
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={`Move ${title} earlier`}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ChevronLeft size={13} />
            </Button>
          </Tooltip>
          <Tooltip content="Move view later">
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={`Move ${title} later`}
              disabled={index >= count - 1}
              onClick={() => onMove(1)}
            >
              <ChevronRight size={13} />
            </Button>
          </Tooltip>
          <Tooltip content={maximized ? "Restore panel" : "Maximize panel"}>
            <Button variant="ghost" size="iconSm" aria-label={maximized ? `Restore ${title}` : `Maximize ${title}`} onClick={onMaximize}>
              {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </Button>
          </Tooltip>
          <Tooltip content="Close view">
            <Button variant="ghost" size="iconSm" aria-label={`Close ${title}`} onClick={onRemove}>
              <X size={13} />
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <Component view={view} instance={panel} />
        </div>
      </div>
    </section>
  );
}

export function WorkspaceStage({ view }: { view: DatasetView }) {
  const dataset = view.dataset;
  const config = useDataStore((state) => state.config);
  const selectRow = useDataStore((state) => state.selectRow);
  const clearFilters = useDataStore((state) => state.clearFilters);
  const setHelpOpen = useUiStore((state) => state.setHelpOpen);
  const ensureForDataset = useWorkspaceStore((state) => state.ensureForDataset);
  const panels = useWorkspaceStore((state) => state.panels);
  const layout = useWorkspaceStore((state) => state.layout);
  const activePanelId = useWorkspaceStore((state) => state.activePanelId);
  const maximizedPanelId = useWorkspaceStore((state) => state.maximizedPanelId);
  const splitRatio = useWorkspaceStore((state) => state.splitRatio);
  const spatialMode = useWorkspaceStore((state) => state.spatialMode);
  const warnings = useWorkspaceStore((state) => state.warnings);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const removeView = useWorkspaceStore((state) => state.removeView);
  const moveView = useWorkspaceStore((state) => state.moveView);
  const setLayout = useWorkspaceStore((state) => state.setLayout);
  const toggleMaximized = useWorkspaceStore((state) => state.toggleMaximized);
  const setSplitRatio = useWorkspaceStore((state) => state.setSplitRatio);
  const setSpatialMode = useWorkspaceStore((state) => state.setSpatialMode);
  const addView = useWorkspaceStore((state) => state.addView);
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace);
  const clearWarnings = useWorkspaceStore((state) => state.clearWarnings);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    if (dataset) ensureForDataset(dataset, config);
  }, [dataset, config, ensureForDataset]);

  const handleOpenView = useCallback(
    (event: Event) => {
      if (!dataset) return;
      const type = (event as CustomEvent).detail;
      if (typeof type !== "string") return;
      addView(type as Parameters<typeof addView>[0], dataset, config?.hiddenColumns ?? []);
    },
    [addView, dataset, config?.hiddenColumns],
  );

  useEffect(() => {
    window.addEventListener(OPEN_VIEW_EVENT, handleOpenView);
    return () => window.removeEventListener(OPEN_VIEW_EVENT, handleOpenView);
  }, [handleOpenView]);

  if (!dataset || !config) return null;
  const activePanel = panels.find((panel) => panel.id === activePanelId) ?? panels[0] ?? null;
  const maximizedPanel = maximizedPanelId ? panels.find((panel) => panel.id === maximizedPanelId) ?? null : null;
  const active = maximizedPanel ?? activePanel;

  const renderPanel = (panel: ViewInstance, index: number, maximized = false) => (
    <PanelFrame
      key={panel.id}
      panel={panel}
      view={view}
      active={panel.id === activePanel?.id}
      maximized={maximized}
      index={index}
      count={panels.length}
      onFocus={() => setActiveView(panel.id)}
      onRemove={() => removeView(panel.id)}
      onMaximize={() => toggleMaximized(panel.id)}
      onMove={(direction) => moveView(panel.id, direction)}
    />
  );

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface shadow-panel"
      aria-label="Multiview visualization workspace"
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          !(event.target instanceof HTMLInputElement) &&
          !(event.target instanceof HTMLSelectElement)
        ) {
          selectRow(null);
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="panel-title">Workspace</span>
          <Badge tone="neutral">{panels.length} view{panels.length === 1 ? "" : "s"}</Badge>
        </div>

        {panels.length > 1 ? (
          <SegmentedControl
            label="Workspace layout"
            value={layout}
            onChange={(next) => setLayout(next as WorkspaceLayout)}
            className="w-[204px]"
            options={[
              { value: "single", label: "Single", icon: <Expand size={11} />, title: "One view at a time" },
              { value: "columns", label: "Columns", icon: <ArrowLeftRight size={11} />, title: "Side by side" },
              { value: "grid", label: "Grid", icon: <LayoutGrid size={11} />, title: "Wrap into a grid" },
            ]}
          />
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="mono-num hidden text-[10.5px] text-muted sm:inline">
            {formatCompact(view.filteredCount)} / {formatCompact(view.totalCount)} rows
          </span>
          {view.activeFilters > 0 ? (
            <Badge tone="accent" className="hidden sm:inline-flex">
              {view.activeFilters} filter{view.activeFilters === 1 ? "" : "s"}
            </Badge>
          ) : null}
          <Tooltip content="Browse registered visualization types">
            <Button variant="secondary" size="xs" onClick={() => setGalleryOpen(true)}>
              <Plus size={12} /> Add view
            </Button>
          </Tooltip>
          <Tooltip content="Experimental spatial workspace">
            <Button
              variant={spatialMode ? "primary" : "ghost"}
              size="iconSm"
              aria-pressed={spatialMode}
              aria-label="Toggle experimental spatial workspace"
              onClick={() => setSpatialMode(!spatialMode)}
            >
              <Orbit size={14} />
            </Button>
          </Tooltip>
          <Tooltip content="Restore the default view layout">
            <Button variant="ghost" size="iconSm" aria-label="Reset workspace layout" onClick={() => resetWorkspace(dataset, config)}>
              <LayoutGrid size={14} />
            </Button>
          </Tooltip>
          <Tooltip content="Navigation, selection, and view guide">
            <Button variant="ghost" size="iconSm" aria-label="Open exploration guide" onClick={() => setHelpOpen(true)}>
              <span aria-hidden className="text-[12px] font-medium">?</span>
            </Button>
          </Tooltip>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="flex items-start justify-between gap-2 border-b border-warning/25 bg-warning-soft px-3 py-1.5 text-[10.5px] leading-relaxed text-warning" role="status">
          <p>
            {warnings.length} workspace note{warnings.length === 1 ? "" : "s"}: {warnings.slice(0, 2).join(" ")}
          </p>
          <button type="button" onClick={clearWarnings} className="shrink-0 text-[10.5px] underline">
            Dismiss
          </button>
        </div>
      ) : null}

      {view.selectedRowIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent-soft/50 px-3 py-1.5 text-[10.5px] text-ink-soft">
          <span>
            <span className="font-medium">{view.selectedRowIds.length}</span> record
            {view.selectedRowIds.length === 1 ? "" : "s"} selected
            {view.selectedRow ? ` · primary row ${view.selectedRow.id + 1}` : ""}
          </span>
          {view.hiddenSelectionCount > 0 ? (
            <span className="text-warning">
              {view.hiddenSelectionCount} hidden by filters
            </span>
          ) : null}
          {view.hiddenSelectionCount > 0 ? (
            <Button variant="ghost" size="xs" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
          <Button variant="ghost" size="xs" className="ml-auto" onClick={() => selectRow(null)}>
            Clear selection
          </Button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 p-2">
        {panels.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-[13px] font-medium text-ink">No views are open</p>
            <p className="max-w-sm text-[11.5px] text-muted">Open a view from the gallery. The dataset stays loaded.</p>
            <Button variant="primary" size="sm" onClick={() => setGalleryOpen(true)}>
              <Plus size={13} /> Open view gallery
            </Button>
          </div>
        ) : spatialMode ? (
          <SpatialStage
            panels={panels}
            view={view}
            activePanelId={activePanel?.id ?? null}
            onExit={() => setSpatialMode(false)}
            onFocus={(id) => {
              setActiveView(id);
              setSpatialMode(false);
            }}
            onAdd={() => setGalleryOpen(true)}
          />
        ) : maximizedPanel ? (
          <div className="h-full">{renderPanel(maximizedPanel, panels.indexOf(maximizedPanel), true)}</div>
        ) : layout === "single" && active ? (
          <div className="flex h-full min-h-0 flex-col gap-2">
            {panels.length > 1 ? (
              <div className="flex shrink-0 flex-wrap gap-1" role="tablist" aria-label="Open views">
                {panels.map((panel) => {
                  const def = visualizationById(panel.type);
                  return (
                    <button
                      key={panel.id}
                      type="button"
                      role="tab"
                      aria-selected={panel.id === active.id}
                      onClick={() => setActiveView(panel.id)}
                      className={cn(
                        "rounded-sm border px-2 py-1 text-[10.5px] transition-colors focus-visible:outline-2 focus-visible:outline-focus",
                        panel.id === active.id
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border bg-surface text-muted hover:text-ink",
                      )}
                    >
                      {panel.title ?? def?.shortName ?? panel.type}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="min-h-0 flex-1">{renderPanel(active, panels.indexOf(active))}</div>
          </div>
        ) : layout === "columns" ? (
          <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto md:flex-row md:overflow-x-auto md:overflow-y-hidden thin-scroll">
            {panels.map((panel, index) => {
              const isFirst = index === 0;
              const widthStyle =
                panels.length === 2
                  ? isFirst
                    ? `calc(${splitRatio * 100}% - 4px)`
                    : `calc(${(1 - splitRatio) * 100}% - 4px)`
                  : undefined;
              return (
                <div
                  key={panel.id}
                  className={`flex min-h-[340px] min-w-0 md:min-h-0 ${
                    panels.length === 2 ? "md:flex-none" : "md:w-[380px] md:flex-none"
                  }`}
                  style={panels.length === 2 ? { width: widthStyle } : undefined}
                >
                  <div className="min-w-0 flex-1">{renderPanel(panel, index)}</div>
                  {panels.length === 2 && isFirst ? <Splitter ratio={splitRatio} onChange={setSplitRatio} /> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid h-full min-h-0 auto-rows-[minmax(340px,1fr)] grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
            {panels.map((panel, index) => renderPanel(panel, index))}
          </div>
        )}
      </div>

      <ViewGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        dataset={dataset}
        hidden={config.hiddenColumns}
      />
    </section>
  );
}
