import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  applyFilters,
  categoryMatches,
  createEmptyFilters,
  getCategoryOptions,
  hasActiveFilters,
  removeCategoricalFilter,
  removeNumericFilter,
  rowMatchesFilters,
  toggleCategory,
} from "./filters";
import { MISSING_CATEGORY } from "./colors";
import { parseCsv } from "./parse";
import { MIXED_CSV } from "@/test/fixtures";

const { dataset } = parseCsv(MIXED_CSV, "mixed.csv");

describe("filter state", () => {
  it("counts search, numeric and categorical groups", () => {
    const filters = createEmptyFilters();
    expect(activeFilterCount(filters)).toBe(0);
    expect(hasActiveFilters(filters)).toBe(false);

    expect(activeFilterCount({ ...filters, search: "north" })).toBe(1);
    expect(activeFilterCount({ ...filters, numeric: { "PM2.5": { min: 0, max: 50 } } })).toBe(1);
    expect(
      activeFilterCount({
        ...filters,
        categorical: { Region: ["North"], Zone: [] },
      }),
    ).toBe(1);
  });

  it("ignores blank search text", () => {
    expect(activeFilterCount({ ...createEmptyFilters(), search: "   " })).toBe(0);
  });
});

describe("categoryMatches", () => {
  it("treats an empty selection as unrestricted", () => {
    expect(categoryMatches("North", [])).toBe(true);
    expect(categoryMatches("", [])).toBe(true);
  });

  it("matches the synthetic missing category for empty cells", () => {
    expect(categoryMatches("", [MISSING_CATEGORY])).toBe(true);
    expect(categoryMatches("North", [MISSING_CATEGORY])).toBe(false);
    expect(categoryMatches("", ["North"])).toBe(false);
  });
});

describe("applyFilters", () => {
  it("returns every row when no filter is active", () => {
    expect(applyFilters(dataset, createEmptyFilters())).toHaveLength(5);
  });

  it("excludes rows with a missing numeric value", () => {
    const filters = {
      ...createEmptyFilters(),
      numeric: { "PM2.5": { min: 0, max: 20 } },
    };
    const rows = applyFilters(dataset, filters);
    expect(rows.map((row) => row.raw[0])).toEqual(["AQ-1", "AQ-4"]);
  });

  it("filters by category, including missing values", () => {
    const north = applyFilters(dataset, {
      ...createEmptyFilters(),
      categorical: { Region: ["North"] },
    });
    expect(north).toHaveLength(3);
  });

  it("requires every search term to appear in the row", () => {
    const filters = { ...createEmptyFilters(), search: "north industrial" };
    const rows = applyFilters(dataset, filters);
    expect(rows.map((row) => row.raw[0])).toEqual(["AQ-3"]);
  });

  it("is case-insensitive and matches raw cell text", () => {
    expect(applyFilters(dataset, { ...createEmptyFilters(), search: "NEEDS" })).toHaveLength(1);
    expect(applyFilters(dataset, { ...createEmptyFilters(), search: "aq-5" })).toHaveLength(1);
  });

  it("combines numeric, categorical, and search filters", () => {
    const filters = {
      search: "river",
      numeric: { "PM2.5": { min: 0, max: 20 } },
      categorical: { Region: ["West"] },
    };
    expect(applyFilters(dataset, filters)).toHaveLength(1);
  });

  it("ignores filters for columns that do not exist", () => {
    const filters = { ...createEmptyFilters(), numeric: { Ghost: { min: 0, max: 1 } } };
    expect(applyFilters(dataset, filters)).toHaveLength(5);
  });

  it("matches individual rows consistently", () => {
    const row = dataset.rows[0];
    if (!row) throw new Error("Missing fixture row");
    expect(rowMatchesFilters(row, dataset, createEmptyFilters())).toBe(true);
  });
});

describe("category options and helpers", () => {
  it("adds a missing option when the column has blanks", () => {
    const zone = dataset.columns.find((column) => column.name === "Zone");
    if (!zone) throw new Error("Missing Zone column");
    const options = getCategoryOptions(zone);
    expect(options.some((option) => option.isMissing === false)).toBe(true);
    expect(options).toHaveLength(zone.categories.length + (zone.missingCount > 0 ? 1 : 0));
  });

  it("toggles values immutably", () => {
    const start = ["A"];
    const added = toggleCategory(start, "B");
    expect(start).toEqual(["A"]);
    expect(added).toEqual(["A", "B"]);
    expect(toggleCategory(added, "A")).toEqual(["B"]);
  });

  it("removes individual filter groups without mutating the input", () => {
    const filters = {
      search: "",
      numeric: { Alpha: { min: 1, max: 2 }, Beta: { min: 3, max: 4 } },
      categorical: { Group: ["A"] },
    };
    const withoutAlpha = removeNumericFilter(filters, "Alpha");
    expect(withoutAlpha.numeric).toEqual({ Beta: { min: 3, max: 4 } });
    expect(filters.numeric.Alpha).toBeDefined();

    const withoutGroup = removeCategoricalFilter(filters, "Group");
    expect(withoutGroup.categorical).toEqual({});
    expect(filters.categorical.Group).toEqual(["A"]);
  });
});
