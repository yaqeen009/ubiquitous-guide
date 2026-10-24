import Papa from "papaparse";
import type { Dataset, DataRow, ImportIssue, ParseResult } from "@/types";
import { analyzeColumn, type ColumnAnalysis } from "./infer";
import { isMissingCell } from "./numeric";
import { MAX_ROWS, WARN_FILE_BYTES, WARN_ROWS } from "./limits";

export class CsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvImportError";
  }
}

export interface ParseOptions {
  /** Overrides the name derived from the file. */
  name?: string;
  /** File size in bytes, used only to produce a helpful warning. */
  fileSize?: number;
  /** Maximum rows to accept, primarily for tests. */
  maxRows?: number;
}

/** Strip an extension and fall back to a neutral label. */
export function datasetNameFromFilename(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").trim();
  return base || "Untitled dataset";
}

function cleanHeader(cell: string | undefined, index: number): string {
  const withoutBom = (cell ?? "").replace(/^\uFEFF/, "").trim();
  return withoutBom || `Column ${index + 1}`;
}

/** Make duplicate header names unique and stable, e.g. "Value (2)". */
export function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    const count = (seen.get(header) ?? 0) + 1;
    seen.set(header, count);
    return count === 1 ? header : `${header} (${count})`;
  });
}

/**
 * Parse CSV text into a normalized dataset.
 *
 * The first non-empty row is treated as the header. Rows with more fields than
 * the header are rejected; rows with fewer fields are padded with missing
 * values and reported. Parsing is synchronous; the UI shows a busy state before
 * calling this function.
 */
export function parseCsv(text: string, filename: string, options: ParseOptions = {}): ParseResult {
  if (text.trim() === "") throw new CsvImportError("The file is empty. Choose a CSV file with a header row and data.");

  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    header: false,
  });

  const matrix = parsed.data;
  if (matrix.length === 0) {
    throw new CsvImportError("No rows found. Check that the file is a valid CSV with a header row.");
  }
  if (matrix.length === 1) {
    throw new CsvImportError("Only a header row was found. Add at least one data row and try again.");
  }

  const headerRow = matrix[0] ?? [];
  if (headerRow.length === 0) {
    throw new CsvImportError("The header row is empty. Add column names and try again.");
  }

  const limit = options.maxRows ?? MAX_ROWS;
  const dataRows = matrix.slice(1);
  if (dataRows.length > limit) {
    throw new CsvImportError(
      `This file has ${dataRows.length.toLocaleString()} data rows, above the supported limit of ${limit.toLocaleString()}. Split the file or filter it before importing.`,
    );
  }

  const headers = dedupeHeaders(headerRow.map(cleanHeader));
  const columnCount = headers.length;
  const issues: ImportIssue[] = [];
  const warnings: string[] = [];
  const acceptedRows: string[][] = [];
  let rejectedRows = 0;
  let paddedRows = 0;
  let malformedDetails = 0;

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index] ?? [];
    const userLine = index + 2;
    if (row.length === columnCount) {
      acceptedRows.push(row);
      continue;
    }
    if (row.length > columnCount) {
      rejectedRows += 1;
      if (malformedDetails < 10) {
        issues.push({
          row: userLine,
          message: `Row ${userLine} has ${row.length} fields but the header has ${columnCount}. The row was skipped.`,
        });
        malformedDetails += 1;
      }
      continue;
    }
    const padded = [...row, ...new Array<string>(columnCount - row.length).fill("")];
    acceptedRows.push(padded);
    paddedRows += 1;
    if (malformedDetails < 10) {
      issues.push({
        row: userLine,
        message: `Row ${userLine} has ${row.length} fields; missing trailing values were treated as missing.`,
      });
      malformedDetails += 1;
    }
  }

  for (const error of parsed.errors.slice(0, 10)) {
    issues.push({
      row: typeof error.row === "number" ? error.row + 1 : 0,
      message: error.message,
    });
  }

  if (acceptedRows.length === 0) {
    throw new CsvImportError(
      "No usable data rows were found. Every row had a different number of fields than the header.",
    );
  }

  const analyses: ColumnAnalysis[] = headers.map((name, columnIndex) => {
    const cells = acceptedRows.map((row) => row[columnIndex] ?? "");
    return analyzeColumn(name, columnIndex, cells);
  });

  const columns = analyses.map((analysis) => analysis.column);
  const rows: DataRow[] = acceptedRows.map((raw, id) => ({
    id,
    raw,
    numeric: analyses.map((analysis) => analysis.parsed[id] ?? null),
    dates: analyses.map((analysis) => analysis.parsedDates[id] ?? null),
  }));

  const searchIndex = rows.map((row) => row.raw.map((cell) => cell.trim().toLowerCase()).join(" "));

  if (parsed.errors.length > 0) {
    warnings.push(
      `${parsed.errors.length} CSV parser warning${parsed.errors.length === 1 ? "" : "s"} occurred. The first issues are listed below.`,
    );
  }
  if (rejectedRows > 0) {
    warnings.push(
      `${rejectedRows.toLocaleString()} row${rejectedRows === 1 ? "" : "s"} skipped because they had more fields than the header.`,
    );
  }
  if (paddedRows > 0) {
    warnings.push(
      `${paddedRows.toLocaleString()} row${paddedRows === 1 ? "" : "s"} had missing trailing fields; those cells were treated as missing.`,
    );
  }
  for (const column of columns) {
    if (column.type === "numeric" && column.invalidNumericCount > 0) {
      warnings.push(
        `Column “${column.name}” has ${column.invalidNumericCount.toLocaleString()} non-numeric value${column.invalidNumericCount === 1 ? "" : "s"}. They are treated as missing in charts.`,
      );
    }
    if (column.type === "empty") warnings.push(`Column “${column.name}” is empty.`);
  }

  const rowCount = rows.length;
  if (rowCount > WARN_ROWS) {
    warnings.unshift(
      `Large dataset: ${rowCount.toLocaleString()} rows. Rendering is capped at 20,000 sampled points; statistics, filters, and export use every row.`,
    );
  }
  if (options.fileSize !== undefined && options.fileSize > WARN_FILE_BYTES) {
    warnings.unshift(
      `Large file: ${(options.fileSize / (1024 * 1024)).toFixed(1)} MB. Import happens locally and may take a moment.`,
    );
  }

  const emptyRowCount = rows.filter((row) => row.raw.every((cell) => isMissingCell(cell))).length;
  if (emptyRowCount > 0) {
    warnings.push(`${emptyRowCount.toLocaleString()} completely empty row(s) were kept as records with missing values.`);
  }

  const dataset: Dataset = {
    name: options.name?.trim() || datasetNameFromFilename(filename),
    source: "upload",
    columns,
    rows,
    warnings: warnings.slice(0, 30),
    rejectedRows,
    importedAt: new Date().toISOString(),
    searchIndex,
  };

  return { dataset, issues: issues.slice(0, 20) };
}

/** Validate a file before reading it. Returns a user-facing error or null. */
export function validateCsvFile(file: File, maxBytes: number): string | null {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".txt")) {
    return "Unsupported file type. Choose a .csv file (comma-separated values).";
  }
  if (file.size === 0) return "The file is empty.";
  if (file.size > maxBytes) {
    return `The file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The supported limit is ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`;
  }
  return null;
}
