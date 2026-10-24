import { describe, expect, it } from "vitest";
import { parseCsv } from "@/data/parse";
import { buildHistogram, describeHistogram, histogramBinWidth } from "./distribution";

function histogramFor(csv: string, columnName: string, setting: Parameters<typeof buildHistogram>[2] = "auto") {
  const dataset = parseCsv(csv, "values.csv").dataset;
  const column = dataset.columns.find((candidate) => candidate.name === columnName);
  if (!column) throw new Error("Column missing");
  return buildHistogram(dataset.rows, column, setting);
}

describe("buildHistogram", () => {
  it("separates missing, invalid, and valid values", () => {
    const histogram = histogramFor("id,value\n1,1\n2,\n3,N/A\n4,3\n5,5", "value");
    expect(histogram.summary.count).toBe(3);
    expect(histogram.summary.missing).toBe(1);
    expect(histogram.summary.invalid).toBe(1);
    expect(histogram.summary.min).toBe(1);
    expect(histogram.summary.max).toBe(5);
  });

  it("uses explicit bins whose counts sum to the valid rows", () => {
    const histogram = histogramFor(
      ["value", ...Array.from({ length: 20 }, (_, index) => String(index + 1))].join("\n"),
      "value",
      5,
    );
    expect(histogram.binCount).toBe(5);
    expect(histogram.bins).toHaveLength(5);
    expect(histogram.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(20);
    expect(histogramBinWidth(histogram)).toBeCloseTo((20 - 1) / 5, 10);
    expect(describeHistogram(histogram)).toMatch(/5 bins/);
  });

  it("computes summaries without inventing values for an empty column", () => {
    const histogram = histogramFor("id,value\n1,\n2,\n3,", "value");
    expect(histogram.empty).toBe(true);
    expect(histogram.bins).toHaveLength(0);
    expect(histogram.summary.min).toBeNull();
    expect(histogram.summary.mean).toBeNull();
    expect(describeHistogram(histogram)).toMatch(/No valid numeric values/);
  });

  it("uses a single bin when every value is identical", () => {
    const histogram = histogramFor("value\n7\n7\n7\n7", "value");
    expect(histogram.constant).toBe(true);
    expect(histogram.binCount).toBe(1);
    expect(histogram.bins[0]).toMatchObject({ start: 7, end: 7, count: 4 });
    expect(histogramBinWidth(histogram)).toBeNull();
    expect(describeHistogram(histogram)).toMatch(/All 4 values equal 7/);
  });

  it("reports quantiles, mean, and population standard deviation", () => {
    const histogram = histogramFor("value\n1\n2\n3\n4", "value");
    expect(histogram.summary.median).toBeCloseTo(2.5, 10);
    expect(histogram.summary.q1).toBeCloseTo(1.75, 10);
    expect(histogram.summary.mean).toBeCloseTo(2.5, 10);
    expect(histogram.summary.stdDev).toBeCloseTo(Math.sqrt(1.25), 10);
  });

  it("clamps unusual bin settings to a bounded count", () => {
    const histogram = histogramFor(
      ["value", ...Array.from({ length: 40 }, (_, index) => String(index))].join("\n"),
      "value",
      30,
    );
    expect(histogram.binCount).toBe(30);
    expect(histogram.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(40);
  });
});
