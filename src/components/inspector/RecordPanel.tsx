import { ChevronLeft, ChevronRight, MousePointer2, Table2, X } from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import type { DataColumn } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { displayCell, formatNumber, formatCompact } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";
import { MISSING_CATEGORY } from "@/data/colors";

function rolesForColumn(config: ReturnType<typeof useDataStore.getState>["config"], column: DataColumn): string[] {
  if (!config) return [];
  const roles: string[] = [];
  if (config.axes.x === column.name) roles.push("X");
  if (config.axes.y === column.name) roles.push("Y");
  if (config.axes.z === column.name) roles.push("Z");
  if (config.twoD.x === column.name) roles.push("2D X");
  if (config.twoD.y === column.name) roles.push("2D Y");
  if (config.color.mode !== "none" && config.color.column === column.name) roles.push("Color");
  if (config.size.enabled && config.size.column === column.name) roles.push("Size");
  return roles;
}

export function RecordPanel({ view }: { view: DatasetView }) {
  const config = useDataStore((state) => state.config);
  const selectRow = useDataStore((state) => state.selectRow);
  const clearFilters = useDataStore((state) => state.clearFilters);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const setDataPanelOpen = useUiStore((state) => state.setDataPanelOpen);
  const setMobilePanel = useUiStore((state) => state.setMobilePanel);
  const setFocusRowId = useUiStore((state) => state.setFocusRowId);
  const setDataTab = useUiStore((state) => state.setDataTab);
  const row = view.selectedRow;
  const dataset = view.dataset;

  if (!dataset) return null;

  if (!row) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="checker flex h-12 w-12 items-center justify-center rounded-full border border-border">
          <MousePointer2 size={18} className="text-faint" />
        </div>
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-ink">No record selected</p>
          <p className="max-w-xs text-[11.5px] leading-relaxed text-muted">
            Click a point in the 3D or 2D view, or choose a row in the dataset table, to inspect the original values.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setDataPanelOpen(true);
            setMobilePanel("data");
          }}
        >
          <Table2 size={13} /> Browse rows
        </Button>
        <p className="text-[10.5px] text-faint">Press Escape to clear a selection.</p>
      </div>
    );
  }

  const reveal = () => {
    setDataPanelOpen(true);
    setMobilePanel("data");
    setDataTab("preview");
    setFocusRowId(row.id);
  };

  const goRelative = (direction: -1 | 1) => {
    if (view.selectedIndex < 0) return;
    const target = view.filteredRows[view.selectedIndex + direction];
    if (target) selectRow(target.id);
  };

  const mappedAxes = config
    ? [
        ["X", config.axes.x],
        ["Y", config.axes.y],
        ["Z", config.axes.z],
        ["2D X", config.twoD.x],
        ["2D Y", config.twoD.y],
      ].filter((entry): entry is [string, string] => Boolean(entry[1]))
    : [];
  const missingAxes = [
    ...new Set(
      mappedAxes
        .filter(([, name]) => {
          const column = dataset.columns.find((candidate) => candidate.name === name);
          return column ? row.numeric[column.index] === null || row.numeric[column.index] === undefined : false;
        })
        .map(([, name]) => name),
    ),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mono-num text-[11px] uppercase tracking-wider text-muted">Row {row.id + 1}</span>
            <Badge tone={dataset.source === "demo" ? "warning" : "neutral"}>
              {dataset.source === "demo" ? "Demo" : "Uploaded"}
            </Badge>
            {view.selectedRowHidden ? <Badge tone="danger">Hidden by filters</Badge> : null}
          </div>
          <p className="text-[11px] text-muted">
            Stable record ID <span className="mono-num text-ink-soft">{row.id}</span>
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => goRelative(-1)}
            disabled={view.selectedIndex <= 0}
            aria-label="Select previous visible record"
            title="Previous visible record"
          >
            <ChevronLeft size={15} />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => goRelative(1)}
            disabled={view.selectedIndex < 0 || view.selectedIndex >= view.filteredRows.length - 1}
            aria-label="Select next visible record"
            title="Next visible record"
          >
            <ChevronRight size={15} />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={() => selectRow(null)} aria-label="Clear selection" title="Clear selection">
            <X size={15} />
          </Button>
        </div>
      </div>

      {!view.selectedRowHidden && missingAxes.length > 0 ? (
        <div className="border-b border-border bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-muted" role="status">
          <span className="font-medium text-ink">Not plotted.</span> This record has a missing value on a mapped axis
          ({missingAxes.join(", ")}). Its original values are still shown below; choose a record with complete axis
          values or map another column to see it.
        </div>
      ) : null}

      {view.selectedRowHidden ? (
        <div className="space-y-2 border-b border-border bg-warning-soft px-3 py-2 text-[11px] leading-relaxed text-warning">
          <p>
            This record is outside the current filters. The selection is kept and marked in the table, but plots,
            statistics, and export exclude it.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="secondary" size="xs" onClick={clearFilters}>
              Clear filters
            </Button>
            <Button variant="ghost" size="xs" onClick={reveal}>
              Reveal in table
            </Button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll p-3">
        <dl className="space-y-0">
          {dataset.columns.map((column) => {
            const raw = row.raw[column.index] ?? "";
            const roles = rolesForColumn(config, column);
            const missing = raw.trim() === "";
            const value = missing ? "—" : raw;
            return (
              <div
                key={column.name}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-baseline gap-3 border-b border-border/60 py-1.5 last:border-b-0"
              >
                <dt className="flex min-w-0 flex-wrap items-center gap-1 text-[11.5px] text-muted" title={column.name}>
                  <span className="truncate">{column.name}</span>
                  {roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-[2px] border border-border bg-surface-2 px-1 py-px text-[9px] uppercase tracking-wider text-ink-soft"
                    >
                      {role}
                    </span>
                  ))}
                </dt>
                <dd
                  className={`mono-num min-w-0 break-words text-right text-[11.5px] ${
                    missing ? "text-faint" : column.type === "numeric" && row.numeric[column.index] === null ? "text-warning" : "text-ink"
                  }`}
                  title={missing ? "Missing value" : column.type === "numeric" && row.numeric[column.index] === null ? "Not a valid number" : value}
                >
                  {missing ? (
                    "—"
                  ) : column.type === "numeric" ? (
                    row.numeric[column.index] === null ? (
                      `${value} (invalid)`
                    ) : (
                      formatNumber(row.numeric[column.index])
                    )
                  ) : value === MISSING_CATEGORY ? (
                    "Missing"
                  ) : (
                    displayCell(value)
                  )}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" onClick={reveal}>
            <Table2 size={13} /> Reveal in table
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setInspectorTab("filters")}>
            Refine filters
          </Button>
        </div>

        <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
          Original cell values are shown. Numeric values are parsed separately for plotting; an em dash means the cell
          was empty or invalid. Visible subset: {formatCompact(view.filteredCount)} of{" "}
          {formatCompact(view.totalCount)} rows.
        </p>
      </div>
    </div>
  );
}
