import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VisualizationProps } from "@/viz/registry";
import { buildCategoryColorMap, categoryColor } from "@/data/colors";
import { rowDateValue } from "@/data/filters";
import { dateInputValue, formatDateValue, parseDateInput } from "@/data/numeric";
import { buildTimeSeries, type TimeSeriesPoint } from "@/data/timeseries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";
import { formatNumber } from "@/lib/utils";
import { FilteredEmpty, ViewNotice } from "./ViewShared";

const ACCENT = { light: "#0d5c52", dark: "#63c9b8" } as const;

function formatMoment(value: number): string {
  const date = new Date(value);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: TimeSeriesPoint;
}

function SeriesDot({ cx, cy, payload, selectedRowId, color }: DotProps & { selectedRowId: number | null; color: string }) {
  if (cx === undefined || cy === undefined || !payload) return <g />;
  const selected = payload.rowId === selectedRowId;
  return (
    <g>
      {selected ? (
        <circle cx={cx} cy={cy} r={6} fill="none" stroke="var(--ds-ink)" strokeWidth={1.5} strokeDasharray="2 2" />
      ) : null}
      <circle cx={cx} cy={cy} r={selected ? 3.8 : 2.2} fill={color} stroke="var(--ds-surface)" strokeWidth={selected ? 1 : 0.5} />
    </g>
  );
}

export function TimeSeriesView({ view, instance }: VisualizationProps) {
  const dataset = view.dataset!;
  const theme = useDataStore((state) => state.theme);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const selectRow = useDataStore((state) => state.selectRow);
  const setTimeFilter = useDataStore((state) => state.setTimeFilter);
  const clearTimeFilter = useDataStore((state) => state.clearTimeFilter);
  const clearFilters = useDataStore((state) => state.clearFilters);
  const config = useDataStore((state) => state.config);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);

  const dateColumn = dataset.columns.find((column) => column.name === instance.fields.date) ?? null;
  const valueColumn = dataset.columns.find((column) => column.name === instance.fields.value) ?? null;
  const groupColumn = instance.fields.category
    ? dataset.columns.find((column) => column.name === instance.fields.category) ?? null
    : null;
  const requestedSeries = typeof instance.options.maxSeries === "number" ? instance.options.maxSeries : 6;
  const maxSeries = Math.min(12, Math.max(1, Math.trunc(requestedSeries)));

  const extent = useMemo(() => {
    if (!dateColumn) return null;
    let min: number | null = null;
    let max: number | null = null;
    for (const row of dataset.rows) {
      const value = rowDateValue(row, dateColumn);
      if (value === null) continue;
      if (min === null || value < min) min = value;
      if (max === null || value > max) max = value;
    }
    return min !== null && max !== null ? { min, max } : null;
  }, [dataset, dateColumn]);

  const activeRange = dateColumn ? config?.filters.time?.[dateColumn.name] : undefined;
  const [startDraft, setStartDraft] = useState(dateInputValue(activeRange?.min ?? extent?.min));
  const [endDraft, setEndDraft] = useState(dateInputValue(activeRange?.max ?? extent?.max));

  useEffect(() => {
    setStartDraft(dateInputValue(activeRange?.min ?? extent?.min));
    setEndDraft(dateInputValue(activeRange?.max ?? extent?.max));
  }, [activeRange?.min, activeRange?.max, extent?.min, extent?.max]);

  const result = useMemo(() => {
    if (!dateColumn || !valueColumn) return null;
    return buildTimeSeries(view.filteredRows, dateColumn, valueColumn, {
      groupColumn,
      maxSeries,
      includeRowId: selectedRowId,
    });
  }, [view.filteredRows, dateColumn, valueColumn, groupColumn, maxSeries, selectedRowId]);

  const colorMap = useMemo(() => buildCategoryColorMap(groupColumn ?? undefined), [groupColumn]);

  if (view.filteredCount === 0) return <FilteredEmpty onClear={clearFilters} />;
  if (!dateColumn || !valueColumn) {
    return (
      <ViewNotice
        title="Time series fields are unavailable"
        detail="Choose a date field and a numeric measure in Configure. This view never guesses ambiguous day/month order."
      />
    );
  }
  if (!extent) {
    return (
      <ViewNotice
        title="No valid dates"
        detail="The selected time field has no parseable year-first dates. Supported examples: 2026-10-24 or 2026-10-24T14:30:00Z."
        tone="warning"
      />
    );
  }
  if (!result || result.validCount === 0) {
    return (
      <ViewNotice
        title="No plottable time points"
        detail={`${result?.invalidDates ?? 0} rows have invalid dates and ${result?.missingValues ?? 0} have missing measures in the filtered set.`}
        tone="warning"
      />
    );
  }

  const commitTimeRange = () => {
    const start = parseDateInput(startDraft);
    const end = parseDateInput(endDraft);
    if (start === null || end === null) {
      setStartDraft(dateInputValue(activeRange?.min ?? extent.min));
      setEndDraft(dateInputValue(activeRange?.max ?? extent.max));
      return;
    }
    const low = Math.max(extent.min, Math.min(start, end));
    // Date inputs are day-granular; include the whole end day.
    const high = Math.min(extent.max, Math.max(start, end) + 86_399_999);
    if (low <= extent.min && high >= extent.max) {
      clearTimeFilter(dateColumn.name);
      return;
    }
    setTimeFilter(dateColumn.name, low, high);
  };

  const formatValue = (value: number): string => formatNumber(value);
  const tickFormatter = (value: number): string => formatDateValue(value);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-end gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <label className="text-[10.5px] text-muted" htmlFor={`ts-start-${instance.id}`}>
            From
          </label>
          <Input
            id={`ts-start-${instance.id}`}
            type="date"
            value={startDraft}
            min={dateInputValue(extent.min)}
            max={dateInputValue(extent.max)}
            onChange={(event) => setStartDraft(event.target.value)}
            onBlur={commitTimeRange}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitTimeRange();
            }}
            className="h-7 w-[142px] px-1.5 text-[11px]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[10.5px] text-muted" htmlFor={`ts-end-${instance.id}`}>
            To
          </label>
          <Input
            id={`ts-end-${instance.id}`}
            type="date"
            value={endDraft}
            min={dateInputValue(extent.min)}
            max={dateInputValue(extent.max)}
            onChange={(event) => setEndDraft(event.target.value)}
            onBlur={commitTimeRange}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitTimeRange();
            }}
            className="h-7 w-[142px] px-1.5 text-[11px]"
          />
        </div>
        {activeRange ? (
          <Button variant="ghost" size="xs" onClick={() => clearTimeFilter(dateColumn.name)}>
            Clear time filter
          </Button>
        ) : null}
        <span className="mono-num ml-auto text-[10.5px] text-muted">
          {result.validCount.toLocaleString()} points · {dateColumn.name} × {valueColumn.name}
        </span>
      </div>

      {groupColumn ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1.5" aria-label="Time series legend">
          {result.series.map((series) => {
            const color = groupColumn ? categoryColor(colorMap, series.key) : ACCENT[theme];
            return (
              <span key={series.key} className="inline-flex items-center gap-1.5 text-[10.5px] text-ink-soft">
                <span className="h-1.5 w-4 rounded-full" style={{ background: color }} aria-hidden />
                <span className="max-w-36 truncate" title={series.key}>
                  {series.key}
                </span>
                <span className="mono-num text-faint">{series.count.toLocaleString()}</span>
              </span>
            );
          })}
          {result.omittedCategories > 0 ? (
            <span className="text-[10.5px] text-warning">{result.omittedCategories} categories not drawn</span>
          ) : null}
        </div>
      ) : null}

      <div
        className="min-h-0 flex-1 px-1 pb-1 pt-2"
        role="img"
        aria-label={`Time series of ${valueColumn.name} over ${dateColumn.name}. ${result.validCount} valid points in ${result.series.length} series.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 18, bottom: 18, left: 8 }}>
            <CartesianGrid stroke="var(--ds-border)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="time"
              domain={[result.minTime ?? extent.min, result.maxTime ?? extent.max]}
              tickFormatter={tickFormatter}
              tick={{ fill: "var(--ds-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickLine={{ stroke: "var(--ds-border-strong)" }}
              axisLine={{ stroke: "var(--ds-border-strong)" }}
              height={34}
              tickCount={6}
              allowDataOverflow
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fill: "var(--ds-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickLine={{ stroke: "var(--ds-border-strong)" }}
              axisLine={{ stroke: "var(--ds-border-strong)" }}
              width={52}
              tickCount={5}
              label={{
                value: valueColumn.name,
                angle: -90,
                position: "insideLeft",
                offset: 8,
                fill: "var(--ds-ink-soft)",
                fontSize: 10.5,
                style: { textAnchor: "middle" },
              }}
            />
            <ChartTooltip
              isAnimationActive={false}
              labelFormatter={(value) => formatMoment(Number(value))}
              formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
              contentStyle={{
                background: "var(--ds-surface)",
                border: "1px solid var(--ds-border-strong)",
                borderRadius: 4,
                fontSize: 11.5,
                color: "var(--ds-ink)",
              }}
            />
            {result.series.map((series) => {
              const color = groupColumn ? categoryColor(colorMap, series.key) : ACCENT[theme];
              return (
                <Scatter
                  key={series.key}
                  data={series.points}
                  dataKey="value"
                  name={series.key}
                  fill={color}
                  line={
                    series.hasDuplicateTimestamps
                      ? false
                      : { stroke: color, strokeWidth: 1.5, strokeOpacity: 0.8 }
                  }
                  shape={<SeriesDot selectedRowId={selectedRowId} color={color} />}
                  isAnimationActive={false}
                  onClick={(point: { payload?: TimeSeriesPoint } | undefined) => {
                    if (point?.payload) {
                      selectRow(point.payload.rowId);
                      setInspectorTab("record");
                    }
                  }}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="border-t border-border px-3 py-1.5 text-[10.5px] leading-relaxed text-faint">
        {result.sampled ? "Rendering is sampled; counts and sorting use all filtered points. " : ""}
        {result.invalidDates > 0 ? `${result.invalidDates.toLocaleString()} invalid dates excluded. ` : ""}
        {result.missingValues > 0 ? `${result.missingValues.toLocaleString()} missing measures excluded. ` : ""}
        {result.duplicateTimestamps > 0
          ? `${result.duplicateTimestamps.toLocaleString()} duplicate timestamps are drawn as separate points with connecting lines omitted; no implicit aggregation. `
          : "No implicit aggregation: every valid record keeps its own timestamp. "}
        Click a dot to select that record.
      </p>
    </div>
  );
}
