import type {
  Dataset,
  SavedWorkspace,
  VisualizationConfig,
  WorkspaceStateSnapshot,
} from "@/types";
import { createDefaultView, evaluateCompatibility, visualizationById } from "@/viz/registry";
import { buildDefaultWorkspace } from "./defaults";
import { normalizeWorkspace } from "./persistence";
import { parseVisualizationConfig } from "@/data/configuration";

export interface WorkspaceParseSuccess {
  ok: true;
  workspace: WorkspaceStateSnapshot;
  visualization: VisualizationConfig;
  spatialMode: boolean;
  warnings: string[];
}

export interface WorkspaceParseFailure {
  ok: false;
  errors: string[];
}

export type WorkspaceParseResult = WorkspaceParseSuccess | WorkspaceParseFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Build the version 2 workspace export. Open views, layout, mappings, filters,
 * time ranges, and view options are included; uploaded data never is.
 */
export function buildSavedWorkspace(
  workspace: WorkspaceStateSnapshot,
  visualization: VisualizationConfig,
  dataset: Dataset,
  spatialMode: boolean,
): SavedWorkspace {
  return {
    kind: "dataspace-workspace",
    version: 2,
    panels: workspace.panels,
    layout: workspace.layout,
    activePanelId: workspace.activePanelId,
    maximizedPanelId: workspace.maximizedPanelId,
    splitRatio: workspace.splitRatio,
    spatialMode,
    datasetName: dataset.name,
    columnNames: dataset.columns.map((column) => column.name),
    savedAt: new Date().toISOString(),
    visualization,
  };
}

export function serializeWorkspace(
  workspace: WorkspaceStateSnapshot,
  visualization: VisualizationConfig,
  dataset: Dataset,
  spatialMode: boolean,
): string {
  return JSON.stringify(buildSavedWorkspace(workspace, visualization, dataset, spatialMode), null, 2);
}

function workspaceFromLegacyLayout(config: VisualizationConfig, dataset: Dataset): WorkspaceStateSnapshot {
  const hidden = config.hiddenColumns;
  const panels = [];
  const def3d = visualizationById("scatter3d");
  const def2d = visualizationById("scatter2d");
  const wants3d = config.layout !== "2d";
  const wants2d = config.layout !== "3d";
  if (wants3d && def3d && evaluateCompatibility(def3d, dataset, hidden).available) {
    panels.push(
      createDefaultView("scatter3d", dataset, hidden, {
        x: config.axes.x,
        y: config.axes.y,
        z: config.axes.z,
      }),
    );
  }
  if (wants2d && def2d && evaluateCompatibility(def2d, dataset, hidden).available) {
    panels.push(createDefaultView("scatter2d", dataset, hidden, { x: config.twoD.x, y: config.twoD.y }));
  }
  if (panels.length === 0) panels.push(createDefaultView("table", dataset, hidden));
  return {
    panels,
    layout: panels.length > 1 ? "columns" : "single",
    activePanelId: panels[0]?.id ?? null,
    maximizedPanelId: null,
    splitRatio: 0.5,
  };
}

/**
 * Validate a workspace file. Version 1 visualization-only configurations are
 * upgraded. Unknown view types, missing fields, and unavailable views are
 * dropped with warnings rather than breaking the whole import.
 */
export function parseWorkspaceConfiguration(input: unknown, dataset: Dataset): WorkspaceParseResult {
  if (!isRecord(input)) return { ok: false, errors: ["The configuration must be a JSON object."] };

  const isLegacy =
    input.kind === "dataspace-configuration" ||
    (input.version === 1 && input.axes !== undefined && input.visualization === undefined);

  if (isLegacy) {
    const parsed = parseVisualizationConfig(input, dataset);
    if (!parsed.ok) return { ok: false, errors: parsed.errors };
    const workspace = workspaceFromLegacyLayout(parsed.config, dataset);
    return {
      ok: true,
      workspace,
      visualization: parsed.config,
      spatialMode: false,
      warnings: [...parsed.warnings, "Version 1 configuration upgraded to a workspace."],
    };
  }

  if (input.version !== 2) {
    return {
      ok: false,
      errors: [
        `Unsupported workspace version ${String(input.version ?? "missing")}. This build supports version 1 visualization files and version 2 workspaces.`,
      ],
    };
  }
  if (input.kind !== "dataspace-workspace") {
    return { ok: false, errors: ['“kind” must be "dataspace-workspace" for a version 2 workspace.'] };
  }

  const parsedVisualization = parseVisualizationConfig(input.visualization, dataset);
  if (!parsedVisualization.ok) {
    return {
      ok: false,
      errors: parsedVisualization.errors.map((error) => `Visualization settings: ${error}`),
    };
  }
  const visualization = parsedVisualization.config;
  const normalized = normalizeWorkspace(input, dataset, visualization.hiddenColumns);
  const warnings = [...parsedVisualization.warnings, ...normalized.warnings];

  let workspace = normalized.workspace;
  if (workspace.panels.length === 0) {
    const fallback = buildDefaultWorkspace(dataset, visualization);
    workspace = fallback;
    warnings.push("No compatible views were found; the default workspace was restored.");
  }

  const savedName = typeof input.datasetName === "string" ? input.datasetName : null;
  if (savedName && savedName !== dataset.name) {
    warnings.push(`Workspace was saved for “${savedName}” and is being applied to “${dataset.name}”.`);
  }

  return {
    ok: true,
    workspace: {
      panels: workspace.panels,
      layout: workspace.layout,
      activePanelId: workspace.activePanelId,
      maximizedPanelId: workspace.maximizedPanelId,
      splitRatio: workspace.splitRatio,
    },
    visualization,
    spatialMode: input.spatialMode === true,
    warnings,
  };
}
