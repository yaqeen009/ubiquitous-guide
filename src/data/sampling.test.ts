import { describe, expect, it } from "vitest";
import { sampleRows } from "./sampling";
import type { DataRow } from "@/types";

function makeRows(count: number): DataRow[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    raw: [String(id)],
    numeric: [id],
  }));
}

describe("sampleRows", () => {
  it("returns every row when the set fits the cap", () => {
    const rows = makeRows(10);
    const result = sampleRows(rows, 10);
    expect(result.sampled).toBe(false);
    expect(result.rows).toBe(rows);
    expect(result.total).toBe(10);
  });

  it("samples deterministically and evenly", () => {
    const rows = makeRows(100);
    const first = sampleRows(rows, 10);
    const second = sampleRows(rows, 10);
    expect(first.sampled).toBe(true);
    expect(first.rows).toHaveLength(10);
    expect(first.rows.map((row) => row.id)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(second.rows.map((row) => row.id)).toEqual(first.rows.map((row) => row.id));
  });

  it("keeps a selected row visible without exceeding the cap", () => {
    const rows = makeRows(100);
    const result = sampleRows(rows, 10, 55);
    expect(result.rows).toHaveLength(10);
    expect(result.rows.some((row) => row.id === 55)).toBe(true);
    expect(new Set(result.rows.map((row) => row.id)).size).toBe(10);
  });

  it("does not duplicate a selected row that is already sampled", () => {
    const rows = makeRows(100);
    const result = sampleRows(rows, 10, 50);
    expect(result.rows.filter((row) => row.id === 50)).toHaveLength(1);
  });

  it("ignores selections outside the filtered set", () => {
    const rows = makeRows(100);
    const result = sampleRows(rows, 10, 9999);
    expect(result.rows).toHaveLength(10);
    expect(result.rows.some((row) => row.id === 9999)).toBe(false);
  });

  it("handles an empty row set", () => {
    const result = sampleRows([], 10);
    expect(result.rows).toHaveLength(0);
    expect(result.sampled).toBe(false);
    expect(result.total).toBe(0);
  });
});
