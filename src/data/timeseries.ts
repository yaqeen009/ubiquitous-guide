import type { DataColumn, DataRow } from "@/types";
import { rowDateValue } from "./filters";

export interface TimeSeriesPoint {
  rowId: number;
  time: number;
  value: number;
}

export interface TimeSeriesSeries {
  key: string;
  /** Number of valid records in the group before any render sampling. */
  count: number;
  points: TimeSeriesPoint[];
  /** True when two or more points share this series timestamp. */
  hasDuplicateTimestamps: boolean;
}

export interface TimeSeriesResult {
  series: TimeSeriesSeries[];
  /** Records with an empty or invalid timestamp. */
  invalidDates: number;
  /** Records with a missing or invalid measure. */
  missingValues: number;
  /** Valid points before render sampling. */
  validCount: number;
  totalRows: number;
  sampled: boolean;
  /** Categories omitted because the series limit was reached. */
  omittedCategories: number;
  minTime: number | null;
  maxTime: number | null;
  duplicateTimestamps: number;
}

export interface TimeSeriesOptions {
  /** Category column used to split records into separate lines. */
  groupColumn?: DataColumn | null;
  maxSeries?: number;
  maxPoints?: number;
  includeRowId?: number | null;
}

/**
 * Build time-series series from records.
 *
 * Each record keeps its own timestamp; records are never silently bucketed or
 * averaged. A duplicate timestamp is plotted as two points and counted, so the
 * UI can disclose it. Records with invalid dates or missing measures are
 * excluded and counted. Only rendering is sampled; counts describe the full
 * filtered set.
 */
export function buildTimeSeries(
  rows: DataRow[],
  dateColumn: DataColumn,
  valueColumn: DataColumn,
  options: TimeSeriesOptions = {},
): TimeSeriesResult {
  const maxSeries = Math.max(1, options.maxSeries ?? 6);
  const maxPoints = Math.max(100, options.maxPoints ?? 4_000);
  const grouped = new Map<string, TimeSeriesPoint[]>();
  let invalidDates = 0;
  let missingValues = 0;
  let minTime: number | null = null;
  let maxTime: number | null = null;

  for (const row of rows) {
    const time = rowDateValue(row, dateColumn);
    if (time === null) {
      invalidDates += 1;
      continue;
    }
    const value = row.numeric[valueColumn.index];
    if (value === null || value === undefined || !Number.isFinite(value)) {
      missingValues += 1;
      continue;
    }
    const rawGroup = options.groupColumn ? (row.raw[options.groupColumn.index] ?? "").trim() : "";
    const key = options.groupColumn ? rawGroup || "Missing" : "All records";
    const list = grouped.get(key);
    const point = { rowId: row.id, time, value };
    if (list) list.push(point);
    else grouped.set(key, [point]);
    if (minTime === null || time < minTime) minTime = time;
    if (maxTime === null || time > maxTime) maxTime = time;
  }

  const ranked = [...grouped.entries()]
    .map(([key, points]) => ({ key, points }))
    .sort((a, b) => b.points.length - a.points.length || a.key.localeCompare(b.key));
  const shown = ranked.slice(0, maxSeries);
  const validCount = ranked.reduce((total, entry) => total + entry.points.length, 0);
  let duplicateTimestamps = 0;

  const perSeriesCap = Math.max(100, Math.floor(maxPoints / Math.max(1, shown.length)));
  let sampled = false;
  const series: TimeSeriesSeries[] = shown.map(({ key, points }) => {
    const sorted = [...points].sort((a, b) => a.time - b.time || a.rowId - b.rowId);
    const seen = new Set<number>();
    for (const point of sorted) {
      if (seen.has(point.time)) duplicateTimestamps += 1;
      else seen.add(point.time);
    }
    let rendered = sorted;
    if (sorted.length > perSeriesCap) {
      sampled = true;
      const stride = sorted.length / perSeriesCap;
      rendered = [];
      for (let index = 0; index < perSeriesCap; index += 1) {
        const point = sorted[Math.floor(index * stride)];
        if (point) rendered.push(point);
      }
      const selected = options.includeRowId;
      if (
        selected !== null &&
        selected !== undefined &&
        sorted.some((point) => point.rowId === selected) &&
        !rendered.some((point) => point.rowId === selected)
      ) {
        const point = sorted.find((entry) => entry.rowId === selected);
        if (point) {
          if (rendered.length >= perSeriesCap) rendered.pop();
          rendered.push(point);
          rendered.sort((a, b) => a.time - b.time || a.rowId - b.rowId);
        }
      }
    }
    return {
      key,
      points: rendered,
      count: sorted.length,
      hasDuplicateTimestamps: seen.size !== sorted.length,
    };
  });

  return {
    series,
    invalidDates,
    missingValues,
    validCount,
    totalRows: rows.length,
    sampled,
    omittedCategories: Math.max(0, ranked.length - shown.length),
    minTime,
    maxTime,
    duplicateTimestamps,
  };
}
