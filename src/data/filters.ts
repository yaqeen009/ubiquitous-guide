import type { DataColumn, DataRow, Dataset, Filters } from "@/types";
import { MISSING_CATEGORY } from "./colors";

export function createEmptyFilters(): Filters {
  return { search: "", numeric: {}, categorical: {} };
}

/** Total number of active filter groups (search counts as one). */
export function activeFilterCount(filters: Filters): number {
  const numeric = Object.keys(filters.numeric).length;
  const categorical = Object.values(filters.categorical).filter((values) => values.length > 0).length;
  return numeric + categorical + (filters.search.trim() === "" ? 0 : 1);
}

export function hasActiveFilters(filters: Filters): boolean {
  return activeFilterCount(filters) > 0;
}

/** True when `value` matches one of the selected category values. */
export function categoryMatches(raw: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  if (raw === "") return selected.includes(MISSING_CATEGORY);
  return selected.includes(raw);
}

/**
 * Apply numeric ranges, categorical selections and free-text search.
 *
 * - Numeric filters exclude rows whose value is missing or invalid.
 * - Category selections use the original, untrimmed cell value (empty becomes
 *   the synthetic "missing" category).
 * - Search is case-insensitive across all raw cell text and requires every
 *   whitespace-separated term to appear in the row.
 */
export function rowMatchesFilters(row: DataRow, dataset: Dataset, filters: Filters): boolean {
  for (const [name, range] of Object.entries(filters.numeric)) {
    const column = dataset.columns.find((candidate) => candidate.name === name);
    if (!column) continue;
    const value = row.numeric[column.index];
    if (value === null || value === undefined) return false;
    if (value < range.min || value > range.max) return false;
  }

  for (const [name, selected] of Object.entries(filters.categorical)) {
    if (selected.length === 0) continue;
    const column = dataset.columns.find((candidate) => candidate.name === name);
    if (!column) continue;
    const raw = (row.raw[column.index] ?? "").trim();
    if (!categoryMatches(raw, selected)) return false;
  }

  const terms = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length > 0) {
    const haystack = dataset.searchIndex[row.id] ?? row.raw.join(" ").toLowerCase();
    if (!terms.every((term) => haystack.includes(term))) return false;
  }

  return true;
}

export function applyFilters(dataset: Dataset, filters: Filters): DataRow[] {
  if (!hasActiveFilters(filters)) return dataset.rows;
  return dataset.rows.filter((row) => rowMatchesFilters(row, dataset, filters));
}

/** Categories shown in the filter panel, including a missing option. */
export interface CategoryOption {
  value: string;
  label: string;
  count: number;
  isMissing: boolean;
}

export function getCategoryOptions(column: DataColumn, limit = 40): CategoryOption[] {
  const options: CategoryOption[] = column.categories.slice(0, limit).map((category) => ({
    value: category.value,
    label: category.value,
    count: category.count,
    isMissing: false,
  }));
  if (column.missingCount > 0) {
    options.push({
      value: MISSING_CATEGORY,
      label: "Missing",
      count: column.missingCount,
      isMissing: true,
    });
  }
  return options;
}

export function toggleCategory(selected: string[], value: string): string[] {
  return selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value];
}

/** Remove a single filter group, returning a new immutable filters object. */
export function removeNumericFilter(filters: Filters, column: string): Filters {
  const next = { ...filters.numeric };
  delete next[column];
  return { ...filters, numeric: next };
}

export function removeCategoricalFilter(filters: Filters, column: string): Filters {
  const next = { ...filters.categorical };
  delete next[column];
  return { ...filters, categorical: next };
}
