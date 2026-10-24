import type {
  AxisSettings,
  ColorMode,
  DataColumn,
  Dataset,
  Filters,
  SavedConfiguration,
  SavedConfiguration as SavedConfig,
  VisualizationConfig,
  ViewLayout,
} from "@/types";
import { createEmptyFilters } from "./filters";

export const CONFIG_VERSION = 1 as const;

interface ValidationSuccess {
  ok: true;
  config: VisualizationConfig;
  warnings: string[];
}

interface ValidationFailure {
  ok: false;
  errors: string[];
}

export type ConfigValidation = ValidationSuccess | ValidationFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isColumnRef(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0);
}

const COLOR_MODES: ColorMode[] = ["none", "numeric", "categorical"];
const LAYOUTS: ViewLayout[] = ["3d", "2d", "split"];

/**
 * Pearson correlation over a bounded, evenly-spaced sample of rows.
 * Returns null when either column is constant or has too few paired values.
 */
export function pearsonCorrelation(dataset: Dataset, left: DataColumn, right: DataColumn): number | null {
  const maxRows = 800;
  const stride = Math.max(1, Math.floor(dataset.rows.length / maxRows));
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let index = 0; index < dataset.rows.length; index += stride) {
    const row = dataset.rows[index];
    if (!row) continue;
    const x = row.numeric[left.index];
    const y = row.numeric[right.index];
    if (x === null || x === undefined || y === null || y === undefined) continue;
    n += 1;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  if (n < 3) return null;
  const numerator = n * sxy - sx * sy;
  const denominator = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Pick an initial 3D mapping that is not visually degenerate: keep the first
 * numeric column as X, then choose Y and Z with the least correlation to the
 * dimensions already chosen. Constant columns are used only as a fallback.
 */
export function chooseDefaultAxes(dataset: Dataset): { x: string | null; y: string | null; z: string | null } {
  const numeric = dataset.columns.filter((column) => column.type === "numeric");
  if (numeric.length === 0) return { x: null, y: null, z: null };
  const varying = numeric.filter((column) => column.min !== null && column.max !== null && column.max > column.min);
  const candidates = varying.length >= Math.min(3, numeric.length) ? varying : numeric;
  const x = candidates[0];
  if (!x) return { x: null, y: null, z: null };
  const remaining = candidates.slice(1);
  const y = remaining
    .map((column) => ({ column, score: Math.abs(pearsonCorrelation(dataset, x, column) ?? 0) }))
    .sort((a, b) => a.score - b.score)[0]?.column;
  const z = remaining
    .filter((column) => column !== y)
    .map((column) => ({
      column,
      score:
        Math.abs(pearsonCorrelation(dataset, x, column) ?? 0) +
        (y ? Math.abs(pearsonCorrelation(dataset, y, column) ?? 0) : 0),
    }))
    .sort((a, b) => a.score - b.score)[0]?.column;
  return { x: x.name, y: y?.name ?? null, z: z?.name ?? null };
}

/** Choose sensible initial mappings for a newly imported dataset. */
export function createDefaultConfig(dataset: Dataset): VisualizationConfig {
  const categorical = dataset.columns.find(
    (column) => column.type === "categorical" && column.distinctCount > 1,
  );
  const axes: AxisSettings = chooseDefaultAxes(dataset);
  return {
    version: CONFIG_VERSION,
    axes,
    twoD: { x: axes.x, y: axes.y },
    color: categorical ? { mode: "categorical", column: categorical.name } : { mode: "none", column: null },
    size: { enabled: false, column: null },
    display: { pointSize: 4.5, opacity: 0.85 },
    filters: createEmptyFilters(),
    layout: "3d",
    hiddenColumns: [],
  };
}

function parseNumericFilter(value: unknown, name: string, errors: string[]): { min: number; max: number } | null {
  if (!isRecord(value)) {
    errors.push(`Numeric filter for “${name}” must be an object with min and max.`);
    return null;
  }
  const min = value.min;
  const max = value.max;
  if (typeof min !== "number" || !Number.isFinite(min) || typeof max !== "number" || !Number.isFinite(max)) {
    errors.push(`Numeric filter for “${name}” must have finite numeric min and max values.`);
    return null;
  }
  if (min > max) {
    errors.push(`Numeric filter for “${name}” has min greater than max.`);
    return null;
  }
  return { min, max };
}

function parseFilters(value: unknown, errors: string[]): Filters {
  if (!isRecord(value)) {
    errors.push("“filters” must be an object.");
    return createEmptyFilters();
  }
  const search = typeof value.search === "string" ? value.search : "";
  if (value.search !== undefined && typeof value.search !== "string") {
    errors.push("“filters.search” must be a string.");
  }

  const numeric: Filters["numeric"] = {};
  if (value.numeric !== undefined) {
    if (!isRecord(value.numeric)) {
      errors.push("“filters.numeric” must be an object.");
    } else {
      for (const [name, range] of Object.entries(value.numeric)) {
        const parsed = parseNumericFilter(range, name, errors);
        if (parsed) numeric[name] = parsed;
      }
    }
  }

  const categorical: Filters["categorical"] = {};
  if (value.categorical !== undefined) {
    if (!isRecord(value.categorical)) {
      errors.push("“filters.categorical” must be an object.");
    } else {
      for (const [name, selected] of Object.entries(value.categorical)) {
        if (!Array.isArray(selected) || selected.some((entry) => typeof entry !== "string")) {
          errors.push(`Categorical filter for “${name}” must be an array of strings.`);
          continue;
        }
        categorical[name] = [...new Set(selected as string[])];
      }
    }
  }

  return { search, numeric, categorical };
}

/**
 * Validate and normalize an imported visualization configuration.
 *
 * Unknown fields are ignored, but malformed known fields are errors. When a
 * dataset is supplied, column references are checked for existence and type.
 */
export function parseVisualizationConfig(input: unknown, dataset?: Dataset): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(input)) return { ok: false, errors: ["Configuration must be a JSON object."] };
  if (input.kind !== undefined && input.kind !== "dataspace-configuration") {
    errors.push("“kind” must be \"dataspace-configuration\".");
  }
  if (input.version !== CONFIG_VERSION) {
    errors.push(`Unsupported configuration version. Expected ${CONFIG_VERSION}.`);
  }

  const axesInput = input.axes;
  if (!isRecord(axesInput)) {
    errors.push("“axes” must be an object with x, y, and z.");
  } else {
    for (const axis of ["x", "y", "z"] as const) {
      if (!isColumnRef(axesInput[axis])) errors.push(`“axes.${axis}” must be a column name or null.`);
    }
  }

  const twoDInput = input.twoD;
  if (!isRecord(twoDInput)) {
    errors.push("“twoD” must be an object with x and y.");
  } else {
    for (const axis of ["x", "y"] as const) {
      if (!isColumnRef(twoDInput[axis])) errors.push(`“twoD.${axis}” must be a column name or null.`);
    }
  }

  const colorInput = input.color;
  if (!isRecord(colorInput)) {
    errors.push("“color” must be an object.");
  } else {
    if (!COLOR_MODES.includes(colorInput.mode as ColorMode)) {
      errors.push(`“color.mode” must be one of ${COLOR_MODES.join(", ")}.`);
    }
    if (!isColumnRef(colorInput.column)) errors.push("“color.column” must be a column name or null.");
  }

  const sizeInput = input.size;
  if (!isRecord(sizeInput)) {
    errors.push("“size” must be an object.");
  } else {
    if (typeof sizeInput.enabled !== "boolean") errors.push("“size.enabled” must be a boolean.");
    if (!isColumnRef(sizeInput.column)) errors.push("“size.column” must be a column name or null.");
  }

  const displayInput = input.display;
  if (!isRecord(displayInput)) {
    errors.push("“display” must be an object.");
  } else {
    if (
      typeof displayInput.pointSize !== "number" ||
      !Number.isFinite(displayInput.pointSize) ||
      displayInput.pointSize < 1 ||
      displayInput.pointSize > 20
    ) {
      errors.push("“display.pointSize” must be a number between 1 and 20.");
    }
    if (
      typeof displayInput.opacity !== "number" ||
      !Number.isFinite(displayInput.opacity) ||
      displayInput.opacity < 0.05 ||
      displayInput.opacity > 1
    ) {
      errors.push("“display.opacity” must be a number between 0.05 and 1.");
    }
  }

  if (!LAYOUTS.includes(input.layout as ViewLayout)) {
    errors.push(`“layout” must be one of ${LAYOUTS.join(", ")}.`);
  }

  const filters = parseFilters(input.filters, errors);

  const hiddenColumns: string[] = [];
  if (input.hiddenColumns !== undefined) {
    if (!Array.isArray(input.hiddenColumns) || input.hiddenColumns.some((name) => typeof name !== "string")) {
      errors.push("“hiddenColumns” must be an array of column names.");
    } else {
      hiddenColumns.push(...new Set(input.hiddenColumns as string[]));
    }
  }

  if (errors.length > 0 || !isRecord(axesInput) || !isRecord(twoDInput) || !isRecord(colorInput) || !isRecord(sizeInput) || !isRecord(displayInput)) {
    return { ok: false, errors };
  }

  const config: VisualizationConfig = {
    version: CONFIG_VERSION,
    axes: {
      x: axesInput.x as string | null,
      y: axesInput.y as string | null,
      z: axesInput.z as string | null,
    },
    twoD: { x: twoDInput.x as string | null, y: twoDInput.y as string | null },
    color: { mode: colorInput.mode as ColorMode, column: colorInput.column as string | null },
    size: { enabled: sizeInput.enabled as boolean, column: sizeInput.column as string | null },
    display: {
      pointSize: displayInput.pointSize as number,
      opacity: displayInput.opacity as number,
    },
    filters,
    layout: input.layout as ViewLayout,
    hiddenColumns,
  };

  if (config.color.mode === "none" && config.color.column !== null) {
    config.color.column = null;
    warnings.push("Color mode is “none”; the stored color column was ignored.");
  }
  if (config.size.enabled && config.size.column === null) {
    errors.push("“size.enabled” is true but no size column is set.");
  }
  if (!config.size.enabled && config.size.column !== null) {
    config.size.column = null;
    warnings.push("Size mapping is disabled; the stored size column was ignored.");
  }

  if (dataset) {
    const byName = new Map(dataset.columns.map((column) => [column.name, column]));
    const checkAxis = (name: string | null, label: string) => {
      if (name === null) return;
      const column = byName.get(name);
      if (!column) errors.push(`${label} references missing column “${name}”.`);
      else if (column.type !== "numeric") errors.push(`${label} column “${name}” is not numeric.`);
    };
    checkAxis(config.axes.x, "X axis");
    checkAxis(config.axes.y, "Y axis");
    checkAxis(config.axes.z, "Z axis");
    checkAxis(config.twoD.x, "2D X axis");
    checkAxis(config.twoD.y, "2D Y axis");
    checkAxis(config.size.column, "Size");

    if (config.color.mode !== "none" && config.color.column) {
      const column = byName.get(config.color.column);
      if (!column) errors.push(`Color references missing column “${config.color.column}”.`);
      else if (config.color.mode === "numeric" && column.type !== "numeric") {
        errors.push(`Numeric color requires a numeric column; “${column.name}” is ${column.type}.`);
      } else if (config.color.mode === "categorical" && column.type === "empty") {
        errors.push(`Categorical color cannot use empty column “${column.name}”.`);
      }
    }

    for (const name of Object.keys(config.filters.numeric)) {
      const column = byName.get(name);
      if (!column) errors.push(`Numeric filter references missing column “${name}”.`);
      else if (column.type !== "numeric") errors.push(`Numeric filter column “${name}” is not numeric.`);
    }
    for (const name of Object.keys(config.filters.categorical)) {
      if (!byName.has(name)) errors.push(`Categorical filter references missing column “${name}”.`);
    }
    for (const name of config.hiddenColumns) {
      if (!byName.has(name)) errors.push(`Excluded column “${name}” does not exist in this dataset.`);
    }
    const mapped = new Set(
      [config.axes.x, config.axes.y, config.axes.z, config.twoD.x, config.twoD.y, config.color.column, config.size.column].filter(
        (name): name is string => Boolean(name),
      ),
    );
    for (const name of config.hiddenColumns) {
      if (mapped.has(name)) errors.push(`Column “${name}” is excluded but still mapped to a visual role.`);
      if (config.filters.numeric[name] || (config.filters.categorical[name]?.length ?? 0) > 0) {
        errors.push(`Column “${name}” is excluded but still has an active filter.`);
      }
    }

    const savedName = isRecord(input) && typeof input.datasetName === "string" ? input.datasetName : null;
    if (savedName && savedName !== dataset.name) {
      warnings.push(`Configuration was saved for “${savedName}” and is being applied to “${dataset.name}”.`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, config, warnings };
}

export function buildSavedConfiguration(config: VisualizationConfig, dataset: Dataset): SavedConfiguration {
  const saved: SavedConfig = {
    ...config,
    kind: "dataspace-configuration",
    datasetName: dataset.name,
    columnNames: dataset.columns.map((column) => column.name),
    savedAt: new Date().toISOString(),
  };
  return saved;
}

export function serializeConfiguration(config: VisualizationConfig, dataset: Dataset): string {
  return JSON.stringify(buildSavedConfiguration(config, dataset), null, 2);
}
