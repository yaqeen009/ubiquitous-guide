import { describe, expect, it } from "vitest";
import {
  buildCategoryColorMap,
  categoryColor,
  CATEGORICAL_PALETTE,
  MISSING_CATEGORY,
  MISSING_COLOR,
  numericColor,
  OTHER_CATEGORY,
} from "./colors";
import type { DataColumn } from "@/types";

function column(partial: Partial<DataColumn>): DataColumn {
  return {
    name: "Category",
    index: 0,
    type: "categorical",
    missingCount: 0,
    invalidNumericCount: 0,
    distinctCount: 2,
    min: null,
    max: null,
    mean: null,
    median: null,
    categories: [],
    ...partial,
  };
}

describe("numericColor", () => {
  it("maps the unit range to the viridis endpoints", () => {
    expect(numericColor(0)).toBe("#440154");
    expect(numericColor(1)).toBe("#fde725");
  });

  it("clamps and tolerates invalid input", () => {
    expect(numericColor(-1)).toBe("#440154");
    expect(numericColor(2)).toBe("#fde725");
    expect(numericColor(Number.NaN)).toBe("#440154");
  });
});

describe("buildCategoryColorMap", () => {
  it("assigns stable palette colors in category order", () => {
    const map = buildCategoryColorMap(
      column({
        categories: [
          { value: "North", count: 10 },
          { value: "South", count: 4 },
        ],
      }),
    );
    expect(map.entries).toHaveLength(2);
    expect(map.colors.get("North")).toBe(CATEGORICAL_PALETTE[0]);
    expect(map.colors.get("South")).toBe(CATEGORICAL_PALETTE[1]);
    expect(map.grouped).toBe(false);
  });

  it("adds a missing category when blanks exist", () => {
    const map = buildCategoryColorMap(
      column({
        missingCount: 3,
        categories: [{ value: "North", count: 2 }],
      }),
    );
    expect(map.colors.get(MISSING_CATEGORY)).toBe(MISSING_COLOR);
    expect(map.entries.some((entry) => entry.value === MISSING_CATEGORY)).toBe(true);
  });

  it("groups long category lists into ten colors plus Other", () => {
    const categories = Array.from({ length: 20 }, (_, index) => ({
      value: `Value ${index}`,
      count: 20 - index,
    }));
    const map = buildCategoryColorMap(column({ categories, distinctCount: 20 }));
    expect(map.grouped).toBe(true);
    expect(map.colors.get(OTHER_CATEGORY)).toBe(MISSING_COLOR);
    expect(map.entries).toHaveLength(11);
    expect(map.entries.some((entry) => entry.value === OTHER_CATEGORY)).toBe(true);
    expect(map.colors.size).toBe(11);
  });

  it("returns an empty map for an absent column", () => {
    const map = buildCategoryColorMap(undefined);
    expect(map.entries).toHaveLength(0);
    expect(map.grouped).toBe(false);
  });
});

describe("categoryColor", () => {
  const map = buildCategoryColorMap(
    column({ categories: [{ value: "North", count: 2 }], missingCount: 1 }),
  );

  it("resolves known categories and missing values", () => {
    expect(categoryColor(map, "North")).toBe(CATEGORICAL_PALETTE[0]);
    expect(categoryColor(map, "")).toBe(MISSING_COLOR);
    expect(categoryColor(map, MISSING_CATEGORY)).toBe(MISSING_COLOR);
  });

  it("falls back for unknown values", () => {
    expect(categoryColor(map, "Unknown")).toBe("#0072b2");
  });
});
