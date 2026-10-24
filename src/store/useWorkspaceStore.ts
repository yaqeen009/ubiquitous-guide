import { create } from "zustand";
import type {
  Dataset,
  VisualizationConfig,
  VisualizationId,
  WorkspaceLayout,
  WorkspaceStateSnapshot,
} from "@/types";
import {
  createDefaultView,
  evaluateCompatibility,
  isVisualizationId,
  visualizationById,
} from "@/viz/registry";
import {
  MAX_OPEN_VIEWS,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  datasetSignature,
  normalizeWorkspace,
  saveLocalWorkspace,
} from "@/workspace/persistence";
import { workspaceForDataset } from "@/workspace/defaults";

const EMPTY_WORKSPACE: WorkspaceStateSnapshot = {
  panels: [],
  layout: "single",
  activePanelId: null,
  maximizedPanelId: null,
  splitRatio: 0.5,
};

export type AddViewResult = { ok: true; id: string } | { ok: false; error: string };

interface WorkspaceStore extends WorkspaceStateSnapshot {
  signature: string | null;
  hiddenKey: string;
  spatialMode: boolean;
  warnings: string[];
  ensureForDataset: (dataset: Dataset, config: VisualizationConfig | null) => void;
  addView: (type: VisualizationId, dataset: Dataset, hidden?: string[]) => AddViewResult;
  removeView: (id: string) => void;
  setActiveView: (id: string) => void;
  setPanelField: (id: string, field: string, column: string | null) => void;
  setPanelOptions: (id: string, options: Record<string, string | number | boolean | null>) => void;
  setPanelTitle: (id: string, title: string) => void;
  resetPanel: (id: string, dataset: Dataset, hidden?: string[]) => void;
  moveView: (id: string, direction: -1 | 1) => void;
  setLayout: (layout: WorkspaceLayout) => void;
  toggleMaximized: (id: string) => void;
  clearMaximized: () => void;
  setSplitRatio: (ratio: number) => void;
  setSpatialMode: (enabled: boolean) => void;
  replaceWorkspace: (
    workspace: WorkspaceStateSnapshot,
    dataset: Dataset,
    warnings?: string[],
    hidden?: string[],
  ) => void;
  clearWarnings: () => void;
  resetWorkspace: (dataset: Dataset, config: VisualizationConfig | null) => void;
}

function exclusionKey(hidden: string[]): string {
  return [...hidden].sort().join("\u0000");
}

function snapshot(state: WorkspaceStore): WorkspaceStateSnapshot {
  return {
    panels: state.panels,
    layout: state.layout,
    activePanelId: state.activePanelId,
    maximizedPanelId: state.maximizedPanelId,
    splitRatio: state.splitRatio,
  };
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => {
  const persist = () => {
    const state = get();
    if (!state.signature) return;
    saveLocalWorkspace(snapshot(state), state.signature);
  };

  return {
    ...EMPTY_WORKSPACE,
    signature: null,
    hiddenKey: "",
    spatialMode: false,
    warnings: [],

    ensureForDataset: (dataset, config) => {
      const signature = datasetSignature(dataset);
      const hidden = config?.hiddenColumns ?? [];
      const nextHiddenKey = exclusionKey(hidden);
      if (get().signature === signature) {
        if (get().hiddenKey === nextHiddenKey) return;
        const normalized = normalizeWorkspace(snapshot(get()), dataset, hidden);
        set({
          ...normalized.workspace,
          hiddenKey: nextHiddenKey,
          warnings: normalized.warnings,
        });
        persist();
        return;
      }
      const built = workspaceForDataset(dataset, config);
      set({
        panels: built.panels,
        layout: built.layout,
        activePanelId: built.activePanelId,
        maximizedPanelId: built.maximizedPanelId,
        splitRatio: built.splitRatio,
        signature: built.signature,
        hiddenKey: nextHiddenKey,
        spatialMode: false,
        warnings: built.warnings,
      });
    },

    addView: (type, dataset, hidden = []) => {
      const state = get();
      if (state.panels.length >= MAX_OPEN_VIEWS) {
        return { ok: false, error: `The workspace supports up to ${MAX_OPEN_VIEWS} open views. Close one first.` };
      }
      const definition = visualizationById(type);
      if (!definition) return { ok: false, error: "Unknown visualization type." };
      const compatibility = evaluateCompatibility(definition, dataset, hidden);
      if (!compatibility.available) return { ok: false, error: compatibility.message };
      const view = createDefaultView(type, dataset, hidden);
      const panels = [...state.panels, view];
      const layout: WorkspaceLayout =
        panels.length > 2
          ? "grid"
          : state.layout === "single" && panels.length > 1
            ? "columns"
            : state.layout;
      set({
        panels,
        layout,
        activePanelId: view.id,
        maximizedPanelId: null,
      });
      persist();
      return { ok: true, id: view.id };
    },

    removeView: (id) => {
      const state = get();
      const index = state.panels.findIndex((panel) => panel.id === id);
      if (index < 0) return;
      const panels = state.panels.filter((panel) => panel.id !== id);
      const nextActive =
        state.activePanelId === id
          ? panels[Math.min(index, panels.length - 1)]?.id ?? null
          : state.activePanelId;
      set({
        panels,
        activePanelId: nextActive,
        maximizedPanelId: state.maximizedPanelId === id ? null : state.maximizedPanelId,
        layout: panels.length < 2 && state.layout === "columns" ? "single" : state.layout,
      });
      persist();
    },

    setActiveView: (id) => {
      if (!get().panels.some((panel) => panel.id === id)) return;
      set({ activePanelId: id });
      persist();
    },

    setPanelField: (id, field, column) => {
      const state = get();
      set({
        panels: state.panels.map((panel) =>
          panel.id === id ? { ...panel, fields: { ...panel.fields, [field]: column } } : panel,
        ),
      });
      persist();
    },

    setPanelOptions: (id, options) => {
      const state = get();
      set({
        panels: state.panels.map((panel) =>
          panel.id === id ? { ...panel, options: { ...panel.options, ...options } } : panel,
        ),
      });
      persist();
    },

    setPanelTitle: (id, title) => {
      const state = get();
      set({
        panels: state.panels.map((panel) =>
          panel.id === id ? { ...panel, ...(title.trim() ? { title: title.trim().slice(0, 80) } : { title: undefined }) } : panel,
        ),
      });
      persist();
    },

    resetPanel: (id, dataset, hidden = []) => {
      const state = get();
      const existing = state.panels.find((panel) => panel.id === id);
      if (!existing || !isVisualizationId(existing.type)) return;
      const fresh = createDefaultView(existing.type, dataset, hidden);
      set({
        panels: state.panels.map((panel) =>
          panel.id === id ? { ...panel, fields: fresh.fields, options: fresh.options } : panel,
        ),
      });
      persist();
    },

    moveView: (id, direction) => {
      const state = get();
      const index = state.panels.findIndex((panel) => panel.id === id);
      if (index < 0) return;
      const target = index + direction;
      if (target < 0 || target >= state.panels.length) return;
      const panels = [...state.panels];
      const [moved] = panels.splice(index, 1);
      if (!moved) return;
      panels.splice(target, 0, moved);
      set({ panels });
      persist();
    },

    setLayout: (layout) => {
      if (layout === "columns" && get().panels.length < 2) return;
      set({ layout });
      persist();
    },

    toggleMaximized: (id) => {
      const state = get();
      if (!state.panels.some((panel) => panel.id === id)) return;
      set({
        maximizedPanelId: state.maximizedPanelId === id ? null : id,
        activePanelId: id,
      });
      persist();
    },

    clearMaximized: () => {
      set({ maximizedPanelId: null });
      persist();
    },

    setSplitRatio: (ratio) => {
      if (!Number.isFinite(ratio)) return;
      set({ splitRatio: Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio)) });
      persist();
    },

    setSpatialMode: (enabled) => {
      set({ spatialMode: enabled, maximizedPanelId: null });
    },

    replaceWorkspace: (workspace, dataset, warnings = [], hidden = []) => {
      set({
        panels: workspace.panels,
        layout: workspace.layout,
        activePanelId: workspace.activePanelId ?? workspace.panels[0]?.id ?? null,
        maximizedPanelId: workspace.maximizedPanelId,
        splitRatio: workspace.splitRatio,
        signature: datasetSignature(dataset),
        hiddenKey: exclusionKey(hidden),
        spatialMode: false,
        warnings,
      });
      persist();
    },

    clearWarnings: () => set({ warnings: [] }),

    resetWorkspace: (dataset, config) => {
      const built = workspaceForDataset(dataset, config);
      set({
        panels: built.panels,
        layout: built.layout,
        activePanelId: built.activePanelId,
        maximizedPanelId: built.maximizedPanelId,
        splitRatio: built.splitRatio,
        signature: built.signature,
        hiddenKey: exclusionKey(config?.hiddenColumns ?? []),
        spatialMode: false,
        warnings: built.warnings,
      });
      persist();
    },
  };
});

export function resetWorkspaceStore(): void {
  useWorkspaceStore.setState({
    ...EMPTY_WORKSPACE,
    signature: null,
    hiddenKey: "",
    spatialMode: false,
    warnings: [],
  });
}
