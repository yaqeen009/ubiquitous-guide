import { beforeEach, describe, expect, it } from "vitest";
import { parseCsv } from "@/data/parse";
import { buildInferenceCsv, CORRELATED_CSV } from "@/test/fixtures";
import { createDefaultView } from "@/viz/registry";
import {
  LOCAL_WORKSPACE_KEY,
  MAX_OPEN_VIEWS,
  datasetSignature,
  loadLocalWorkspace,
  normalizeWorkspace,
  saveLocalWorkspace,
  viewLabel,
} from "./persistence";

const typed = parseCsv(buildInferenceCsv(), "typed.csv").dataset;
const numeric = parseCsv(CORRELATED_CSV, "correlated.csv").dataset;

function panel(type: "table" | "scatter2d" | "scatter3d" | "histogram", dataset = typed) {
  return createDefaultView(type, dataset);
}

describe("workspace normalisation", () => {
  it("restores valid views and falls back to a valid active panel", () => {
    const views = [panel("table"), panel("histogram")];
    const normalized = normalizeWorkspace(
      {
        panels: views,
        layout: "columns",
        activePanelId: "missing",
        maximizedPanelId: views[1]?.id,
        splitRatio: 0.9,
      },
      typed,
    );
    expect(normalized.workspace.panels).toHaveLength(2);
    expect(normalized.workspace.layout).toBe("columns");
    expect(normalized.workspace.activePanelId).toBe(views[0]?.id);
    expect(normalized.workspace.maximizedPanelId).toBe(views[1]?.id);
    expect(normalized.workspace.splitRatio).toBe(0.75);
    expect(normalized.warnings).toEqual([]);
  });

  it("repairs a columns layout that cannot be satisfied", () => {
    const normalized = normalizeWorkspace(
      { panels: [panel("table")], layout: "columns", splitRatio: 0.5 },
      typed,
    );
    expect(normalized.workspace.layout).toBe("single");
    expect(normalized.warnings.join(" ")).toMatch(/Columns layout needs two views/);
  });

  it("drops unknown types and exceeds the open-view limit with warnings", () => {
    const panels = Array.from({ length: MAX_OPEN_VIEWS + 2 }, () => panel("table"));
    panels.splice(1, 0, { id: "unknown", type: "network" } as never);
    const normalized = normalizeWorkspace({ panels, layout: "grid" }, typed);
    expect(normalized.workspace.panels).toHaveLength(MAX_OPEN_VIEWS - 1);
    expect(normalized.warnings.join(" ")).toMatch(/Only the first 8 views/);
    expect(normalized.warnings.join(" ")).toMatch(/Unknown visualization type/);
  });

  it("replaces duplicate identity strings without losing the view", () => {
    const first = panel("table");
    const second = panel("histogram");
    second.id = first.id;
    const normalized = normalizeWorkspace({ panels: [first, second], layout: "columns" }, typed);
    expect(normalized.workspace.panels).toHaveLength(2);
    expect(new Set(normalized.workspace.panels.map((view) => view.id)).size).toBe(2);
    expect(normalized.warnings.join(" ")).toMatch(/Duplicate view id/);
  });

  it("clears fields that are hidden or invalid for the dataset", () => {
    const view = panel("scatter3d", numeric);
    view.fields = { x: "x", y: "y", z: "missing" };
    const normalized = normalizeWorkspace({ panels: [view] }, numeric, ["z"]);
    expect(normalized.workspace.panels).toHaveLength(1);
    expect(normalized.workspace.panels[0]?.fields).toEqual({ x: "x", y: "y", z: null });
    expect(normalized.warnings.join(" ")).toMatch(/Z axis/);

    view.fields = { x: "x", y: "y", z: null };
    expect(normalizeWorkspace({ panels: [view] }, numeric, ["y"]).workspace.panels).toHaveLength(0);
  });

  it("returns an empty, safe workspace for malformed input", () => {
    expect(normalizeWorkspace(null, typed).workspace.panels).toHaveLength(0);
    expect(normalizeWorkspace([], typed).workspace.layout).toBe("single");
    expect(normalizeWorkspace({ panels: "bad", layout: "grid" }, typed).workspace.layout).toBe("single");
  });
});

describe("local workspace persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a workspace only for the matching dataset signature", () => {
    const workspace = {
      panels: [panel("table"), panel("histogram")],
      layout: "columns" as const,
      activePanelId: null,
      maximizedPanelId: null,
      splitRatio: 0.4,
    };
    saveLocalWorkspace(workspace, datasetSignature(typed));
    expect(localStorage.getItem(LOCAL_WORKSPACE_KEY)).not.toBeNull();

    const restored = loadLocalWorkspace(typed);
    expect(restored?.workspace.panels).toHaveLength(2);
    expect(restored?.workspace.splitRatio).toBe(0.4);
    expect(restored?.workspace.activePanelId).toBe(workspace.panels[0]?.id);

    expect(loadLocalWorkspace(numeric)).toBeNull();
  });

  it("ignores corrupt or unknown-version local data", () => {
    localStorage.setItem(LOCAL_WORKSPACE_KEY, "{");
    expect(loadLocalWorkspace(typed)).toBeNull();
    localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ version: 2, workspace: {} }));
    expect(loadLocalWorkspace(typed)).toBeNull();
    localStorage.setItem(
      LOCAL_WORKSPACE_KEY,
      JSON.stringify({ version: 1, signature: datasetSignature(typed), workspace: { panels: [] } }),
    );
    expect(loadLocalWorkspace(typed)?.workspace.panels).toEqual([]);
  });

  it("labels views by custom title, then registry name", () => {
    const view = panel("table");
    expect(viewLabel(view)).toBe("Table");
    expect(viewLabel({ ...view, title: "Station records" })).toBe("Station records");
  });
});
