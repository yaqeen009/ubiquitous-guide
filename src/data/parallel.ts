import type { DataColumn, DataRow } from "@/types";

export interface ParallelDimension {
  name: string;
  min: number;
  max: number;
  constant: boolean;
}

export interface ParallelRecord {
  rowId: number;
  /** Normalized values in [0, 1], one per dimension. */
  values: number[];
  /** Original numeric values, aligned with dimensions. */
  rawValues: number[];
  category: string;
}

export interface ParallelData {
  dimensions: ParallelDimension[];
  /** Deterministically sampled records used for drawing. */
  records: ParallelRecord[];
  /** Every complete filtered record, used for brushing and selection. */
  allRecords: ParallelRecord[];
  total: number;
  sampled: boolean;
  skipped: number;
}

export interface ParallelBrush {
  [dimension: string]: { min: number; max: number };
}

function categoryFor(row: DataRow, column: DataColumn | null): string {
  if (!column) return "";
  return (row.raw[column.index] ?? "").trim();
}

/**
 * Build normalized parallel-coordinate records.
 *
 * Normalization uses each column's full-dataset extent, so brushing and axis
 * positions stay stable while filters change. Records missing any selected
 * dimension are skipped and counted. Rendering is sampled deterministically,
 * while brushing and record selection use every complete filtered row.
 */
export function buildParallelData(
  rows: DataRow[],
  columns: DataColumn[],
  categoryColumn: DataColumn | null,
  cap = 2_000,
  includeRowId?: number | null,
): ParallelData {
  const dimensions: ParallelDimension[] = columns.map((column) => {
    const min = column.min ?? 0;
    const max = column.max ?? min;
    return { name: column.name, min, max, constant: min === max };
  });

  const complete: ParallelRecord[] = [];
  let skipped = 0;
  for (const row of rows) {
    const rawValues: number[] = [];
    let valid = true;
    for (const column of columns) {
      const value = row.numeric[column.index];
      if (value === null || value === undefined || !Number.isFinite(value)) {
        valid = false;
        break;
      }
      rawValues.push(value);
    }
    if (!valid) {
      skipped += 1;
      continue;
    }
    const values = rawValues.map((value, index) => {
      const dimension = dimensions[index];
      if (!dimension || dimension.max === dimension.min) return 0.5;
      return (value - dimension.min) / (dimension.max - dimension.min);
    });
    complete.push({
      rowId: row.id,
      values,
      rawValues,
      category: categoryFor(row, categoryColumn),
    });
  }

  const sampled = complete.length > cap;
  let rendered = complete;
  if (sampled) {
    const stride = complete.length / cap;
    rendered = [];
    for (let index = 0; index < cap; index += 1) {
      const record = complete[Math.floor(index * stride)];
      if (record) rendered.push(record);
    }
    if (includeRowId !== null && includeRowId !== undefined && !rendered.some((record) => record.rowId === includeRowId)) {
      const selected = complete.find((record) => record.rowId === includeRowId);
      if (selected) {
        if (rendered.length >= cap) rendered.pop();
        rendered.push(selected);
      }
    }
  }

  return {
    dimensions,
    records: rendered,
    allRecords: complete,
    total: complete.length,
    sampled,
    skipped,
  };
}

/** True when a record lies inside every brushed dimension. */
export function recordMatchesBrush(record: ParallelRecord, dimensions: ParallelDimension[], brush: ParallelBrush): boolean {
  for (let index = 0; index < dimensions.length; index += 1) {
    const dimension = dimensions[index];
    if (!dimension) continue;
    const range = brush[dimension.name];
    if (!range) continue;
    const value = record.rawValues[index];
    if (value === undefined) return false;
    if (value < range.min || value > range.max) return false;
  }
  return true;
}

export function brushIsActive(brush: ParallelBrush): boolean {
  return Object.keys(brush).length > 0;
}

/** Convert a normalized [0,1] drag to an original-unit range for an axis. */
export function brushRangeFor(dimension: ParallelDimension, from: number, to: number): { min: number; max: number } {
  const low = Math.min(from, to);
  const high = Math.max(from, to);
  const span = dimension.max - dimension.min;
  if (span === 0) return { min: dimension.min, max: dimension.max };
  return {
    min: dimension.min + span * Math.max(0, Math.min(1, low)),
    max: dimension.min + span * Math.max(0, Math.min(1, high)),
  };
}
