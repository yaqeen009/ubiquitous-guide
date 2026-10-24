import type { DataColumn, DataRow } from "@/types";

export interface HistogramBin {
  index: number;
  start: number;
  end: number;
  /** Inclusive start, exclusive end except for the final bin. */
  count: number;
  label: string;
}

export interface DistributionSummary {
  count: number;
  missing: number;
  invalid: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  q1: number | null;
  q3: number | null;
}

export interface Histogram {
  bins: HistogramBin[];
  summary: DistributionSummary;
  binCount: number;
  /** True when every valid value is identical (a single meaningful bin). */
  constant: boolean;
  /** True when there are no valid values. */
  empty: boolean;
}

export type BinSetting = "auto" | 5 | 10 | 15 | 20 | 30;

function quantile(sorted: number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = sorted[lower];
  const high = sorted[upper];
  if (low === undefined || high === undefined) return null;
  return low + (high - low) * (position - lower);
}

function autoBinCount(n: number): number {
  if (n <= 1) return 1;
  return Math.max(5, Math.min(30, Math.ceil(Math.sqrt(n))));
}

/**
 * Build a histogram for one numeric column over the supplied rows.
 *
 * Empty cells are counted as missing; non-empty non-numeric cells are counted
 * as invalid. Both are excluded from the bins and summary, and reported
 * separately. Binning intentionally does not mutate the dataset.
 */
export function buildHistogram(rows: DataRow[], column: DataColumn, setting: BinSetting = "auto"): Histogram {
  const values: number[] = [];
  let missing = 0;
  let invalid = 0;

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
    values.push(value);
  }

  if (values.length === 0) {
    return {
      bins: [],
      summary: { count: 0, missing, invalid, min: null, max: null, mean: null, median: null, stdDev: null, q1: null, q3: null },
      binCount: 0,
      constant: false,
      empty: true,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? min;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  const constant = min === max;
  const count = setting === "auto" ? autoBinCount(values.length) : setting;
  const binCount = constant ? 1 : Math.max(1, Math.min(60, count));
  const width = constant ? 0 : (max - min) / binCount;
  const bins: HistogramBin[] = [];

  if (constant) {
    bins.push({
      index: 0,
      start: min,
      end: max,
      count: values.length,
      label: `${min}`,
    });
  } else {
    for (let index = 0; index < binCount; index += 1) {
      const start = min + width * index;
      const end = index === binCount - 1 ? max : start + width;
      bins.push({
        index,
        start,
        end,
        count: 0,
        label: `${start.toFixed(2)}–${end.toFixed(2)}`,
      });
    }
    for (const value of values) {
      const offset = Math.floor((value - min) / width);
      const index = Math.min(binCount - 1, Math.max(0, offset));
      const bin = bins[index];
      if (bin) bin.count += 1;
    }
  }

  return {
    bins,
    summary: {
      count: values.length,
      missing,
      invalid,
      min,
      max,
      mean,
      median: quantile(sorted, 0.5),
      stdDev: Math.sqrt(Math.max(0, variance)),
      q1: quantile(sorted, 0.25),
      q3: quantile(sorted, 0.75),
    },
    binCount,
    constant,
    empty: false,
  };
}

/** Bin width for the active histogram, or null for a constant/empty column. */
export function histogramBinWidth(histogram: Histogram): number | null {
  const first = histogram.bins[0];
  if (!first || histogram.constant) return null;
  return first.end - first.start;
}

/** One-line description that makes the binning explicit in the UI. */
export function describeHistogram(histogram: Histogram): string {
  if (histogram.empty) return "No valid numeric values in the filtered rows.";
  if (histogram.constant) return `All ${histogram.summary.count.toLocaleString()} values equal ${histogram.summary.min}.`;
  const width = histogramBinWidth(histogram);
  return `${histogram.binCount} bins${width === null ? "" : ` of ${width.toPrecision(3)}`} covering ${histogram.summary.min?.toPrecision(6)} to ${histogram.summary.max?.toPrecision(6)}.`;
}
