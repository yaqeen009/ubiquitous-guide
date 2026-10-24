import { describe, expect, it } from "vitest";
import { createDefaultConfig, serializeConfiguration } from "@/data/configuration";
import { parseCsv } from "@/data/parse";
import { buildInferenceCsv } from "@/test/fixtures";
import { createDefaultView } from "@/viz/registry";
import { buildSavedWorkspace, parseWorkspaceConfiguration, serializeWorkspace } from "./configuration";

const dataset = parseCsv(buildInferenceCsv(), "typed.csv").dataset;
const config = createDefaultConfig(dataset);

function workspace() {
  const table = createDefaultView("table", dataset);
  const histogram = createDefaultView("histogram", dataset);
  return {
    panels: [table, histogram],
    layout: "columns" as const,
    activePanelId: histogram.id,
    maximizedPanelId: null,
    splitRatio: 0.44,
  };
}

describe("workspace configuration", () => {
  it("serializes open views, layout, mappings, filters, time ranges, and options", () => {
    const snapshot = workspace();
    snapshot.panels[1]!.options = { bins: 15 };
    const withFilters = {
      ...config,
      filters: {
        ...config.filters,
        numeric: { value: { min: 5, max: 20 } },
        time: { when: { min: Date.UTC(2024, 0, 1), max: Date.UTC(2024, 0, 10) } },
      },
      hiddenColumns: ["empty"],
    };
    const saved = buildSavedWorkspace(snapshot, withFilters, dataset, true);
    expect(saved.kind).toBe("dataspace-workspace");
    expect(saved.version).toBe(2);
    expect(saved.panels).toHaveLength(2);
    expect(saved.spatialMode).toBe(true);
    expect(saved.visualization.filters.numeric.value).toEqual({ min: 5, max: 20 });
    expect(saved.visualization.filters.time?.when).toBeDefined();
    expect(saved.datasetName).toBe(dataset.name);
    expect(saved.columnNames).toEqual(dataset.columns.map((column) => column.name));
    expect(JSON.stringify(saved)).not.toContain("label-1,,");
    expect(JSON.stringify(saved)).not.toContain('"rows"');
  });

  it("parses a version 2 workspace and preserves valid options", () => {
    const snapshot = workspace();
    snapshot.panels[1]!.options = { bins: 10 };
    const saved = JSON.parse(serializeWorkspace(snapshot, config, dataset, false)) as unknown;
    const parsed = parseWorkspaceConfiguration(saved, dataset);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.workspace.panels).toHaveLength(2);
    expect(parsed.workspace.layout).toBe("columns");
    expect(parsed.workspace.activePanelId).toBe(snapshot.activePanelId);
    expect(parsed.workspace.splitRatio).toBe(0.44);
    expect(parsed.workspace.panels[1]?.options.bins).toBe(10);
    expect(parsed.spatialMode).toBe(false);
  });

  it("upgrades version 1 visualization files into a saved workspace", () => {
    const legacy = JSON.parse(serializeConfiguration({ ...config, layout: "split" }, dataset)) as unknown;
    const parsed = parseWorkspaceConfiguration(legacy, dataset);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.workspace.panels).toHaveLength(2);
    expect(parsed.warnings.join(" ")).toMatch(/Version 1 configuration upgraded/);
  });

  it("rejects unsupported versions and kinds without touching the dataset", () => {
    expect(parseWorkspaceConfiguration({ version: 9 }, dataset)).toMatchObject({ ok: false });
    expect(parseWorkspaceConfiguration({ version: 2, kind: "other" }, dataset)).toMatchObject({ ok: false });
    expect(parseWorkspaceConfiguration(null, dataset)).toMatchObject({ ok: false });
  });

  it("drops unknown views and unavailable fields with warnings", () => {
    const snapshot = workspace();
    const raw = JSON.parse(serializeWorkspace(snapshot, config, dataset, false)) as Record<string, unknown>;
    const panels = raw.panels as Array<Record<string, unknown>>;
    panels.push({ id: "future", type: "network", fields: {} });
    const second = panels[1];
    if (!second) throw new Error("Missing second panel");
    second.fields = { value: "group" };

    const parsed = parseWorkspaceConfiguration(raw, dataset);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.workspace.panels).toHaveLength(1);
    expect(parsed.warnings.join(" ")).toMatch(/Unknown visualization type/);
    expect(parsed.warnings.join(" ")).toMatch(/Numeric field/);
  });

  it("restores the default workspace when every saved view is incompatible", () => {
    const raw = JSON.parse(serializeWorkspace(workspace(), config, dataset, false)) as Record<string, unknown>;
    raw.panels = [{ id: "future", type: "network", fields: {} }];
    const parsed = parseWorkspaceConfiguration(raw, dataset);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.workspace.panels.length).toBeGreaterThan(0);
    expect(parsed.warnings.join(" ")).toMatch(/default workspace was restored/);
  });

  it("warns when the file was saved for a different dataset name", () => {
    const raw = JSON.parse(serializeWorkspace(workspace(), config, dataset, false)) as Record<string, unknown>;
    raw.datasetName = "A different dataset";
    const parsed = parseWorkspaceConfiguration(raw, dataset);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.warnings.join(" ")).toMatch(/A different dataset/);
  });
});
