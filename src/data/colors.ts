import type { DataColumn } from "@/types";
import { MAX_LEGEND_CATEGORIES } from "./limits";

/**
 * Color-vision-deficiency-aware categorical palette (Okabe–Ito derived, with
 * darker yellow and grey for contrast on light surfaces).
 */
export const CATEGORICAL_PALETTE = [
  "#0072b2",
  "#e69f00",
  "#009e73",
  "#cc79a7",
  "#56b4e9",
  "#d55e00",
  "#7a5af5",
  "#8a8f00",
  "#a05a2c",
  "#4d4d4d",
  "#b5446e",
] as const;

export const MISSING_COLOR = "#9a9a94";
export const OTHER_CATEGORY = "__other__";
export const MISSING_CATEGORY = "\u0000missing";

/** Sequential stops for numeric color mapping (viridis). */
const VIRIDIS_STOPS: Array<[number, [number, number, number]]> = [
  [0, [68, 1, 84]],
  [0.25, [59, 82, 139]],
  [0.5, [33, 145, 140]],
  [0.75, [94, 201, 98]],
  [1, [253, 231, 37]],
];

function interpolate(left: [number, number, number], right: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(left[0] + (right[0] - left[0]) * t),
    Math.round(left[1] + (right[1] - left[1]) * t),
    Math.round(left[2] + (right[2] - left[2]) * t),
  ];
}

/** Map a normalized value to a hex color on the viridis scale. */
export function numericColor(unit: number): string {
  const t = Math.min(1, Math.max(0, Number.isFinite(unit) ? unit : 0));
  for (let index = 0; index < VIRIDIS_STOPS.length - 1; index += 1) {
    const current = VIRIDIS_STOPS[index];
    const next = VIRIDIS_STOPS[index + 1];
    if (!current || !next) break;
    if (t >= current[0] && t <= next[0]) {
      const span = next[0] - current[0];
      const local = span === 0 ? 0 : (t - current[0]) / span;
      const [r, g, b] = interpolate(current[1], next[1], local);
      return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
    }
  }
  return "#fde725";
}

export interface CategoryColorEntry {
  value: string;
  label: string;
  color: string;
  count: number;
}

export interface CategoryColorMap {
  /** Value -> color. Unknown values map to the "Other" color. */
  colors: Map<string, string>;
  entries: CategoryColorEntry[];
  grouped: boolean;
}

/**
 * Build a stable category → color mapping from the full-dataset category
 * counts. Filtering therefore never re-colors a category. More than 11 values
 * are grouped into the top ten plus an "Other" entry.
 */
export function buildCategoryColorMap(column: DataColumn | undefined): CategoryColorMap {
  const colors = new Map<string, string>();
  const entries: CategoryColorEntry[] = [];
  if (!column) return { colors, entries, grouped: false };

  const categories = column.categories;
  const grouped = categories.length > MAX_LEGEND_CATEGORIES;
  const shown = grouped ? categories.slice(0, MAX_LEGEND_CATEGORIES - 1) : categories;

  shown.forEach((category, index) => {
    const color = CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length] ?? "#0072b2";
    colors.set(category.value, color);
    entries.push({ value: category.value, label: category.value, color, count: category.count });
  });

  if (grouped) {
    const shownValues = new Set(shown.map((category) => category.value));
    const otherCount = categories.reduce(
      (total, category) => (shownValues.has(category.value) ? total : total + category.count),
      0,
    );
    colors.set(OTHER_CATEGORY, MISSING_COLOR);
    entries.push({ value: OTHER_CATEGORY, label: "Other values", color: MISSING_COLOR, count: otherCount });
  }

  if (column.missingCount > 0) {
    colors.set(MISSING_CATEGORY, MISSING_COLOR);
    entries.push({
      value: MISSING_CATEGORY,
      label: "Missing",
      color: MISSING_COLOR,
      count: column.missingCount,
    });
  }

  return { colors, entries, grouped };
}

export function categoryColor(map: CategoryColorMap, value: string): string {
  if (value === "" || value === MISSING_CATEGORY) return MISSING_COLOR;
  return map.colors.get(value) ?? (map.grouped ? MISSING_COLOR : "#0072b2");
}

export const SEQUENTIAL_GRADIENT = "linear-gradient(90deg, #440154 0%, #3b528b 25%, #21918c 50%, #5ec962 75%, #fde725 100%)";
