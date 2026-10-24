import type { Dataset, ViewInstance, WorkspaceLayout, WorkspaceStateSnapshot } from "@/types";
import { isVisualizationId, normalizeViewInstance, visualizationById } from "@/viz/registry";

export const LOCAL_WORKSPACE_KEY = "dataspace-workspace-v2";
export const MAX_OPEN_VIEWS = 8;
export const MIN_SPLIT_RATIO = 0.25;
export const MAX_SPLIT_RATIO = 0.75;

export function datasetSignature(dataset: Dataset): string {
  return `${dataset.name}|${dataset.rows.length}|${dataset.columns.map((column) => `${column.name}:${column.type}`).join(",")}`;
}

function clampRatio(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, value));
}

function parseLayout(value: unknown): WorkspaceLayout {
  return value === "single" || value === "columns" || value === "grid" ? value : "single";
}

export interface WorkspaceNormalization {
  workspace: Omit<WorkspaceStateSnapshot, "panels"> & { panels: ViewInstance[] };
  warnings: string[];
}

/**
 * Validate an untrusted workspace shape against a dataset.
 *
 * Unknown visualization types and views whose required fields are missing are
 * skipped with warnings. Duplicate instance IDs are replaced. An empty result
 * is valid and lets callers fall back to the default workspace.
 */
export function normalizeWorkspace(input: unknown, dataset: Dataset, hidden: string[] = []): WorkspaceNormalization {
  const warnings: string[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      workspace: { panels: [], layout: "single", activePanelId: null, maximizedPanelId: null, splitRatio: 0.5 },
      warnings: ["Workspace was not an object; the default layout was used."],
    };
  }
  const record = input as Record<string, unknown>;
  const rawPanels = Array.isArray(record.panels) ? record.panels : [];
  if (!Array.isArray(record.panels)) warnings.push("Workspace panels were missing; the default layout was used.");
  if (rawPanels.length > MAX_OPEN_VIEWS) {
    warnings.push(`Only the first ${MAX_OPEN_VIEWS} views were restored.`);
  }

  const panels: ViewInstance[] = [];
  const ids = new Set<string>();
  for (const raw of rawPanels.slice(0, MAX_OPEN_VIEWS)) {
    const normalized = normalizeViewInstance(raw, dataset, hidden);
    warnings.push(...normalized.warnings);
    const view = normalized.view;
    if (!view) continue;
    if (ids.has(view.id)) {
      warnings.push(`Duplicate view id “${view.id}” was replaced.`);
      view.id = `${view.id}-${panels.length + 1}`;
    }
    ids.add(view.id);
    panels.push(view);
  }

  if (record.layout === "columns" && panels.length < 2) {
    warnings.push("Columns layout needs two views; restored as a single view.");
  }

  let layout = panels.length === 0 ? "single" : parseLayout(record.layout);
  if (layout === "columns" && panels.length < 2) layout = "single";
  const activeCandidate = typeof record.activePanelId === "string" ? record.activePanelId : null;
  const activePanelId = activeCandidate && ids.has(activeCandidate) ? activeCandidate : panels[0]?.id ?? null;
  const maximizedCandidate = typeof record.maximizedPanelId === "string" ? record.maximizedPanelId : null;
  const maximizedPanelId = maximizedCandidate && ids.has(maximizedCandidate) ? maximizedCandidate : null;

  return {
    workspace: {
      panels,
      layout,
      activePanelId,
      maximizedPanelId,
      splitRatio: clampRatio(record.splitRatio),
    },
    warnings,
  };
}

export function loadLocalWorkspace(dataset: Dataset): WorkspaceNormalization | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== 1) return null;
    if (record.signature !== datasetSignature(dataset)) return null;
    return normalizeWorkspace(record.workspace, dataset);
  } catch {
    return null;
  }
}

export function saveLocalWorkspace(
  workspace: WorkspaceStateSnapshot,
  signature: string,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      LOCAL_WORKSPACE_KEY,
      JSON.stringify({ version: 1, signature, workspace }),
    );
  } catch {
    // Quota or privacy mode can disable storage; the session still works.
  }
}

export function clearLocalWorkspace(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_WORKSPACE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

/** Short label used in the workspace header and spatial cards. */
export function viewLabel(view: ViewInstance): string {
  const definition = isVisualizationId(view.type) ? visualizationById(view.type) : undefined;
  return view.title ?? definition?.shortName ?? "View";
}
