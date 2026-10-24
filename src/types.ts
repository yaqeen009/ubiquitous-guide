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
  /**
   * Parsed epoch milliseconds for date-like columns, aligned with
   * `Dataset.columns`. Optional so lightweight test fixtures and older saved
   * data remain valid; consumers fall back to parsing `raw` when absent.
   */
  dates?: (number | null)[];
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

/** Epoch-millisecond range applied to a date/timestamp column. */
export type TimeFilter = NumericFilter;

export interface Filters {
  search: string;
  /** Only columns with an active range are present. */
  numeric: Record<string, NumericFilter>;
  /** Empty arrays mean "no categorical restriction". */
  categorical: Record<string, string[]>;
  /** Optional epoch-millisecond ranges for date columns. */
  time?: Record<string, TimeFilter>;
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

/* ------------------------------------------------------------------ *
 * Multiview workspace
 * ------------------------------------------------------------------ */

export type VisualizationId =
  | "scatter3d"
  | "scatter2d"
  | "table"
  | "timeseries"
  | "histogram"
  | "correlation"
  | "parallel";

export type VisualizationCategory = "Spatial" | "Distribution" | "Relationship" | "Temporal" | "Tabular";

/**
 * How an interaction maps into the shared selection state.
 *
 * - `record`: one unambiguous record per interaction.
 * - `multiple`: a batch of records (for example brushing).
 * - `filter`: applies a range filter; it does not select records.
 * - `none`: no record-level selection (aggregate or purely visual output).
 */
export type SelectionSemantics = "record" | "multiple" | "filter" | "none";

export type ViewOptionValue = string | number | boolean | null;

/** One open view. Field names are visualization-specific and validated by the registry. */
export interface ViewInstance {
  id: string;
  type: VisualizationId;
  title?: string;
  fields: Record<string, string | null>;
  options: Record<string, ViewOptionValue>;
}

export type WorkspaceLayout = "single" | "columns" | "grid";

export interface WorkspaceStateSnapshot {
  panels: ViewInstance[];
  layout: WorkspaceLayout;
  activePanelId: string | null;
  maximizedPanelId: string | null;
  /** Fraction of the available width given to the first pane in `columns` layout. */
  splitRatio: number;
}

/** Version 2 workspace export. Embeds shared analytical settings, never the data. */
export interface SavedWorkspace extends WorkspaceStateSnapshot {
  kind: "dataspace-workspace";
  version: 2;
  datasetName: string;
  columnNames: string[];
  savedAt: string;
  visualization: VisualizationConfig;
  spatialMode: boolean;
}

export interface ImportIssue {
  row: number;
  message: string;
}

export interface ParseResult {
  dataset: Dataset;
  issues: ImportIssue[];
}
