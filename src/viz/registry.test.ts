import { describe, expect, it } from "vitest";
import { parseCsv } from "@/data/parse";
import { CORRELATED_CSV, buildInferenceCsv } from "@/test/fixtures";
import {
  VISUALIZATIONS,
  columnForKind,
  columnsForKind,
  createDefaultView,
  evaluateCompatibility,
  isVisualizationId,
  normalizeViewInstance,
  visualizationById,
} from "./registry";

const twoNumeric = parseCsv(CORRELATED_CSV, "correlated.csv").dataset;
const typed = parseCsv(buildInferenceCsv(), "typed.csv").dataset;

describe("visualization registry", () => {
  it("registers every initial view with unique ids and stable metadata", () => {
    expect(VISUALIZATIONS).toHaveLength(7);
    expect(new Set(VISUALIZATIONS.map((definition) => definition.id)).size).toBe(7);
    for (const definition of VISUALIZATIONS) {
      expect(visualizationById(definition.id)).toBe(definition);
      expect(definition.name.length).toBeGreaterThan(0);
      expect(definition.description.length).toBeGreaterThan(0);
      expect(definition.usefulFor.length).toBeGreaterThan(0);
      expect(definition.selectionNote.length).toBeGreaterThan(0);
      expect(definition.component).toBeTypeOf("function");
      expect(new Set(definition.fields.map((field) => field.key)).size).toBe(definition.fields.length);
      expect(isVisualizationId(definition.id)).toBe(true);
    }
    expect(isVisualizationId("network")).toBe(false);
    expect(visualizationById("network" as never)).toBeUndefined();
  });

  it("uses explicit selection semantics for every view", () => {
    expect(visualizationById("scatter3d")?.capabilities.selection).toBe("record");
    expect(visualizationById("histogram")?.capabilities.selection).toBe("filter");
    expect(visualizationById("correlation")?.capabilities.selection).toBe("none");
    expect(visualizationById("parallel")?.capabilities.selection).toBe("multiple");
  });

  it("evaluates compatibility from available field kinds", () => {
    const timeSeries = visualizationById("timeseries");
    const table = visualizationById("table");
    if (!timeSeries || !table) throw new Error("Missing definitions");

    expect(evaluateCompatibility(timeSeries, twoNumeric).available).toBe(false);
    expect(evaluateCompatibility(timeSeries, twoNumeric).message).toMatch(/date column/);
    expect(evaluateCompatibility(timeSeries, typed).available).toBe(true);
    expect(evaluateCompatibility(table, twoNumeric)).toMatchObject({ available: true, issues: [] });
  });

  it("suggests a compatible 2D alternative when 3D loses a required numeric column", () => {
    const scatter3d = visualizationById("scatter3d");
    const scatter2d = visualizationById("scatter2d");
    if (!scatter3d || !scatter2d) throw new Error("Missing definitions");
    // Hiding one of two numeric columns leaves neither scatter usable; the table stays valid.
    const typedHidden = evaluateCompatibility(scatter3d, twoNumeric, ["x", "y"]);
    expect(typedHidden.available).toBe(false);
    expect(typedHidden.alternative).toBe("table");
    expect(evaluateCompatibility(scatter2d, typed).available).toBe(true);
  });

  it("filters column choices by kind and exclusion", () => {
    expect(columnsForKind(typed, "date").map((column) => column.name)).toEqual(["when"]);
    expect(columnsForKind(typed, "numeric").map((column) => column.name)).toEqual(["id", "value"]);
    expect(columnsForKind(typed, "numeric", ["value"]).map((column) => column.name)).toEqual(["id"]);
    expect(columnForKind(typed, "when", "date")?.name).toBe("when");
    expect(columnForKind(typed, "when", "numeric")).toBeNull();
    expect(columnForKind(typed, "missing", "numeric")).toBeNull();
  });

  it("creates valid default mappings without crossing field kinds", () => {
    const timeSeries = createDefaultView("timeseries", typed);
    expect(timeSeries.fields).toEqual({ date: "when", value: "id", category: null });
    expect(timeSeries.options.maxSeries).toBe(6);

    const parallel = createDefaultView("parallel", typed);
    expect(parallel.fields).toEqual({ d1: "id", d2: "value", d3: null, d4: null, d5: null });

    const scatter = createDefaultView("scatter3d", typed, [], { x: "value", y: "id", z: null });
    expect(scatter.fields).toEqual({ x: "value", y: "id", z: null });

    const hidden = createDefaultView("scatter2d", typed, ["id"]);
    expect(hidden.fields).toEqual({ x: "value", y: null });
  });

  it("normalises saved views and rejects unknown or unfulfillable definitions", () => {
    const unknown = normalizeViewInstance({ id: "v1", type: "network" }, typed);
    expect(unknown.view).toBeNull();
    expect(unknown.warnings[0]).toMatch(/Unknown visualization type/);

    const invalid = normalizeViewInstance(
      { id: "v2", type: "timeseries", fields: { date: "group", value: "value" }, options: { maxSeries: 4 } },
      typed,
    );
    expect(invalid.view).toBeNull();
    expect(invalid.warnings.join(" ")).toMatch(/Time field/);

    const restored = normalizeViewInstance(
      {
        id: "custom",
        type: "scatter2d",
        title: "  My view  ",
        fields: { x: "id", y: "value" },
        options: { unsupported: "ok" },
      },
      typed,
    );
    expect(restored.view).toMatchObject({
      id: "custom",
      type: "scatter2d",
      title: "My view",
      fields: { x: "id", y: "value" },
    });
    expect(restored.view?.options.unsupported).toBe("ok");
  });

  it("clears hidden or wrongly typed optional fields instead of dropping the view", () => {
    const result = normalizeViewInstance(
      { id: "v3", type: "scatter3d", fields: { x: "id", y: "value", z: "group" } },
      typed,
    );
    expect(result.view).not.toBeNull();
    expect(result.view?.fields.z).toBeNull();
    expect(result.warnings.join(" ")).toMatch(/Z axis/);
  });
});
