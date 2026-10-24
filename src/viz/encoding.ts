import { useMemo } from "react";
import type { DataColumn, Dataset, DataRow, VisualizationConfig } from "@/types";
import { buildCategoryColorMap, categoryColor, MISSING_CATEGORY, numericColor, type CategoryColorMap } from "@/data/colors";
import { createLinearScale } from "@/data/scaling";
import { sampleRows } from "@/data/sampling";

export interface ScatterPoint {
  row: DataRow;
  /** Normalized coordinates in [-1, 1]. */
  x: number;
  y: number;
  z: number;
  /** Original values for the mapped axes (null when unmapped). */
  xValue: number | null;
  yValue: number | null;
  zValue: number | null;
  color: string;
  /** Size multiplier from the size mapping (1 when disabled). */
  radius: number;
  /** Category key used for grouping and color. */
  category: string;
  colorValue: number | null;
  sizeValue: number | null;
}

export interface ScatterEncoding {
  points: ScatterPoint[];
  /** Rows skipped because a mapped axis value was missing. */
  skipped: number;
  total: number;
  sampled: boolean;
  /** True when needed axis mappings are absent. */
  unmapped: boolean;
  colorMap: CategoryColorMap;
  numericColorExtent: { min: number; max: number } | null;
  sizeExtent: { min: number; max: number } | null;
  colorColumn: DataColumn | null;
  sizeColumn: DataColumn | null;
}

export interface EncodeOptions {
  dimensions: 2 | 3;
  cap: number;
  selectedId: number | null;
  theme: "light" | "dark";
}

const ACCENT = { light: "#0d5c52", dark: "#63c9b8" } as const;

function categoryOf(row: DataRow, column: DataColumn): string {
  const raw = (row.raw[column.index] ?? "").trim();
  return raw === "" ? MISSING_CATEGORY : raw;
}

/**
 * Convert dataset rows into normalized scatter coordinates, colors, and sizes.
 *
 * Axis extents come from the full column (not the filtered subset) so points do
 * not jump when filters change. Sampling is applied after missing-axis rows are
 * removed; statistics and export never use the sample.
 */
export function encodeScatter(
  rows: DataRow[],
  dataset: Dataset,
  config: VisualizationConfig,
  options: EncodeOptions,
): ScatterEncoding {
  const byName = new Map(dataset.columns.map((column) => [column.name, column]));
  const axisNames = options.dimensions === 3 ? [config.axes.x, config.axes.y, config.axes.z] : [config.twoD.x, config.twoD.y];
  const axisColumns = axisNames.map((name) => (name ? byName.get(name) ?? null : null));
  // 3D accepts missing axes (those dimensions sit at the center); 2D needs both.
  const unmapped = options.dimensions === 2 && axisColumns.some((column) => column === null);
  const colorColumn =
    config.color.mode !== "none" && config.color.column ? byName.get(config.color.column) ?? null : null;
  const sizeColumn =
    config.size.enabled && config.size.column ? byName.get(config.size.column) ?? null : null;

  const colorMap = buildCategoryColorMap(
    config.color.mode === "categorical" && colorColumn ? colorColumn : undefined,
  );
  const numericColorExtent =
    config.color.mode === "numeric" && colorColumn && colorColumn.min !== null && colorColumn.max !== null
      ? { min: colorColumn.min, max: colorColumn.max }
      : null;
  const sizeExtent =
    sizeColumn && sizeColumn.min !== null && sizeColumn.max !== null
      ? { min: sizeColumn.min, max: sizeColumn.max }
      : null;

  const numericColorScale = numericColorExtent
    ? createLinearScale(numericColorExtent.min, numericColorExtent.max)
    : null;
  const sizeScale = sizeExtent ? createLinearScale(sizeExtent.min, sizeExtent.max) : null;

  const axisScales = axisColumns.map((column) =>
    column && column.min !== null && column.max !== null ? createLinearScale(column.min, column.max) : null,
  );

  if (unmapped && options.dimensions === 2) {
    return {
      points: [],
      skipped: 0,
      total: rows.length,
      sampled: false,
      unmapped: true,
      colorMap,
      numericColorExtent,
      sizeExtent,
      colorColumn,
      sizeColumn,
    };
  }

  const valid: ScatterPoint[] = [];
  let skipped = 0;

  for (const row of rows) {
    const [xColumn, yColumn, zColumn] = axisColumns;
    const [xScale, yScale, zScale] = axisScales;
    let x = 0;
    let y = 0;
    let z = 0;
    let xValue: number | null = null;
    let yValue: number | null = null;
    let zValue: number | null = null;
    let drop = false;

    if (options.dimensions === 3) {
      if (xColumn) {
        const value = row.numeric[xColumn.index];
        if (value === null || value === undefined || !xScale) drop = true;
        else {
          xValue = value;
          x = xScale.signed(value);
        }
      }
      if (!drop && yColumn) {
        const value = row.numeric[yColumn.index];
        if (value === null || value === undefined || !yScale) drop = true;
        else {
          yValue = value;
          y = yScale.signed(value);
        }
      }
      if (!drop && zColumn) {
        const value = row.numeric[zColumn.index];
        if (value === null || value === undefined || !zScale) drop = true;
        else {
          zValue = value;
          z = zScale.signed(value);
        }
      }
    } else {
      if (!xColumn || !yColumn || !xScale || !yScale) drop = true;
      else {
        const xCell = row.numeric[xColumn.index];
        const yCell = row.numeric[yColumn.index];
        if (xCell === null || xCell === undefined || yCell === null || yCell === undefined) drop = true;
        else {
          xValue = xCell;
          yValue = yCell;
          x = xScale.signed(xCell);
          y = yScale.signed(yCell);
        }
      }
    }

    if (drop) {
      skipped += 1;
      continue;
    }

    let color: string = ACCENT[options.theme];
    let colorValue: number | null = null;
    let category = "";
    if (colorColumn) {
      if (config.color.mode === "categorical") {
        category = categoryOf(row, colorColumn);
        color = categoryColor(colorMap, category);
      } else if (config.color.mode === "numeric" && numericColorScale) {
        const value = row.numeric[colorColumn.index];
        if (value !== null && value !== undefined) {
          colorValue = value;
          color = numericColor(numericColorScale.unit(value));
        }
      }
    }

    let radius = 1;
    let sizeValue: number | null = null;
    if (sizeColumn && sizeScale) {
      const value = row.numeric[sizeColumn.index];
      if (value !== null && value !== undefined) {
        sizeValue = value;
        radius = 0.55 + sizeScale.unit(value) * 1.65;
      }
    }

    valid.push({ row, x, y, z, xValue, yValue, zValue, color, radius, category, colorValue, sizeValue });
  }

  const sample = sampleRows(
    valid.map((point) => point.row),
    options.cap,
    options.selectedId,
  );
  const keep = new Set(sample.rows.map((row) => row.id));
  // When sampling is active, keep the original encoded order but only the
  // sampled ids; append the selected row if the sampler added it at the end.
  const points = valid.filter((point) => keep.has(point.row.id));

  return {
    points,
    skipped,
    total: rows.length,
    sampled: sample.sampled,
    unmapped,
    colorMap,
    numericColorExtent,
    sizeExtent,
    colorColumn,
    sizeColumn,
  };
}

export function useScatterEncoding(
  rows: DataRow[],
  dataset: Dataset | null,
  config: VisualizationConfig | null,
  options: EncodeOptions,
): ScatterEncoding | null {
  return useMemo(() => {
    if (!dataset || !config) return null;
    return encodeScatter(rows, dataset, config, options);
    // The options object is constructed inline by callers; individual fields
    // below are the meaningful dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, dataset, config, options.dimensions, options.cap, options.selectedId, options.theme]);
}
