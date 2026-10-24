import type { CategoryCount, DataColumn, DataRow } from "@/types";

export interface NumericStats {
  kind: "numeric";
  name: string;
  /** Count of finite numeric values. */
  count: number;
  /** Empty cells in the current row set. */
  missing: number;
  /** Non-empty cells that are not valid numbers. */
  invalid: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
}

export interface OtherStats {
  kind: "categorical" | "date" | "text" | "empty";
  name: string;
  count: number;
  missing: number;
  distinct: number;
  top: CategoryCount[];
}

export type ColumnStats = NumericStats | OtherStats;

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  const lower = sorted[middle - 1];
  const upper = sorted[middle];
  if (lower === undefined || upper === undefined) return null;
  return (lower + upper) / 2;
}

/**
 * Compute statistics over a specific set of rows. Callers memoize this; it is
 * never executed during render on every state change (see useDatasetView).
 */
export function computeStats(columns: DataColumn[], rows: DataRow[]): ColumnStats[] {
  return columns.map((column) => {
    if (column.type === "numeric") {
      let count = 0;
      let missing = 0;
      let invalid = 0;
      let sum = 0;
      let min: number | null = null;
      let max: number | null = null;
      const values: number[] = [];

      for (const row of rows) {
        const raw = (row.raw[column.index] ?? "").trim();
        if (raw === "") {
          missing += 1;
          continue;
        }
        const value = row.numeric[column.index];
        if (value === null || value === undefined || !Number.isFinite(value)) {
          invalid += 1;
          continue;
        }
        count += 1;
        sum += value;
        values.push(value);
        if (min === null || value < min) min = value;
        if (max === null || value > max) max = value;
      }

      values.sort((a, b) => a - b);
      return {
        kind: "numeric",
        name: column.name,
        count,
        missing,
        invalid,
        min,
        max,
        mean: count > 0 ? sum / count : null,
        median: median(values),
      };
    }

    const counts = new Map<string, number>();
    let missing = 0;
    for (const row of rows) {
      const raw = (row.raw[column.index] ?? "").trim();
      if (raw === "") {
        missing += 1;
        continue;
      }
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
      .slice(0, 12);

    return {
      kind: column.type === "empty" ? "empty" : column.type === "date" ? "date" : column.type === "text" ? "text" : "categorical",
      name: column.name,
      count: rows.length - missing,
      missing,
      distinct: counts.size,
      top,
    };
  });
}

export function isNumericStats(stats: ColumnStats): stats is NumericStats {
  return stats.kind === "numeric";
}
