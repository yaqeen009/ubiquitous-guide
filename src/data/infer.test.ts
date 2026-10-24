import { describe, expect, it } from "vitest";
import { parseCsv } from "./parse";
import { analyzeColumn, describeColumnType } from "./infer";
import { buildInferenceCsv } from "@/test/fixtures";

describe("analyzeColumn", () => {
  const csv = buildInferenceCsv();
  const { dataset } = parseCsv(csv, "inference.csv");
  const column = (name: string) => {
    const found = dataset.columns.find((candidate) => candidate.name === name);
    if (!found) throw new Error(`Missing column ${name}`);
    return found;
  };

  it("infers numeric, categorical, text, date, and empty columns", () => {
    expect(column("id").type).toBe("numeric");
    expect(column("group").type).toBe("categorical");
    expect(column("label").type).toBe("text");
    expect(column("value").type).toBe("numeric");
    expect(column("when").type).toBe("date");
    expect(column("empty").type).toBe("empty");
  });

  it("keeps a numeric column numeric when a few cells are invalid", () => {
    const value = column("value");
    expect(value.invalidNumericCount).toBe(2);
    expect(value.missingCount).toBe(0);
    expect(value.min).toBe(1.5);
    expect(value.max).toBe(30);
  });

  it("computes min, max, mean and median from valid values only", () => {
    const value = column("value");
    expect(value.mean).toBeCloseTo(15.75, 5);
    expect(value.median).toBeCloseTo(15.75, 5);
  });

  it("counts missing and distinct categorical values", () => {
    const group = column("group");
    expect(group.distinctCount).toBe(2);
    expect(group.categories[0]?.count).toBe(10);
  });

  it("reports empty columns without inventing statistics", () => {
    const empty = column("empty");
    expect(empty.min).toBeNull();
    expect(empty.mean).toBeNull();
    expect(empty.categories).toHaveLength(0);
    expect(describeColumnType(empty)).toContain("Empty");
  });

  it("does not treat a text column as numeric", () => {
    const label = column("label");
    expect(label.min).toBeNull();
    expect(label.invalidNumericCount).toBe(0);
  });

  it("handles a column of only missing values", () => {
    const analysis = analyzeColumn("blank", 0, ["", "  ", ""]);
    expect(analysis.column.type).toBe("empty");
    expect(analysis.column.missingCount).toBe(3);
    expect(analysis.parsed).toEqual([null, null, null]);
  });
});

describe("analyzeColumn with mostly-numeric cells", () => {
  it("falls back to a categorical type when numeric coverage is below 90%", () => {
    const analysis = analyzeColumn("mixed", 0, ["1", "2", "3", "4", "N/A"]);
    expect(analysis.column.type).toBe("categorical");
  });
});
