import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig } from "@/data/configuration";
import { parseCsv } from "@/data/parse";
import { buildInferenceCsv } from "@/test/fixtures";
import { resetWorkspaceStore, useWorkspaceStore } from "./useWorkspaceStore";
import { datasetSignature } from "@/workspace/persistence";

const dataset = parseCsv(buildInferenceCsv(), "typed.csv").dataset;
const config = createDefaultConfig(dataset);

function store() {
  return useWorkspaceStore.getState();
}

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetWorkspaceStore();
    store().ensureForDataset(dataset, config);
  });

  it("builds the default linked 3D + 2D workspace for a compatible dataset", () => {
    const state = store();
    expect(state.panels.map((panel) => panel.type)).toEqual(["scatter3d", "scatter2d"]);
    expect(state.layout).toBe("columns");
    expect(state.activePanelId).toBe(state.panels[0]?.id);
    expect(state.signature).toBe(datasetSignature(dataset));
  });

  it("adds, configures, moves, maximizes, and closes views", () => {
    const added = store().addView("histogram", dataset, []);
    expect(added.ok).toBe(true);
    const id = added.ok ? added.id : "";
    const addedPanel = store().panels.find((panel) => panel.id === id);
    expect(addedPanel?.fields.value).toBe("id");
    expect(store().activePanelId).toBe(id);

    store().setPanelField(id, "value", "value");
    store().setPanelOptions(id, { bins: 10 });
    store().setPanelTitle(id, "  Distribution  ");
    expect(store().panels.find((panel) => panel.id === id)).toMatchObject({
      fields: { value: "value" },
      options: { bins: 10 },
      title: "Distribution",
    });

    store().setPanelTitle(id, "   ");
    expect(store().panels.find((panel) => panel.id === id)?.title).toBeUndefined();

    store().moveView(id, -1);
    expect(store().panels[1]?.id).toBe(id);

    store().toggleMaximized(id);
    expect(store().maximizedPanelId).toBe(id);
    store().toggleMaximized(id);
    expect(store().maximizedPanelId).toBeNull();

    store().removeView(id);
    expect(store().panels).toHaveLength(2);
    expect(store().maximizedPanelId).toBeNull();
  });

  it("switches from single to columns then grid as views are added", () => {
    store().removeView(store().panels[1]!.id);
    store().setLayout("single");
    expect(store().panels).toHaveLength(1);

    store().addView("histogram", dataset);
    expect(store().layout).toBe("columns");
    store().addView("table", dataset);
    expect(store().layout).toBe("grid");
  });

  it("refuses incompatible views and exceeding the open-view limit", () => {
    store().resetWorkspace(dataset, config);
    // Remove the two default views, then fill the workspace with tables.
    for (const panel of [...store().panels]) store().removeView(panel.id);

    const onlyOneNumeric = parseCsv("a,b\n1,x\n2,y", "one.csv").dataset;
    const incompatible = store().addView("scatter2d", onlyOneNumeric);
    expect(incompatible.ok).toBe(false);
    if (!incompatible.ok) expect(incompatible.error).toMatch(/numeric columns/);

    for (let index = 0; index < 8; index += 1) {
      expect(store().addView("table", dataset).ok).toBe(true);
    }
    expect(store().addView("table", dataset)).toMatchObject({ ok: false });
    expect(store().panels).toHaveLength(8);
  });

  it("clamps split ratios and prevents a one-view columns layout", () => {
    store().setSplitRatio(0.1);
    expect(store().splitRatio).toBe(0.25);
    store().setSplitRatio(0.99);
    expect(store().splitRatio).toBe(0.75);

    store().setLayout("grid");
    store().removeView(store().panels[1]!.id);
    store().setLayout("columns");
    expect(store().layout).toBe("grid");
  });

  it("applies an imported workspace and ignores repeat dataset initialisation", () => {
    const importedPanels = store().panels;
    store().replaceWorkspace(
      {
        panels: importedPanels,
        layout: "single",
        activePanelId: importedPanels[1]?.id ?? null,
        maximizedPanelId: null,
        splitRatio: 0.6,
      },
      dataset,
      ["note"],
    );
    expect(store().layout).toBe("single");
    expect(store().warnings).toEqual(["note"]);
    expect(store().signature).toBe(datasetSignature(dataset));

    const signature = store().signature;
    const panels = store().panels;
    store().ensureForDataset(dataset, config);
    expect(store().signature).toBe(signature);
    expect(store().panels).toBe(panels);
  });

  it("removes views whose required mappings become excluded, without changing the dataset", () => {
    store().addView("table", dataset, []);
    const added = store().ensureForDataset(dataset, { ...config, hiddenColumns: ["value"] });

    expect(added).toBeUndefined();
    expect(store().panels.map((panel) => panel.type)).toEqual(["table"]);
    expect(store().warnings.join(" ")).toContain("3D scatter plot was skipped");
    expect(store().warnings.join(" ")).toContain("2D scatter plot was skipped");

    store().ensureForDataset(dataset, config);
    expect(store().panels.map((panel) => panel.type)).toEqual(["table"]);
    expect(store().warnings).toEqual([]);
  });

  it("persists the workspace locally for the matching dataset", () => {
    const id = store().panels[0]?.id ?? "";
    store().setActiveView(id);
    const raw = localStorage.getItem("dataspace-workspace-v2");
    expect(raw).toContain(datasetSignature(dataset));
    expect(raw).toContain(id);
  });
});
