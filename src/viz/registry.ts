import type { ComponentType } from "react";
import type {
  DataColumn,
  Dataset,
  SelectionSemantics,
  ViewInstance,
  VisualizationCategory,
  VisualizationId,
} from "@/types";
import type { DatasetView } from "@/hooks/useDatasetView";
import { uid } from "@/lib/utils";
import { Scatter3DView } from "@/components/views/Scatter3DView";
import { Scatter2DView } from "@/components/views/Scatter2DView";
import { TableView } from "@/components/views/TableView";
import { TimeSeriesView } from "@/components/views/TimeSeriesView";
import { HistogramView } from "@/components/views/HistogramView";
import { CorrelationView } from "@/components/views/CorrelationView";
import { ParallelView } from "@/components/views/ParallelView";

export interface VisualizationProps {
  view: DatasetView;
  instance: ViewInstance;
}

export type FieldKind = "numeric" | "date" | "category";

export interface FieldDefinition {
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  hint?: string;
}

export interface VisualizationRequirement {
  kind: FieldKind;
  count: number;
  label: string;
}

export interface VisualizationCapabilities {
  /** Uses the shared categorical/numeric color encoding. */
  color: boolean;
  /** Uses the shared size encoding (scatter only). */
  size: boolean;
  tooltip: boolean;
  brushing: boolean;
  selection: SelectionSemantics;
}

export interface VisualizationDefinition {
  id: VisualizationId;
  name: string;
  shortName: string;
  description: string;
  usefulFor: string;
  category: VisualizationCategory;
  component: ComponentType<VisualizationProps>;
  fields: FieldDefinition[];
  requires: VisualizationRequirement[];
  capabilities: VisualizationCapabilities;
  selectionNote: string;
  defaultOptions: Record<string, string | number | boolean | null>;
}

export const VISUALIZATIONS: VisualizationDefinition[] = [
  {
    id: "scatter3d",
    name: "3D scatter plot",
    shortName: "3D scatter",
    description: "Places each record in a three-dimensional numeric space with orbit navigation.",
    usefulFor: "Spotting clusters, gradients, and outliers across three measures at once.",
    category: "Spatial",
    component: Scatter3DView,
    fields: [
      { key: "x", label: "X axis", kind: "numeric", required: true },
      { key: "y", label: "Y axis", kind: "numeric", required: true },
      { key: "z", label: "Z axis", kind: "numeric", required: false, hint: "Optional; omitted axes sit at the center." },
    ],
    requires: [{ kind: "numeric", count: 2, label: "numeric columns" }],
    capabilities: { color: true, size: true, tooltip: true, brushing: false, selection: "record" },
    selectionNote: "Clicking a point selects that record. Rotating the camera does not change selection.",
    defaultOptions: {},
  },
  {
    id: "scatter2d",
    name: "2D scatter plot",
    shortName: "2D scatter",
    description: "A flat, keyboard-friendly scatter plot with axes and per-point tooltips.",
    usefulFor: "Reading precise values and relationships without a 3D camera.",
    category: "Relationship",
    component: Scatter2DView,
    fields: [
      { key: "x", label: "X axis", kind: "numeric", required: true },
      { key: "y", label: "Y axis", kind: "numeric", required: true },
    ],
    requires: [{ kind: "numeric", count: 2, label: "numeric columns" }],
    capabilities: { color: true, size: true, tooltip: true, brushing: false, selection: "record" },
    selectionNote: "Clicking a point selects that record. The same record is highlighted in every open view.",
    defaultOptions: {},
  },
  {
    id: "table",
    name: "Data table",
    shortName: "Table",
    description: "A sortable, paginated table of the filtered records with original cell values.",
    usefulFor: "Checking exact values, sorting, and selecting records that overlap in a chart.",
    category: "Tabular",
    component: TableView,
    fields: [],
    requires: [],
    capabilities: { color: false, size: false, tooltip: false, brushing: false, selection: "record" },
    selectionNote: "Clicking a row selects one record. Checkboxes add records to the shared multi-selection.",
    defaultOptions: { pageSize: 50 },
  },
  {
    id: "timeseries",
    name: "Time series",
    shortName: "Time series",
    description: "Plots a numeric measure over a date or timestamp field, optionally split by category.",
    usefulFor: "Trends, seasonality, gaps, and synchronized changes across groups.",
    category: "Temporal",
    component: TimeSeriesView,
    fields: [
      { key: "date", label: "Time field", kind: "date", required: true },
      { key: "value", label: "Measure", kind: "numeric", required: true },
      { key: "category", label: "Split by", kind: "category", required: false, hint: "Optional. Missing categories become their own line." },
    ],
    requires: [
      { kind: "date", count: 1, label: "date column" },
      { kind: "numeric", count: 1, label: "numeric column" },
    ],
    capabilities: { color: true, size: false, tooltip: true, brushing: false, selection: "record" },
    selectionNote: "Clicking a dot selects that record. Duplicate timestamps remain separate dots and are reported.",
    defaultOptions: { maxSeries: 6 },
  },
  {
    id: "histogram",
    name: "Histogram",
    shortName: "Histogram",
    description: "Shows the distribution of one numeric field with explicit bins and summary statistics.",
    usefulFor: "Checking skew, spread, outliers, and how filters change a distribution.",
    category: "Distribution",
    component: HistogramView,
    fields: [{ key: "value", label: "Numeric field", kind: "numeric", required: true }],
    requires: [{ kind: "numeric", count: 1, label: "numeric column" }],
    capabilities: { color: false, size: false, tooltip: true, brushing: false, selection: "filter" },
    selectionNote: "A bar is an aggregate. Clicking it applies that bin's numeric range as a workspace filter; it never pretends to select individual records.",
    defaultOptions: { bins: "auto" },
  },
  {
    id: "correlation",
    name: "Correlation heatmap",
    shortName: "Correlation",
    description: "Pairwise Pearson correlations between numeric columns with pairwise-complete observations.",
    usefulFor: "Finding redundant measures and strong positive or negative relationships before choosing axes.",
    category: "Relationship",
    component: CorrelationView,
    fields: [],
    requires: [{ kind: "numeric", count: 2, label: "numeric columns" }],
    capabilities: { color: false, size: false, tooltip: true, brushing: false, selection: "none" },
    selectionNote: "Cells aggregate a column pair. They do not select records; missing correlations are distinct from zero.",
    defaultOptions: { maxColumns: 8 },
  },
  {
    id: "parallel",
    name: "Parallel coordinates",
    shortName: "Parallel",
    description: "Traces each record across several normalized numeric axes with range brushing.",
    usefulFor: "Finding multivariate patterns and records inside ranges across many measures.",
    category: "Relationship",
    component: ParallelView,
    fields: [
      { key: "d1", label: "Axis 1", kind: "numeric", required: true },
      { key: "d2", label: "Axis 2", kind: "numeric", required: true },
      { key: "d3", label: "Axis 3", kind: "numeric", required: false },
      { key: "d4", label: "Axis 4", kind: "numeric", required: false },
      { key: "d5", label: "Axis 5", kind: "numeric", required: false },
    ],
    requires: [{ kind: "numeric", count: 2, label: "numeric columns" }],
    capabilities: { color: true, size: false, tooltip: true, brushing: true, selection: "multiple" },
    selectionNote: "Dragging vertically on an axis brushes a range. Brushing highlights records; use “Select brushed” to publish them to the shared selection.",
    defaultOptions: {},
  },
];

const BY_ID = new Map(VISUALIZATIONS.map((definition) => [definition.id, definition]));

export function visualizationById(id: VisualizationId): VisualizationDefinition | undefined {
  return BY_ID.get(id);
}

export function isVisualizationId(value: unknown): value is VisualizationId {
  return typeof value === "string" && BY_ID.has(value as VisualizationId);
}

export function columnsForKind(dataset: Dataset, kind: FieldKind, hidden: string[] = []): DataColumn[] {
  return dataset.columns.filter((column) => {
    if (hidden.includes(column.name)) return false;
    if (kind === "numeric") return column.type === "numeric";
    if (kind === "date") return column.type === "date";
    return column.type === "categorical" || column.type === "date" || column.type === "text";
  });
}

export function columnForKind(dataset: Dataset, name: string | null | undefined, kind: FieldKind): DataColumn | null {
  if (!name) return null;
  const column = dataset.columns.find((candidate) => candidate.name === name);
  if (!column) return null;
  if (kind === "numeric") return column.type === "numeric" ? column : null;
  if (kind === "date") return column.type === "date" ? column : null;
  return column.type === "categorical" || column.type === "date" || column.type === "text" ? column : null;
}

export interface CompatibilityIssue {
  kind: FieldKind;
  required: number;
  available: number;
  label: string;
}

export interface Compatibility {
  available: boolean;
  issues: CompatibilityIssue[];
  message: string;
  alternative: VisualizationId | null;
}

function compatibilityIssues(
  definition: VisualizationDefinition,
  dataset: Dataset,
  hidden: string[],
): CompatibilityIssue[] {
  return definition.requires
    .map((requirement) => {
      const available = columnsForKind(dataset, requirement.kind, hidden).length;
      return {
        kind: requirement.kind,
        required: requirement.count,
        available,
        label: requirement.label,
      };
    })
    .filter((issue) => issue.available < issue.required);
}

function isAvailable(definition: VisualizationDefinition, dataset: Dataset, hidden: string[]): boolean {
  return compatibilityIssues(definition, dataset, hidden).length === 0;
}

export function evaluateCompatibility(
  definition: VisualizationDefinition,
  dataset: Dataset,
  hidden: string[] = [],
): Compatibility {
  const issues = compatibilityIssues(definition, dataset, hidden);

  if (issues.length === 0) {
    return { available: true, issues: [], message: "", alternative: null };
  }

  const message = issues
    .map(
      (issue) =>
        `${issue.required} ${issue.label} required; ${issue.available} ${issue.available === 1 ? "is" : "are"} available${
          hidden.length > 0 ? " after column exclusions" : ""
        }.`,
    )
    .join(" ");

  const candidates = VISUALIZATIONS.filter((candidate) => candidate.id !== definition.id)
    .sort((left, right) => {
      if (left.id === "table") return -1;
      if (right.id === "table") return 1;
      return left.requires.length - right.requires.length;
    })
    .filter((candidate) => isAvailable(candidate, dataset, hidden));

  return {
    available: false,
    issues,
    message,
    alternative: candidates[0]?.id ?? null,
  };
}

/** Seed a new view with valid, non-empty field mappings where possible. */
export function createDefaultView(
  type: VisualizationId,
  dataset: Dataset,
  hidden: string[] = [],
  suggestedAxes?: { x?: string | null; y?: string | null; z?: string | null },
): ViewInstance {
  const definition = visualizationById(type);
  if (!definition) throw new Error(`Unknown visualization type: ${type}`);
  const numeric = columnsForKind(dataset, "numeric", hidden);
  const dates = columnsForKind(dataset, "date", hidden);
  const fields: Record<string, string | null> = {};
  const numericAt = (index: number) => numeric[index]?.name ?? null;

  if (type === "scatter3d") {
    fields.x = suggestedAxes?.x && numeric.some((column) => column.name === suggestedAxes.x) ? suggestedAxes.x : numericAt(0);
    fields.y = suggestedAxes?.y && numeric.some((column) => column.name === suggestedAxes.y) ? suggestedAxes.y : numericAt(1);
    fields.z = suggestedAxes?.z && numeric.some((column) => column.name === suggestedAxes.z) ? suggestedAxes.z : numericAt(2);
  } else if (type === "scatter2d") {
    fields.x = suggestedAxes?.x && numeric.some((column) => column.name === suggestedAxes.x) ? suggestedAxes.x : numericAt(0);
    fields.y = suggestedAxes?.y && numeric.some((column) => column.name === suggestedAxes.y) ? suggestedAxes.y : numericAt(1);
  } else if (type === "timeseries") {
    fields.date = dates[0]?.name ?? null;
    fields.value = numericAt(0);
    fields.category = null;
  } else if (type === "histogram") {
    fields.value = numericAt(0);
  } else if (type === "parallel") {
    for (let index = 0; index < 5; index += 1) {
      fields[`d${index + 1}`] = numericAt(index);
    }
  }

  return {
    id: uid(),
    type,
    fields,
    options: { ...definition.defaultOptions },
  };
}

export interface NormalizedView {
  view: ViewInstance | null;
  warnings: string[];
}

/**
 * Validate one view instance against a dataset. Unknown types and missing
 * required fields are recoverable: the view is dropped with a warning, while
 * unknown optional fields are ignored.
 */
export function normalizeViewInstance(input: unknown, dataset: Dataset, hidden: string[] = []): NormalizedView {
  const warnings: string[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { view: null, warnings: ["A view entry was not an object and was skipped."] };
  }
  const record = input as Record<string, unknown>;
  if (!isVisualizationId(record.type)) {
    warnings.push(`Unknown visualization type “${String(record.type)}” was skipped.`);
    return { view: null, warnings };
  }
  const definition = visualizationById(record.type);
  if (!definition) return { view: null, warnings };

  const fields: Record<string, string | null> = {};
  const inputFields = typeof record.fields === "object" && record.fields !== null && !Array.isArray(record.fields)
    ? (record.fields as Record<string, unknown>)
    : {};
  for (const field of definition.fields) {
    const candidate = inputFields[field.key];
    if (candidate === null || candidate === undefined) {
      fields[field.key] = null;
      continue;
    }
    if (typeof candidate !== "string") {
      warnings.push(`${definition.name}: ${field.label} was not a column name and was cleared.`);
      fields[field.key] = null;
      continue;
    }
    if (hidden.includes(candidate) || !columnForKind(dataset, candidate, field.kind)) {
      warnings.push(`${definition.name}: ${field.label} “${candidate}” is not an available ${field.kind} column and was cleared.`);
      fields[field.key] = null;
      continue;
    }
    fields[field.key] = candidate;
  }

  const missingRequired = definition.fields.filter((field) => field.required && !fields[field.key]);
  if (missingRequired.length > 0) {
    warnings.push(
      `${definition.name} was skipped because required ${missingRequired.map((field) => field.label.toLowerCase()).join(", ")} ${
        missingRequired.length === 1 ? "is" : "are"
      } missing for this dataset.`,
    );
    return { view: null, warnings };
  }

  const options: ViewInstance["options"] = { ...definition.defaultOptions };
  if (typeof record.options === "object" && record.options !== null && !Array.isArray(record.options)) {
    for (const [key, value] of Object.entries(record.options as Record<string, unknown>)) {
      if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        if (Number.isFinite(value as number) || typeof value !== "number") options[key] = value as string | number | boolean | null;
      }
    }
  }

  const id = typeof record.id === "string" && record.id.length > 0 ? record.id : uid();
  const title = typeof record.title === "string" && record.title.trim() ? record.title.trim().slice(0, 80) : undefined;
  return {
    view: { id, type: record.type, ...(title ? { title } : {}), fields, options },
    warnings,
  };
}
