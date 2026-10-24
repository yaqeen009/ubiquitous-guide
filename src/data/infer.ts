import type { CategoryCount, DataColumn, ColumnType } from "@/types";
import { isDateLike, isMissingCell, parseDateValue, parseNumericValue } from "./numeric";

/** Numeric values collected for one column, aligned to the input rows. */
export interface ColumnAnalysis {
  column: DataColumn;
  parsed: (number | null)[];
  /** Parsed epoch milliseconds for date-like cells (null elsewhere). */
  parsedDates: (number | null)[];
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  const lower = sorted[middle - 1];
  const upper = sorted[middle];
  if (lower === undefined || upper === undefined) return null;
  return (lower + upper) / 2;
}

function topCategories(counts: Map<string, number>, limit = 40): CategoryCount[] {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

/**
 * Analyze one column and infer its type.
 *
 * Inference is based on the full column, not a sample, so a numeric column with
 * occasional `N/A` entries is still numeric (and the invalid cells are counted).
 */
export function analyzeColumn(name: string, index: number, cells: string[]): ColumnAnalysis {
  const nonEmpty: string[] = [];
  const counts = new Map<string, number>();
  let missingCount = 0;
  let invalidNumericCount = 0;
  let dateLikeCount = 0;
  const numericValues: number[] = [];
  const parsed: (number | null)[] = new Array(cells.length).fill(null);
  const parsedDates: (number | null)[] = new Array(cells.length).fill(null);

  for (let row = 0; row < cells.length; row += 1) {
    const cell = cells[row] ?? "";
    if (isMissingCell(cell)) {
      missingCount += 1;
      continue;
    }
    const trimmed = cell.trim();
    nonEmpty.push(trimmed);
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    const numeric = parseNumericValue(trimmed);
    if (numeric !== null) {
      numericValues.push(numeric);
      parsed[row] = numeric;
    } else {
      invalidNumericCount += 1;
    }
    if (isDateLike(trimmed)) {
      dateLikeCount += 1;
      parsedDates[row] = parseDateValue(trimmed);
    }
  }

  const presentCount = nonEmpty.length;
  const numericRatio = presentCount === 0 ? 0 : numericValues.length / presentCount;
  const dateRatio = presentCount === 0 ? 0 : dateLikeCount / presentCount;
  const distinctCount = counts.size;

  let type: ColumnType;
  if (presentCount === 0) {
    type = "empty";
  } else if (numericRatio >= 0.9) {
    type = "numeric";
  } else if (dateRatio >= 0.9) {
    type = "date";
  } else if (distinctCount <= Math.max(12, Math.ceil(presentCount * 0.05))) {
    type = "categorical";
  } else {
    type = "text";
  }

  let min: number | null = null;
  let max: number | null = null;
  let mean: number | null = null;
  let medianValue: number | null = null;

  if (type === "numeric" && numericValues.length > 0) {
    let sum = 0;
    for (const value of numericValues) {
      if (min === null || value < min) min = value;
      if (max === null || value > max) max = value;
      sum += value;
    }
    mean = sum / numericValues.length;
    const sorted = [...numericValues].sort((a, b) => a - b);
    medianValue = median(sorted);
  }

  const column: DataColumn = {
    name,
    index,
    type,
    missingCount,
    invalidNumericCount: type === "numeric" ? invalidNumericCount : 0,
    distinctCount,
    min,
    max,
    mean,
    median: medianValue,
    categories:
      type === "categorical" || type === "text" || type === "date"
        ? topCategories(counts)
        : [],
  };

  return {
    column,
    parsed,
    parsedDates: type === "date" ? parsedDates : new Array(cells.length).fill(null),
  };
}

/** Short explanation of the inference result, used in the column inspector. */
export function describeColumnType(column: DataColumn): string {
  switch (column.type) {
    case "numeric":
      return "Numeric — available for axes, color, and size";
    case "categorical":
      return "Categorical — available for color and filters";
    case "date":
      return "Date-like — available for categorical filters";
    case "text":
      return "Text — free-text search only";
    case "empty":
      return "Empty — no usable values";
  }
}
