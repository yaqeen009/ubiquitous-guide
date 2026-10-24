import { describe, expect, it } from "vitest";
import { CsvImportError, datasetNameFromFilename, dedupeHeaders, parseCsv, validateCsvFile } from "./parse";
import { MAX_FILE_BYTES, MAX_ROWS } from "./limits";
import { MALFORMED_CSV, MIXED_CSV, SIMPLE_CSV } from "@/test/fixtures";

describe("parseCsv", () => {
  it("parses headers, raw cells, numeric mirrors, and search index", () => {
    const { dataset } = parseCsv(SIMPLE_CSV, "simple.csv");
    expect(dataset.name).toBe("simple");
    expect(dataset.source).toBe("upload");
    expect(dataset.columns.map((column) => column.name)).toEqual(["Group", "Alpha", "Beta"]);
    expect(dataset.rows).toHaveLength(5);
    expect(dataset.rows[0]?.raw).toEqual(["A", "1", "10"]);
    expect(dataset.rows[0]?.numeric).toEqual([null, 1, 10]);
    expect(dataset.searchIndex[0]).toBe("a 1 10");
    expect(dataset.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("keeps missing cells as null, never zero", () => {
    const { dataset } = parseCsv(MIXED_CSV, "mixed.csv");
    const pm = dataset.columns.find((column) => column.name === "PM2.5");
    expect(pm).toBeDefined();
    const second = dataset.rows[1];
    expect(second?.raw[3]).toBe("");
    expect(second?.numeric[3]).toBeNull();
  });

  it("deduplicates headers and keeps both columns", () => {
    const { dataset } = parseCsv(MALFORMED_CSV, "malformed.csv");
    expect(dataset.columns.map((column) => column.name)).toEqual(["A", "A (2)", "B"]);
  });

  it("pads short rows and rejects rows with extra fields", () => {
    const { dataset, issues } = parseCsv(MALFORMED_CSV, "malformed.csv");
    expect(dataset.rows).toHaveLength(2);
    expect(dataset.rejectedRows).toBe(1);
    expect(dataset.rows[1]?.raw).toEqual(["4", "5", ""]);
    expect(dataset.warnings.join(" ")).toContain("skipped");
    expect(issues.some((issue) => issue.message.includes("fields"))).toBe(true);
  });

  it("honours a custom name and strips the file extension", () => {
    const { dataset } = parseCsv(SIMPLE_CSV, "folder/observations.csv", { name: "Custom name" });
    expect(dataset.name).toBe("Custom name");
    expect(datasetNameFromFilename("folder/observations.csv")).toBe("observations");
  });

  it("throws clear errors for empty input and header-only files", () => {
    expect(() => parseCsv("   \n ", "empty.csv")).toThrow(CsvImportError);
    expect(() => parseCsv("A,B", "header.csv")).toThrow(/Only a header row/);
  });

  it("throws when every row is malformed", () => {
    expect(() => parseCsv("A,B\n1,2,3\n4,5,6", "bad.csv")).toThrow(/No usable data rows/);
  });

  it("enforces the row limit", () => {
    expect(() => parseCsv(SIMPLE_CSV, "simple.csv", { maxRows: 2 })).toThrow(/above the supported limit/);
    expect(MAX_ROWS).toBe(100_000);
  });

  it("reports non-numeric values inside a numeric column", () => {
    const csv = ["Value", ...Array.from({ length: 20 }, (_, index) => (index === 5 ? "N/A" : String(index)))].join("\n");
    const { dataset } = parseCsv(csv, "numbers.csv");
    expect(dataset.columns[0]?.type).toBe("numeric");
    expect(dataset.columns[0]?.invalidNumericCount).toBe(1);
    expect(dataset.warnings.some((warning) => warning.includes("non-numeric"))).toBe(true);
  });

  it("drops completely empty rows through greedy blank-line handling", () => {
    const csv = ["A,B", "1,2", ",", "3,4"].join("\n");
    const { dataset } = parseCsv(csv, "gaps.csv");
    expect(dataset.rows).toHaveLength(2);
    expect(dataset.rows.some((row) => row.raw.every((cell) => cell === ""))).toBe(false);
  });
});

describe("dedupeHeaders", () => {
  it("numbers duplicates in order", () => {
    expect(dedupeHeaders(["Value", "Value", "Value"])).toEqual(["Value", "Value (2)", "Value (3)"]);
  });
});

describe("validateCsvFile", () => {
  it("rejects unsupported file types", () => {
    const file = new File(["x"], "data.pdf", { type: "application/pdf" });
    expect(validateCsvFile(file, MAX_FILE_BYTES)).toMatch(/Unsupported file type/);
  });

  it("rejects empty and oversized files", () => {
    expect(validateCsvFile(new File([], "empty.csv"), MAX_FILE_BYTES)).toBe("The file is empty.");
    const big = new File(["x"], "big.csv");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    expect(validateCsvFile(big, MAX_FILE_BYTES)).toMatch(/supported limit/);
  });

  it("accepts CSV and TXT files", () => {
    expect(validateCsvFile(new File(["a,b"], "ok.csv"), MAX_FILE_BYTES)).toBeNull();
    expect(validateCsvFile(new File(["a,b"], "ok.txt"), MAX_FILE_BYTES)).toBeNull();
  });
});
