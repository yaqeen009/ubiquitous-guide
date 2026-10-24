import { describe, expect, it } from "vitest";
import { parseCsv } from "@/data/parse";
import { buildInferenceCsv } from "@/test/fixtures";
import { buildTimeSeries } from "./timeseries";

const dataset = parseCsv(buildInferenceCsv(), "typed.csv").dataset;
const dateColumn = dataset.columns.find((column) => column.name === "when");
const valueColumn = dataset.columns.find((column) => column.name === "value");
const groupColumn = dataset.columns.find((column) => column.name === "group");
if (!dateColumn || !valueColumn || !groupColumn) throw new Error("Fixture columns missing");

describe("buildTimeSeries", () => {
  it("keeps individual timestamps and counts missing measures", () => {
    const result = buildTimeSeries(dataset.rows, dateColumn, valueColumn);
    expect(result.series).toHaveLength(1);
    expect(result.series[0]?.key).toBe("All records");
    expect(result.validCount).toBe(18);
    expect(result.missingValues).toBe(2);
    expect(result.invalidDates).toBe(0);
    expect(result.totalRows).toBe(20);
    expect(result.duplicateTimestamps).toBe(0);
    expect(result.minTime).not.toBeNull();
    expect(result.maxTime).not.toBeNull();
    const points = result.series[0]?.points ?? [];
    expect(points).toHaveLength(18);
    expect(points.every((point, index) => index === 0 || point.time >= (points[index - 1]?.time ?? 0))).toBe(true);
  });

  it("splits by category, reports omitted categories, and keeps duplicates visible", () => {
    const rows = dataset.rows.map((row) => {
      const dates = [...(row.dates ?? [])];
      dates[dateColumn.index] = Date.UTC(2024, 0, 1);
      return { ...row, dates };
    });
    const grouped = buildTimeSeries(rows, dateColumn, valueColumn, { groupColumn, maxSeries: 1 });
    expect(grouped.series).toHaveLength(1);
    expect(grouped.omittedCategories).toBe(1);
    expect(grouped.duplicateTimestamps).toBeGreaterThan(0);
    expect(grouped.series[0]?.hasDuplicateTimestamps).toBe(true);
  });

  it("excludes invalid dates and reports them separately from missing measures", () => {
    const rows = dataset.rows.map((row, index) => {
      const raw = [...row.raw];
      const dates = [...(row.dates ?? [])];
      if (index === 0) {
        raw[dateColumn.index] = "not-a-date";
        dates[dateColumn.index] = null;
      }
      return { ...row, raw, dates };
    });
    const result = buildTimeSeries(rows, dateColumn, valueColumn);
    expect(result.invalidDates).toBe(1);
    expect(result.missingValues).toBe(2);
    expect(result.validCount).toBe(17);
  });

  it("samples only rendering while preserving full counts", () => {
    const lines = ["date,value"];
    for (let index = 0; index < 250; index += 1) {
      const day = String((index % 28) + 1).padStart(2, "0");
      lines.push(`2024-02-${day},${index}`);
    }
    const large = parseCsv(lines.join("\n"), "large.csv").dataset;
    const date = large.columns.find((column) => column.name === "date");
    const value = large.columns.find((column) => column.name === "value");
    if (!date || !value) throw new Error("Columns missing");

    const result = buildTimeSeries(large.rows, date, value, { maxPoints: 100 });
    expect(result.sampled).toBe(true);
    expect(result.validCount).toBe(250);
    expect(result.series[0]?.count).toBe(250);
    expect(result.series[0]?.points).toHaveLength(100);
  });

  it("keeps a selected record visible when sampling would drop it", () => {
    const lines = ["date,value"];
    for (let index = 0; index < 250; index += 1) {
      const day = String((index % 28) + 1).padStart(2, "0");
      lines.push(`2024-03-${day},${index}`);
    }
    const large = parseCsv(lines.join("\n"), "large.csv").dataset;
    const date = large.columns.find((column) => column.name === "date");
    const value = large.columns.find((column) => column.name === "value");
    if (!date || !value) throw new Error("Columns missing");
    const selected = large.rows[137];
    if (!selected) throw new Error("Missing selected row");

    const result = buildTimeSeries(large.rows, date, value, { maxPoints: 100, includeRowId: selected.id });
    expect(result.series[0]?.points.some((point) => point.rowId === selected.id)).toBe(true);
  });
});
