import type { DataRow } from "@/types";

export interface SampleResult {
  rows: DataRow[];
  sampled: boolean;
  total: number;
}

/**
 * Deterministic, evenly-spaced sampling for rendering only.
 *
 * Filtering, statistics, and CSV export always use the full filtered row set.
 * If a selected row falls outside the sample it is appended so the highlight
 * remains visible.
 */
export function sampleRows(rows: DataRow[], cap: number, includeId?: number | null): SampleResult {
  if (rows.length <= cap) return { rows, sampled: false, total: rows.length };
  const stride = rows.length / cap;
  const sampled: DataRow[] = [];
  for (let index = 0; index < cap; index += 1) {
    const row = rows[Math.floor(index * stride)];
    if (row) sampled.push(row);
  }
  if (includeId !== undefined && includeId !== null && !sampled.some((row) => row.id === includeId)) {
    const selected = rows.find((row) => row.id === includeId);
    if (selected) {
      if (sampled.length === cap) sampled.pop();
      sampled.push(selected);
    }
  }
  return { rows: sampled, sampled: true, total: rows.length };
}
