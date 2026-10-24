/** Shared domain types for DataSpace. */

export type ColumnType = "numeric" | "categorical" | "date" | "text" | "empty";

export type DatasetSource = "demo" | "upload";

export interface CategoryCount {
  value: string;
  count: number;
}

export interface DataColumn {
  name: string;
  index: number;
  type: ColumnType;
  /** Number of rows where the cell is empty or whitespace-only. */
  missingCount: number;
  /** Non-empty values that cannot be parsed for a numeric column. */
  invalidNumericCount: number;
  distinctCount: number;
  /** Numeric extent over valid values. Null for non-numeric or empty columns. */
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  /** Top categories (max 40) for categorical columns. */
  categories: CategoryCount[];
}

export interface DataRow {
  /** Stable, zero-based identifier assigned at import time. */
  id: number;
  /** Original cell strings, aligned with `Dataset.columns`. */
  raw: string[];
  /**
   * Parsed numeric values aligned with `Dataset.columns`.
   * `null` means the cell was empty or not a valid number. Only numeric
   * columns are populated; all other entries are null.
   */
  numeric: (number | null)[];
}

export interface Dataset {
  name: string;
  source: DatasetSource;
  columns: DataColumn[];
  rows: DataRow[];
  /** Row-level problems surfaced during import (truncated after a limit). */
  warnings: string[];
  /** Number of rows rejected because they had the wrong number of fields. */
  rejectedRows: number;
  importedAt: string;
  /** Lowercased, space-joined cell text used by the search filter. */
  searchIndex: string[];
}

export interface NumericFilter {
  min: number;
  max: number;
}

export interface Filters {
  search: string;
  /** Only columns with an active range are present. */
  numeric: Record<string, NumericFilter>;
  /** Empty arrays mean "no categorical restriction". */
  categorical: Record<string, string[]>;
}

export type ColorMode = "none" | "numeric" | "categorical";

export interface ColorSettings {
  mode: ColorMode;
  column: string | null;
}

export interface SizeSettings {
  enabled: boolean;
  column: string | null;
}

export interface AxisSettings {
  x: string | null;
  y: string | null;
  z: string | null;
}

export interface DisplaySettings {
  pointSize: number;
  opacity: number;
}

export type ViewLayout = "3d" | "2d" | "split";

export interface VisualizationConfig {
  version: 1;
  axes: AxisSettings;
  twoD: { x: string | null; y: string | null };
  color: ColorSettings;
  size: SizeSettings;
  display: DisplaySettings;
  filters: Filters;
  layout: ViewLayout;
  /** Columns excluded from axis, color, size, and filter choices. Data is retained. */
  hiddenColumns: string[];
}

/** Serializable settings snapshot written by "Save configuration". */
export interface SavedConfiguration extends VisualizationConfig {
  kind: "dataspace-configuration";
  datasetName: string;
  columnNames: string[];
  savedAt: string;
}

export interface ImportIssue {
  row: number;
  message: string;
}

export interface ParseResult {
  dataset: Dataset;
  issues: ImportIssue[];
}
