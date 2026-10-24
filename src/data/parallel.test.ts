import { describe, expect, it } from "vitest";
import { parseCsv } from "@/data/parse";
import { buildParallelData, brushIsActive, brushRangeFor, recordMatchesBrush } from "./parallel";

const dataset = parseCsv(
  ["a,b,c,group", "1,10,5,North", "2,20,,South", "3,30,7,North", "4,40,9,South", "5,50,11,North"].join("\n"),
  "parallel.csv",
).dataset;
const a = dataset.columns[0];
const b = dataset.columns[1];
const c = dataset.columns[2];
const group = dataset.columns[3];
if (!a || !b || !c || !group) throw new Error("Fixture columns missing");

describe("parallel coordinates data", () => {
  it("normalises from full-dataset extents and skips incomplete records", () => {
    const data = buildParallelData(dataset.rows, [a, b, c], group);
    expect(data.dimensions.map((dimension) => [dimension.name, dimension.min, dimension.max])).toEqual([
      ["a", 1, 5],
      ["b", 10, 50],
      ["c", 5, 11],
    ]);
    expect(data.allRecords).toHaveLength(4);
    expect(data.records).toHaveLength(4);
    expect(data.skipped).toBe(1);
    expect(data.total).toBe(4);
    expect(data.sampled).toBe(false);
    const first = data.allRecords.find((record) => record.rowId === 0);
    expect(first?.values).toEqual([0, 0, 0]);
    expect(first?.rawValues).toEqual([1, 10, 5]);
    expect(first?.category).toBe("North");
  });

  it("samples rendering deterministically but retains every record for brushing", () => {
    const lines = ["x,y"];
    for (let index = 0; index < 120; index += 1) lines.push(`${index},${index * 2}`);
    const large = parseCsv(lines.join("\n"), "large.csv").dataset;
    const x = large.columns[0];
    const y = large.columns[1];
    if (!x || !y) throw new Error("Columns missing");

    const data = buildParallelData(large.rows, [x, y], null, 25);
    expect(data.sampled).toBe(true);
    expect(data.records).toHaveLength(25);
    expect(data.allRecords).toHaveLength(120);
    expect(data.total).toBe(120);
  });

  it("keeps a selected record in the render sample", () => {
    const lines = ["x,y"];
    for (let index = 0; index < 120; index += 1) lines.push(`${index},${index * 2}`);
    const large = parseCsv(lines.join("\n"), "large.csv").dataset;
    const x = large.columns[0];
    const y = large.columns[1];
    if (!x || !y) throw new Error("Columns missing");
    const selected = large.rows[117];
    if (!selected) throw new Error("Missing selected row");

    const data = buildParallelData(large.rows, [x, y], null, 25, selected.id);
    expect(data.records.some((record) => record.rowId === selected.id)).toBe(true);
  });

  it("matches brushes in original units across multiple axes", () => {
    const data = buildParallelData(dataset.rows, [a, b, c], group);
    const dimA = data.dimensions[0];
    const dimB = data.dimensions[1];
    if (!dimA || !dimB) throw new Error("Missing dimensions");
    const brush = {
      a: brushRangeFor(dimA, 0, 0.5),
      b: brushRangeFor(dimB, 0, 0.6),
    };
    expect(brushIsActive(brush)).toBe(true);
    expect(brush.a).toEqual({ min: 1, max: 3 });
    const matched = data.allRecords.filter((record) => recordMatchesBrush(record, data.dimensions, brush));
    expect(matched.map((record) => record.rowId)).toEqual([0, 2]);
    expect(brushIsActive({})).toBe(false);
  });

  it("handles a constant axis without dividing by zero", () => {
    const constant = parseCsv("a,b\n2,1\n2,2\n2,3", "constant.csv").dataset;
    const left = constant.columns[0];
    const right = constant.columns[1];
    if (!left || !right) throw new Error("Columns missing");
    const data = buildParallelData(constant.rows, [left, right], null);
    expect(data.dimensions[0]?.constant).toBe(true);
    expect(data.allRecords.every((record) => record.values[0] === 0.5)).toBe(true);
    const dimension = data.dimensions[0];
    if (!dimension) throw new Error("Missing dimension");
    expect(brushRangeFor(dimension, 0, 1)).toEqual({ min: 2, max: 2 });
  });
});
