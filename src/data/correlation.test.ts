import { describe, expect, it } from "vitest";
import { parseCsv } from "@/data/parse";
import { CORRELATED_CSV } from "@/test/fixtures";
import { buildCorrelationMatrix, correlationColor, correlationOf, correlationText } from "./correlation";

const dataset = parseCsv(CORRELATED_CSV, "correlated.csv").dataset;
const x = dataset.columns.find((column) => column.name === "x");
const y = dataset.columns.find((column) => column.name === "y");
const z = dataset.columns.find((column) => column.name === "z");
if (!x || !y || !z) throw new Error("Fixture columns missing");

describe("Pearson correlation", () => {
  it("computes perfect positive correlation and pairwise counts", () => {
    const result = correlationOf(dataset.rows, x, y);
    expect(result.value).toBeCloseTo(1, 10);
    expect(result.pairs).toBe(8);
  });

  it("returns null instead of zero for insufficient or constant pairs", () => {
    const threeRows = dataset.rows.slice(0, 2);
    expect(correlationOf(threeRows, x, y)).toEqual({ value: null, pairs: 2 });

    const constant = parseCsv("a,b\n1,3\n1,4\n1,5\n1,6", "constant.csv").dataset;
    const a = constant.columns[0];
    const b = constant.columns[1];
    if (!a || !b) throw new Error("Columns missing");
    expect(correlationOf(constant.rows, a, b)).toEqual({ value: null, pairs: 4 });
  });

  it("removes missing values per pair, never by filling zero", () => {
    const withGaps = parseCsv("a,b\n1,2\n2,\n3,6\n,8\n5,10", "gaps.csv").dataset;
    const a = withGaps.columns[0];
    const b = withGaps.columns[1];
    if (!a || !b) throw new Error("Columns missing");
    const result = correlationOf(withGaps.rows, a, b);
    expect(result.pairs).toBe(3);
    expect(result.value).toBeCloseTo(1, 10);
  });

  it("builds a symmetric matrix with real diagonal pair counts", () => {
    const matrix = buildCorrelationMatrix([x, y, z], dataset.rows);
    expect(matrix.method).toBe("pearson");
    expect(matrix.rowCount).toBe(8);
    expect(matrix.sampled).toBe(false);
    expect(matrix.cells).toHaveLength(9);
    const xy = matrix.cells.find((cell) => cell.row === "x" && cell.column === "y");
    const yx = matrix.cells.find((cell) => cell.row === "y" && cell.column === "x");
    expect(xy?.value).toBeCloseTo(yx?.value ?? NaN, 12);
    expect(matrix.cells.find((cell) => cell.row === "x" && cell.column === "x")?.pairs).toBe(8);
  });

  it("samples large sets deterministically while reporting the full row count", () => {
    const lines = ["a,b"];
    for (let index = 0; index < 5_000; index += 1) lines.push(`${index},${index * 2}`);
    const large = parseCsv(lines.join("\n"), "large.csv").dataset;
    const a = large.columns[0];
    const b = large.columns[1];
    if (!a || !b) throw new Error("Columns missing");
    const first = buildCorrelationMatrix([a, b], large.rows);
    const second = buildCorrelationMatrix([a, b], large.rows);
    expect(first.sampled).toBe(true);
    expect(first.rowCount).toBe(5_000);
    expect(first.sampleCount).toBe(2_000);
    expect(first.cells).toEqual(second.cells);
  });

  it("formats undefined correlations separately from near-zero values", () => {
    expect(correlationText(null)).toBe("n/a");
    expect(correlationText(0)).toBe("0.00");
    expect(correlationColor(null)).toBe("#b9b5aa");
    expect(correlationColor(1)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
