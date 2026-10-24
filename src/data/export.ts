import Papa from "papaparse";
import type { Dataset, DataRow } from "@/types";
import { parseNumericValue } from "./numeric";

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Prevent CSV formula injection.
 *
 * A string cell that starts with =, +, -, @, tab or carriage return is prefixed
 * with an apostrophe so spreadsheet applications treat it as text. Numeric
 * columns containing valid numbers (including negative numbers) are left
 * untouched so exported values stay machine-readable.
 */
export function sanitizeSpreadsheetCell(value: string, numericColumn: boolean): string {
  if (numericColumn && parseNumericValue(value) !== null) return value;
  if (FORMULA_PREFIX.test(value)) return `'${value}`;
  return value;
}

/** Serialize the given rows with original headers and values. */
export function datasetToCsv(dataset: Dataset, rows: DataRow[]): string {
  const fields = dataset.columns.map((column) => column.name);
  const data = rows.map((row) =>
    dataset.columns.map((column) => {
      const raw = row.raw[column.index] ?? "";
      return sanitizeSpreadsheetCell(raw, column.type === "numeric");
    }),
  );
  return Papa.unparse({ fields, data }, { newline: "\n", quotes: false });
}

export function buildCsvFilename(datasetName: string, filtered: boolean): string {
  const base = datasetName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = filtered ? "-filtered" : "";
  return `${base || "dataset"}${suffix}.csv`;
}
