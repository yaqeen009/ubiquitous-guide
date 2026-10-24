import type { Dataset, VisualizationConfig, WorkspaceStateSnapshot } from "@/types";
import { createDefaultView, evaluateCompatibility, visualizationById } from "@/viz/registry";
import { datasetSignature, loadLocalWorkspace, normalizeWorkspace, saveLocalWorkspace } from "./persistence";

export interface BuiltWorkspace extends WorkspaceStateSnapshot {
  signature: string;
  warnings: string[];
}

/**
 * Conventional default workspace: 3D + linked 2D when the dataset supports
 * both, otherwise a single compatible view. No dataset is forced into 3D.
 */
export function buildDefaultWorkspace(dataset: Dataset, config: VisualizationConfig | null): BuiltWorkspace {
  const hidden = config?.hiddenColumns ?? [];
  const panels = [];
  const def3d = visualizationById("scatter3d");
  const def2d = visualizationById("scatter2d");
  if (def3d && evaluateCompatibility(def3d, dataset, hidden).available) {
    panels.push(
      createDefaultView(
        "scatter3d",
        dataset,
        hidden,
        config ? { x: config.axes.x, y: config.axes.y, z: config.axes.z } : undefined,
      ),
    );
  }
  if (def2d && evaluateCompatibility(def2d, dataset, hidden).available) {
    panels.push(createDefaultView("scatter2d", dataset, hidden, config ? { x: config.twoD.x, y: config.twoD.y } : undefined));
  }
  if (panels.length === 0) {
    panels.push(createDefaultView("table", dataset, hidden));
  }
  return {
    panels,
    layout: panels.length > 1 ? "columns" : "single",
    activePanelId: panels[0]?.id ?? null,
    maximizedPanelId: null,
    splitRatio: 0.5,
    signature: datasetSignature(dataset),
    warnings: [],
  };
}

/** Restore a validated local workspace for this exact dataset, else default. */
export function workspaceForDataset(dataset: Dataset, config: VisualizationConfig | null): BuiltWorkspace {
  const restored = loadLocalWorkspace(dataset);
  if (restored && restored.workspace.panels.length > 0) {
    const reconciled = normalizeWorkspace(restored.workspace, dataset, config?.hiddenColumns ?? []);
    return {
      ...reconciled.workspace,
      signature: datasetSignature(dataset),
      warnings: [...restored.warnings, ...reconciled.warnings],
    };
  }
  const fallback = buildDefaultWorkspace(dataset, config);
  if (restored) fallback.warnings = restored.warnings;
  return fallback;
}

export { saveLocalWorkspace };
