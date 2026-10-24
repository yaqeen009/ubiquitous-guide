import { describe, expect, it } from "vitest";
import {
  buildSavedConfiguration,
  createDefaultConfig,
  parseVisualizationConfig,
  pearsonCorrelation,
  serializeConfiguration,
} from "./configuration";
import { parseCsv } from "./parse";
import { MIXED_CSV, CORRELATED_CSV } from "@/test/fixtures";
import type { VisualizationConfig } from "@/types";

const { dataset } = parseCsv(MIXED_CSV, "mixed.csv");
const correlated = parseCsv(CORRELATED_CSV, "correlated.csv").dataset;

function validConfig(): VisualizationConfig {
  return createDefaultConfig(dataset);
}

describe("createDefaultConfig", () => {
  it("chooses numeric axes, a categorical color, and a 3D layout", () => {
    const config = createDefaultConfig(dataset);
    expect(config.version).toBe(1);
    expect(config.axes.x).toBe("PM2.5");
    expect(config.axes.y).toBe("NO2");
    expect(config.axes.z).toBeNull();
    expect(config.color.mode).toBe("categorical");
    expect(config.color.column).toBe("Station");
    expect(config.layout).toBe("3d");
    expect(config.hiddenColumns).toEqual([]);
    expect(config.filters).toEqual({ search: "", numeric: {}, categorical: {} });
  });

  it("avoids degenerate axis pairs by picking low-correlation Y and Z", () => {
    const config = createDefaultConfig(correlated);
    expect(config.axes).toEqual({ x: "x", y: "z", z: "y" });
    expect(config.twoD).toEqual({ x: "x", y: "z" });
  });

  it("returns unmapped axes when no numeric columns exist", () => {
    const { dataset: textOnly } = parseCsv("Name,Note\nalpha,one\nbeta,two", "text.csv");
    const config = createDefaultConfig(textOnly);
    expect(config.axes).toEqual({ x: null, y: null, z: null });
    expect(config.twoD).toEqual({ x: null, y: null });
    expect(config.color.mode).toBe("categorical");
  });
});

describe("pearsonCorrelation", () => {
  it("detects perfect positive correlation", () => {
    const x = correlated.columns.find((column) => column.name === "x");
    const y = correlated.columns.find((column) => column.name === "y");
    if (!x || !y) throw new Error("Missing columns");
    expect(pearsonCorrelation(correlated, x, y)).toBeCloseTo(1, 6);
  });

  it("returns null for constant columns", () => {
    const { dataset: constant } = parseCsv("a,b\n1,2\n1,4\n1,6", "constant.csv");
    const a = constant.columns[0]!;
    const b = constant.columns[1]!;
    expect(pearsonCorrelation(constant, a, b)).toBeNull();
  });
});

describe("parseVisualizationConfig", () => {
  it("round-trips a saved configuration", () => {
    const config = createDefaultConfig(dataset);
    config.layout = "split";
    config.filters.numeric["PM2.5"] = { min: 5, max: 30 };
    config.hiddenColumns = ["Note"];
    const json = serializeConfiguration(config, dataset);

    const parsed = parseVisualizationConfig(JSON.parse(json), dataset);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.config.layout).toBe("split");
    expect(parsed.config.filters.numeric["PM2.5"]).toEqual({ min: 5, max: 30 });
    expect(parsed.config.hiddenColumns).toEqual(["Note"]);
  });

  it("includes metadata in a saved snapshot", () => {
    const saved = buildSavedConfiguration(validConfig(), dataset);
    expect(saved.kind).toBe("dataspace-configuration");
    expect(saved.datasetName).toBe("mixed");
    expect(saved.columnNames).toEqual(dataset.columns.map((column) => column.name));
    expect(saved.savedAt).toMatch(/^\d{4}-/);
  });

  it("rejects non-objects and unsupported versions", () => {
    expect(parseVisualizationConfig(null).ok).toBe(false);
    expect(parseVisualizationConfig({ ...validConfig(), version: 2 }).ok).toBe(false);
  });

  it("rejects malformed display settings and reversed ranges", () => {
    expect(parseVisualizationConfig({ ...validConfig(), display: { pointSize: 0, opacity: 2 } }).ok).toBe(false);
    const config = validConfig();
    const bad = { ...config, filters: { ...config.filters, numeric: { "PM2.5": { min: 10, max: 1 } } } };
    const parsed = parseVisualizationConfig(bad);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.join(" ")).toContain("min greater than max");
  });

  it("checks column references against the dataset", () => {
    const config = validConfig();
    const parsed = parseVisualizationConfig(
      { ...config, axes: { ...config.axes, x: "Missing column" } },
      dataset,
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.join(" ")).toContain("missing column");
  });

  it("rejects non-numeric axis mappings", () => {
    const config = validConfig();
    const parsed = parseVisualizationConfig({ ...config, axes: { ...config.axes, x: "Region" } }, dataset);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.join(" ")).toContain("not numeric");
  });

  it("rejects excluded columns that are still mapped or filtered", () => {
    const config = validConfig();
    const parsed = parseVisualizationConfig(
      { ...config, hiddenColumns: [config.axes.x] },
      dataset,
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.join(" ")).toContain("excluded");
  });

  it("warns when a config is applied to a different dataset", () => {
    const json = JSON.parse(serializeConfiguration(validConfig(), dataset));
    const parsed = parseVisualizationConfig(json, { ...dataset, name: "Another dataset" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.warnings.join(" ")).toContain("saved for");
  });

  it("normalizes disabled size and color mappings", () => {
    const config = validConfig();
    const parsed = parseVisualizationConfig(
      {
        ...config,
        color: { mode: "none", column: "Region" },
        size: { enabled: false, column: "PM2.5" },
      },
      dataset,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.config.color.column).toBeNull();
    expect(parsed.config.size.column).toBeNull();
    expect(parsed.warnings).toHaveLength(2);
  });
});
