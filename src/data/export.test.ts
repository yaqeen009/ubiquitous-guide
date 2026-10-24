import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { buildCsvFilename, datasetToCsv, sanitizeSpreadsheetCell } from "./export";
import { parseCsv } from "./parse";
import { MIXED_CSV } from "@/test/fixtures";

const { dataset } = parseCsv(MIXED_CSV, "mixed.csv");

describe("sanitizeSpreadsheetCell", () => {
  it("neutralizes formula-leading text", () => {
    expect(sanitizeSpreadsheetCell("=1+1", false)).toBe("'=1+1");
    expect(sanitizeSpreadsheetCell("+SUM(A1)", false)).toBe("'+SUM(A1)");
    expect(sanitizeSpreadsheetCell("-cmd", false)).toBe("'-cmd");
    expect(sanitizeSpreadsheetCell("@import", false)).toBe("'@import");
  });

  it("leaves ordinary text and valid numbers untouched", () => {
    expect(sanitizeSpreadsheetCell("North", false)).toBe("North");
    expect(sanitizeSpreadsheetCell("-12.5", true)).toBe("-12.5");
    expect(sanitizeSpreadsheetCell("1e3", true)).toBe("1e3");
  });

  it("still protects numeric columns when a cell is not a number", () => {
    expect(sanitizeSpreadsheetCell("=HYPERLINK()", true)).toBe("'=HYPERLINK()");
  });
});

describe("datasetToCsv", () => {
  it("exports headers and every original cell", () => {
    const csv = datasetToCsv(dataset, dataset.rows);
    const roundTrip = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    expect(roundTrip.meta.fields).toEqual(["Station", "Region", "Zone", "PM2.5", "NO2", "Note"]);
    expect(roundTrip.data).toHaveLength(5);
    expect(roundTrip.data[0]).toMatchObject({ Station: "AQ-1", "PM2.5": "10", NO2: "1.5" });
  });

  it("preserves missing cells as empty fields", () => {
    const csv = datasetToCsv(dataset, [dataset.rows[1]!]);
    const roundTrip = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    expect(roundTrip.data[0]?.["PM2.5"]).toBe("");
  });

  it("protects formula cells without altering other rows", () => {
    const csv = datasetToCsv(dataset, dataset.rows);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("needs review");
  });

  it("exports only the rows it is given", () => {
    const csv = datasetToCsv(dataset, [dataset.rows[0]!]);
    const roundTrip = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    expect(roundTrip.data).toHaveLength(1);
  });
});

describe("buildCsvFilename", () => {
  it("slugs the dataset name and marks filtered exports", () => {
    expect(buildCsvFilename("Urban air quality (demo)", false)).toBe("urban-air-quality-demo.csv");
    expect(buildCsvFilename("Urban air quality (demo)", true)).toBe("urban-air-quality-demo-filtered.csv");
  });

  it("falls back when the name has no usable characters", () => {
    expect(buildCsvFilename("★", false)).toBe("dataset.csv");
  });
});
