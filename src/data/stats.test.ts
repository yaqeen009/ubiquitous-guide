import { describe, expect, it } from "vitest";
import { computeStats, isNumericStats } from "./stats";
import { parseCsv } from "./parse";
import { MIXED_CSV } from "@/test/fixtures";

const { dataset } = parseCsv(MIXED_CSV, "mixed.csv");
const stats = computeStats(dataset.columns, dataset.rows);
const byName = (name: string) => {
  const found = stats.find((entry) => entry.name === name);
  if (!found) throw new Error(`Missing stats for ${name}`);
  return found;
};

describe("computeStats", () => {
  it("computes numeric statistics over valid values", () => {
    const pm = byName("PM2.5");
    expect(isNumericStats(pm)).toBe(true);
    if (!isNumericStats(pm)) return;
    expect(pm.count).toBe(4);
    expect(pm.missing).toBe(1);
    expect(pm.invalid).toBe(0);
    expect(pm.min).toBe(10);
    expect(pm.max).toBe(40);
    expect(pm.mean).toBe(25);
    expect(pm.median).toBe(25);
  });

  it("counts invalid numeric cells separately from missing ones", () => {
    const pmColumn = dataset.columns.find((column) => column.name === "PM2.5");
    if (!pmColumn) throw new Error("Missing PM2.5 column");
    const rows = [
      ...dataset.rows,
      {
        id: 99,
        raw: ["AQ-9", "North", "Urban", "N/A", "2", "x"],
        numeric: [null, null, null, null, 2, null],
      },
    ];
    const [numeric] = computeStats([pmColumn], rows);
    if (!numeric || !isNumericStats(numeric)) throw new Error("Expected numeric stats");
    expect(numeric.count).toBe(4);
    expect(numeric.invalid).toBe(1);
    expect(numeric.missing).toBe(1);
  });

  it("summarizes categorical columns and their top values", () => {
    const region = byName("Region");
    expect(isNumericStats(region)).toBe(false);
    expect(region.kind).toBe("categorical");
    if (isNumericStats(region)) return;
    expect(region.count).toBe(5);
    expect(region.missing).toBe(0);
    expect(region.distinct).toBe(3);
    expect(region.top[0]).toEqual({ value: "North", count: 3 });
  });

  it("tracks missing values in categorical columns", () => {
    const note = byName("Note");
    if (isNumericStats(note)) throw new Error("Note should not be numeric");
    expect(note.missing).toBe(1);
    expect(note.count).toBe(4);
  });

  it("returns null statistics for an empty row set", () => {
    const pmColumn = dataset.columns.find((column) => column.name === "PM2.5");
    if (!pmColumn) throw new Error("Missing PM2.5 column");
    const [pm] = computeStats([pmColumn], []);
    if (!pm || !isNumericStats(pm)) throw new Error("Expected numeric stats");
    expect(pm.count).toBe(0);
    expect(pm.mean).toBeNull();
    expect(pm.min).toBeNull();
    expect(pm.max).toBeNull();
  });
});
