import type { DataColumn, DataRow } from "@/types";

export type CorrelationMethod = "pearson";

export interface CorrelationCell {
  row: string;
  column: string;
  /** Pearson r in [-1, 1], or null when the pair has insufficient variation. */
  value: number | null;
  /** Number of rows with both values present in the analysed subset. */
  pairs: number;
}

export interface CorrelationMatrix {
  method: CorrelationMethod;
  columns: string[];
  cells: CorrelationCell[];
  /** Rows available to the calculation (before pairwise removal). */
  rowCount: number;
  /** Rows actually inspected after deterministic sampling. */
  sampleCount: number;
  sampled: boolean;
}

const MAX_CORRELATION_ROWS = 2_000;

/**
 * Pearson correlation computed pairwise over complete observations.
 *
 * Missing values are removed per pair rather than row-wise, so a column with a
 * few gaps still contributes to every pair it can. A null result means the
 * pair was constant, had fewer than three observations, or had non-finite
 * values; it is never reported as zero.
 */
export function correlationOf(row: DataRow[], left: DataColumn, right: DataColumn) {
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (const record of row) {
    const x = record.numeric[left.index];
    const y = record.numeric[right.index];
    if (x === null || x === undefined || y === null || y === undefined) continue;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    n += 1;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }

  if (n < 3) return { value: null, pairs: n };
  const numerator = n * sxy - sx * sy;
  const denominator = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  if (!Number.isFinite(denominator) || denominator === 0) return { value: null, pairs: n };
  return { value: numerator / denominator, pairs: n };
}

/** Deterministic evenly-spaced sample used only for expensive matrix work. */
function sampleForMatrix(rows: DataRow[]): { rows: DataRow[]; sampled: boolean } {
  if (rows.length <= MAX_CORRELATION_ROWS) return { rows, sampled: false };
  const stride = rows.length / MAX_CORRELATION_ROWS;
  const sample: DataRow[] = [];
  for (let index = 0; index < MAX_CORRELATION_ROWS; index += 1) {
    const record = rows[Math.floor(index * stride)];
    if (record) sample.push(record);
  }
  return { rows: sample, sampled: true };
}

export function buildCorrelationMatrix(
  columns: DataColumn[],
  rows: DataRow[],
): CorrelationMatrix {
  const sample = sampleForMatrix(rows);
  const cells: CorrelationCell[] = [];
  for (const left of columns) {
    for (const right of columns) {
      if (left === right) {
        const pairs = sample.rows.reduce((total, record) => {
          const value = record.numeric[left.index];
          return value === null || value === undefined || !Number.isFinite(value) ? total : total + 1;
        }, 0);
        cells.push({ row: left.name, column: right.name, value: 1, pairs });
        continue;
      }
      const result = correlationOf(sample.rows, left, right);
      cells.push({ row: left.name, column: right.name, value: result.value, pairs: result.pairs });
    }
  }
  return {
    method: "pearson",
    columns: columns.map((column) => column.name),
    cells,
    rowCount: rows.length,
    sampleCount: sample.rows.length,
    sampled: sample.sampled,
  };
}

/** Diverging, colour-blind-friendly correlation colour. Null is grey. */
export function correlationColor(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "#b9b5aa";
  const magnitude = Math.min(1, Math.abs(value));
  if (value >= 0) {
    const start = [247, 246, 240] as const;
    const end = [43, 88, 140] as const;
    return rgb(start, end, magnitude);
  }
  const start = [247, 246, 240] as const;
  const end = [166, 76, 44] as const;
  return rgb(start, end, magnitude);
}

function rgb(start: readonly [number, number, number], end: readonly [number, number, number], t: number): string {
  const channels = start.map((channel, index) => Math.round(channel + ((end[index] ?? channel) - channel) * t));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function correlationText(value: number | null): string {
  if (value === null) return "n/a";
  return value.toFixed(2);
}
