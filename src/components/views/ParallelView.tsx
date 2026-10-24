import { useMemo, useRef, useState } from "react";
import type { ParallelBrush, ParallelRecord } from "@/data/parallel";
import { buildParallelData, brushRangeFor, recordMatchesBrush } from "@/data/parallel";
import type { VisualizationProps } from "@/viz/registry";
import { buildCategoryColorMap, categoryColor } from "@/data/colors";
import { formatAxisValue } from "@/data/numeric";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";
import { formatNumber } from "@/lib/utils";
import { FilteredEmpty, ViewNotice } from "./ViewShared";

const WIDTH = 1000;
const HEIGHT = 330;
const PLOT_TOP = 34;
const PLOT_BOTTOM = HEIGHT - 38;
const LEFT = 74;
const RIGHT = WIDTH - 74;
const ACCENT = { light: "#0d5c52", dark: "#63c9b8" } as const;

function truncate(value: string, max = 16): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

interface DragState {
  dimensionIndex: number;
  pointerId: number;
}

export function ParallelView({ view, instance }: VisualizationProps) {
  const dataset = view.dataset!;
  const theme = useDataStore((state) => state.theme);
  const config = useDataStore((state) => state.config);
  const selectedRowIds = useDataStore((state) => state.selectedRowIds);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const selectRow = useDataStore((state) => state.selectRow);
  const selectRows = useDataStore((state) => state.selectRows);
  const setNumericFilter = useDataStore((state) => state.setNumericFilter);
  const clearFilters = useDataStore((state) => state.clearFilters);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);

  const [brush, setBrush] = useState<ParallelBrush>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const startRef = useRef<{ index: number; start: number; last: number } | null>(null);

  const fields = ["d1", "d2", "d3", "d4", "d5"];
  const columns = useMemo(
    () =>
      fields
        .map((key) => dataset.columns.find((column) => column.name === instance.fields[key]) ?? null)
        .filter((column): column is NonNullable<typeof column> => Boolean(column)),
    // Field names are the meaningful dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataset, instance.fields.d1, instance.fields.d2, instance.fields.d3, instance.fields.d4, instance.fields.d5],
  );

  const colorColumn =
    config?.color.mode === "categorical" && config.color.column
      ? dataset.columns.find((column) => column.name === config.color.column) ?? null
      : null;
  const colorMap = useMemo(() => buildCategoryColorMap(colorColumn ?? undefined), [colorColumn]);
  const selected = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

  const data = useMemo(
    () => buildParallelData(view.filteredRows, columns, colorColumn, 2_000, selectedRowId),
    [view.filteredRows, columns, colorColumn, selectedRowId],
  );

  const matched = useMemo(
    () => data.allRecords.filter((record) => recordMatchesBrush(record, data.dimensions, brush)),
    [data.allRecords, data.dimensions, brush],
  );
  const matchedIds = useMemo(() => matched.map((record) => record.rowId), [matched]);
  const activeBrush = Object.keys(brush).length > 0;
  const hoveredRecord = useMemo(
    () => data.records.find((record) => record.rowId === hovered) ?? null,
    [data.records, hovered],
  );

  const xFor = (index: number): number => {
    if (columns.length <= 1) return WIDTH / 2;
    return LEFT + ((RIGHT - LEFT) * index) / (columns.length - 1);
  };
  const yFor = (normalized: number): number => PLOT_TOP + (1 - normalized) * (PLOT_BOTTOM - PLOT_TOP);

  const normalizedFromEvent = (clientY: number): number => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return 0.5;
    const local = ((clientY - rect.top) / rect.height) * HEIGHT;
    return Math.max(0, Math.min(1, (local - PLOT_TOP) / (PLOT_BOTTOM - PLOT_TOP)));
  };

  if (view.filteredCount === 0) return <FilteredEmpty onClear={clearFilters} />;
  if (columns.length < 2) {
    return (
      <ViewNotice
        title="Two numeric axes are required"
        detail="Assign at least two numeric fields in Configure. Missing values are skipped rather than zero-filled."
      />
    );
  }
  if (data.records.length === 0) {
    return (
      <ViewNotice
        title="No complete records"
        detail={`Every filtered row is missing a value on one of these axes (${data.skipped.toLocaleString()} skipped). Choose different fields or clear filters.`}
      />
    );
  }

  const beginBrush = (event: React.PointerEvent<SVGRectElement>, dimensionIndex: number) => {
    event.preventDefault();
    try {
      svgRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic or cancelled pointers may not be capturable; dragging still works inside the SVG.
    }
    const normalized = normalizedFromEvent(event.clientY);
    startRef.current = { index: dimensionIndex, start: normalized, last: normalized };
    setDrag({ dimensionIndex, pointerId: event.pointerId });
  };

  const moveBrush = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const normalized = normalizedFromEvent(event.clientY);
    const dimension = data.dimensions[drag.dimensionIndex];
    if (!dimension) return;
    const startY = startRef.current?.index === drag.dimensionIndex ? startRef.current.start : normalized;
    if (startRef.current?.index === drag.dimensionIndex) startRef.current.last = normalized;
    setBrush((current) => ({ ...current, [dimension.name]: brushRangeFor(dimension, startY, normalized) }));
  };

  const endBrush = () => {
    if (!drag) return;
    const dimension = data.dimensions[drag.dimensionIndex];
    const start = startRef.current;
    setDrag(null);
    startRef.current = null;
    if (!dimension || !start || start.index !== drag.dimensionIndex) return;
    // A click without a meaningful drag should not silently filter the workspace.
    const span = dimension.max - dimension.min;
    const range = brushRangeFor(dimension, start.start, start.last);
    if (span > 0 && (range.max - range.min) / span < 0.002) {
      setBrush((current) => {
        const next = { ...current };
        delete next[dimension.name];
        return next;
      });
    }
  };

  const filterToBrush = () => {
    for (const [name, range] of Object.entries(brush)) {
      setNumericFilter(name, range.min, range.max);
    }
  };

  const hoverLabel = hoveredRecord
    ? hoveredRecord.rawValues
        .map((value, index) => `${columns[index]?.name ?? "—"}=${formatNumber(value)}`)
        .join(" · ")
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-[10.5px] text-muted">
          {data.records.length.toLocaleString()} traces · {columns.length} axes
          {data.sampled ? ` (${data.total.toLocaleString()} complete)` : ""}
        </span>
        {activeBrush ? (
          <span className="mono-num text-[10.5px] text-accent">{matched.length.toLocaleString()} match brush</span>
        ) : (
          <span className="text-[10.5px] text-faint">Drag vertically on an axis to brush</span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button variant="secondary" size="xs" onClick={() => selectRows(matchedIds)} disabled={!activeBrush || matched.length === 0}>
            Select brushed
          </Button>
          <Button variant="ghost" size="xs" onClick={filterToBrush} disabled={!activeBrush}>
            Filter to brush
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setBrush({})} disabled={!activeBrush}>
            Clear brush
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-full w-full touch-none select-none"
          role="img"
          aria-label={`Parallel coordinates view with ${columns.length} axes and ${data.records.length} visible records. Drag vertically on an axis to brush ranges.`}
          onPointerMove={moveBrush}
          onPointerUp={endBrush}
          onPointerCancel={endBrush}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <line
              key={tick}
              x1={LEFT - 8}
              x2={RIGHT + 8}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="var(--ds-border)"
              strokeDasharray="2 5"
              opacity={0.6}
            />
          ))}

          {data.records.map((record: ParallelRecord) => {
            const isSelected = selected.has(record.rowId);
            const isMatched = !activeBrush || recordMatchesBrush(record, data.dimensions, brush);
            const color = colorColumn ? categoryColor(colorMap, record.category) : ACCENT[theme];
            const path = record.values
              .map((value, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`)
              .join(" ");
            return (
              <path
                key={record.rowId}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 2 : 0.8}
                strokeOpacity={isSelected ? 1 : isMatched ? (activeBrush ? 0.55 : 0.3) : 0.035}
                style={{ cursor: "pointer" }}
                onPointerEnter={() => setHovered(record.rowId)}
                onPointerLeave={() => setHovered((current) => (current === record.rowId ? null : current))}
                onClick={(event) => {
                  event.stopPropagation();
                  selectRow(record.rowId);
                  setInspectorTab("record");
                }}
              >
                <title>{`Row ${record.rowId + 1}${isSelected ? " (selected)" : ""}`}</title>
              </path>
            );
          })}

          {data.dimensions.map((dimension, index) => {
            const x = xFor(index);
            const range = brush[dimension.name];
            const top = range ? yFor((range.max - dimension.min) / Math.max(1e-12, dimension.max - dimension.min)) : null;
            const bottom = range ? yFor((range.min - dimension.min) / Math.max(1e-12, dimension.max - dimension.min)) : null;
            return (
              <g key={dimension.name}>
                <line x1={x} x2={x} y1={PLOT_TOP} y2={PLOT_BOTTOM} stroke="var(--ds-border-strong)" strokeWidth={1} />
                {top !== null && bottom !== null ? (
                  <rect
                    x={x - 7}
                    y={Math.min(top, bottom)}
                    width={14}
                    height={Math.max(1, Math.abs(bottom - top))}
                    fill="var(--ds-accent)"
                    opacity={0.16}
                    pointerEvents="none"
                  />
                ) : null}
                {[dimension.min, dimension.max].map((value, tickIndex) => (
                  <text
                    key={tickIndex}
                    x={x + 8}
                    y={tickIndex === 0 ? PLOT_BOTTOM + 4 : PLOT_TOP - 4}
                    textAnchor="middle"
                    fontSize={9.5}
                    fill="var(--ds-faint)"
                    fontFamily="var(--font-mono)"
                  >
                    {formatAxisValue(value)}
                  </text>
                ))}
                <text
                  x={x}
                  y={PLOT_TOP - 17}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--ds-ink-soft)"
                  fontFamily="var(--font-sans)"
                >
                  {truncate(dimension.name, 18)}
                </text>
                {range ? (
                  <text
                    x={x}
                    y={PLOT_BOTTOM + 18}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--ds-accent)"
                    fontFamily="var(--font-mono)"
                  >
                    {formatAxisValue(range.min)}–{formatAxisValue(range.max)}
                  </text>
                ) : null}
                <rect
                  data-brush-axis={index}
                  x={x - 11}
                  y={PLOT_TOP}
                  width={22}
                  height={PLOT_BOTTOM - PLOT_TOP}
                  fill="transparent"
                  style={{ cursor: "ns-resize" }}
                  onPointerDown={(event) => {
                    if (!data.dimensions[index]) return;
                    beginBrush(event, index);
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex min-h-5 items-center justify-between gap-3 border-t border-border px-3 py-1.5">
        <p className="text-[10px] text-faint">
          Each axis is min–max normalized from the full dataset; positions stay stable while filters change. Lines are
          sampled for rendering; brushing and “Select brushed” use every complete filtered record.
        </p>
        {hoverLabel ? <p className="mono-num max-w-[55%] truncate text-[10px] text-ink-soft">{hoverLabel}</p> : null}
      </div>
    </div>
  );
}
