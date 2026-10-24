import { create } from "zustand";
import type {
  AxisSettings,
  ColorMode,
  Dataset,
  DisplaySettings,
  Filters,
  ImportIssue,
  SizeSettings,
  ViewLayout,
  VisualizationConfig,
} from "@/types";
import { parseCsv, validateCsvFile, CsvImportError } from "@/data/parse";
import { createDefaultConfig } from "@/data/configuration";
import { MAX_FILE_BYTES } from "@/data/limits";
import { createEmptyFilters, removeCategoricalFilter, removeNumericFilter, removeTimeFilter, toggleCategory } from "@/data/filters";
import { loadDemoDataset } from "@/data/demo";

export type LoadStatus = "empty" | "parsing" | "ready" | "error";
export type Theme = "light" | "dark";

interface DataSpaceState {
  dataset: Dataset | null;
  status: LoadStatus;
  error: string | null;
  issues: ImportIssue[];
  config: VisualizationConfig | null;
  selectedRowId: number | null;
  /** All selected record identifiers; `selectedRowId` is the primary record. */
  selectedRowIds: number[];
  cameraResetToken: number;
  theme: Theme;
  toast: string | null;

  loadDemo: () => void;
  loadFile: (file: File) => Promise<void>;
  loadText: (text: string, filename: string, fileSize?: number) => void;
  setParsing: () => void;
  fail: (message: string) => void;
  clearError: () => void;
  clearDataset: () => void;
  dismissIssues: () => void;

  setAxis: (axis: keyof AxisSettings, column: string) => void;
  setTwoDAxis: (axis: "x" | "y", column: string) => void;
  setColor: (mode: ColorMode, column: string | null) => void;
  setSize: (settings: Partial<SizeSettings>) => void;
  setDisplay: (settings: Partial<DisplaySettings>) => void;
  setLayout: (layout: ViewLayout) => void;
  setFilters: (filters: Filters) => void;
  setSearch: (search: string) => void;
  setNumericFilter: (column: string, min: number, max: number) => void;
  clearNumericFilter: (column: string) => void;
  setTimeFilter: (column: string, min: number, max: number) => void;
  clearTimeFilter: (column: string) => void;
  toggleCategoricalFilter: (column: string, value: string) => void;
  clearCategoricalFilter: (column: string) => void;
  clearFilters: () => void;
  applyConfig: (config: VisualizationConfig) => void;
  resetConfig: () => void;
  resetAxes: () => void;
  toggleColumnExclusion: (column: string) => void;

  selectRow: (id: number | null) => void;
  selectRows: (ids: number[]) => void;
  toggleRowSelection: (id: number) => void;
  requestCameraReset: () => void;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setToast: (message: string | null) => void;
}

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("dataspace-theme", theme);
  } catch {
    // Storage can be unavailable in private or sandboxed contexts; the theme
    // still applies for the current session.
  }
}

function nextTick(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    window.setTimeout(resolve, 20);
  });
}

export const useDataStore = create<DataSpaceState>((set, get) => ({
  dataset: null,
  status: "empty",
  error: null,
  issues: [],
  config: null,
  selectedRowId: null,
  selectedRowIds: [],
  cameraResetToken: 0,
  theme: readInitialTheme(),
  toast: null,

  loadDemo: () => {
    const { dataset } = loadDemoDataset();
    set({
      dataset,
      status: "ready",
      error: null,
      issues: [],
      config: createDefaultConfig(dataset),
      selectedRowId: null,
      selectedRowIds: [],
    });
  },

  setParsing: () => set({ status: "parsing", error: null }),

  loadFile: async (file) => {
    const validation = validateCsvFile(file, MAX_FILE_BYTES);
    if (validation) {
      set({ status: "error", error: validation });
      return;
    }
    set({ status: "parsing", error: null });
    await nextTick();
    try {
      const text = await file.text();
      get().loadText(text, file.name, file.size);
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? `Could not read the file: ${error.message}` : "Could not read the file.",
      });
    }
  },

  loadText: (text, filename, fileSize) => {
    try {
      const result = parseCsv(text, filename, { fileSize });
      set({
        dataset: result.dataset,
        status: "ready",
        error: null,
        issues: result.issues,
        config: createDefaultConfig(result.dataset),
        selectedRowId: null,
        selectedRowIds: [],
      });
    } catch (error) {
      set({
        status: "error",
        error:
          error instanceof CsvImportError
            ? error.message
            : error instanceof Error
              ? error.message
              : "The CSV could not be parsed.",
      });
    }
  },

  fail: (message) => set({ status: "error", error: message }),

  clearError: () => set({ error: null, status: get().dataset ? "ready" : "empty" }),

  clearDataset: () =>
    set({
      dataset: null,
      status: "empty",
      error: null,
      issues: [],
      config: null,
      selectedRowId: null,
      selectedRowIds: [],
      toast: null,
    }),

  dismissIssues: () => set({ issues: [] }),

  setAxis: (axis, column) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, axes: { ...config.axes, [axis]: column } } });
  },

  setTwoDAxis: (axis, column) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, twoD: { ...config.twoD, [axis]: column } } });
  },

  setColor: (mode, column) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, color: { mode, column: mode === "none" ? null : column } } });
  },

  setSize: (settings) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, size: { ...config.size, ...settings } } });
  },

  setDisplay: (settings) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, display: { ...config.display, ...settings } } });
  },

  setLayout: (layout) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, layout } });
  },

  setFilters: (filters) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, filters } });
  },

  setSearch: (search) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, filters: { ...config.filters, search } } });
  },

  setNumericFilter: (column, min, max) => {
    const config = get().config;
    if (!config) return;
    set({
      config: {
        ...config,
        filters: { ...config.filters, numeric: { ...config.filters.numeric, [column]: { min, max } } },
      },
    });
  },

  clearNumericFilter: (column) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, filters: removeNumericFilter(config.filters, column) } });
  },

  setTimeFilter: (column, min, max) => {
    const config = get().config;
    if (!config) return;
    set({
      config: {
        ...config,
        filters: { ...config.filters, time: { ...(config.filters.time ?? {}), [column]: { min, max } } },
      },
    });
  },

  clearTimeFilter: (column) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, filters: removeTimeFilter(config.filters, column) } });
  },

  toggleCategoricalFilter: (column, value) => {
    const config = get().config;
    if (!config) return;
    const current = config.filters.categorical[column] ?? [];
    set({
      config: {
        ...config,
        filters: {
          ...config.filters,
          categorical: { ...config.filters.categorical, [column]: toggleCategory(current, value) },
        },
      },
    });
  },

  clearCategoricalFilter: (column) => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, filters: removeCategoricalFilter(config.filters, column) } });
  },

  clearFilters: () => {
    const config = get().config;
    if (!config) return;
    set({ config: { ...config, filters: createEmptyFilters() } });
  },

  applyConfig: (config) => set({ config, selectedRowId: null, selectedRowIds: [] }),

  resetConfig: () => {
    const { dataset, config } = get();
    if (!dataset || !config) return;
    const defaults = createDefaultConfig(dataset);
    set({ config: { ...defaults, filters: config.filters } });
  },

  resetAxes: () => {
    const { dataset, config } = get();
    if (!dataset || !config) return;
    const defaults = createDefaultConfig(dataset);
    set({
      config: {
        ...config,
        axes: defaults.axes,
        twoD: defaults.twoD,
      },
    });
  },

  toggleColumnExclusion: (column) => {
    const config = get().config;
    if (!config) return;
    const hidden = config.hiddenColumns.includes(column);
    if (!hidden) {
      const numeric = { ...config.filters.numeric };
      const categorical = { ...config.filters.categorical };
      const time = { ...(config.filters.time ?? {}) };
      delete numeric[column];
      delete categorical[column];
      delete time[column];
      const clearAxis = (value: string | null) => (value === column ? null : value);
      set({
        config: {
          ...config,
          hiddenColumns: [...config.hiddenColumns, column],
          axes: {
            x: clearAxis(config.axes.x),
            y: clearAxis(config.axes.y),
            z: clearAxis(config.axes.z),
          },
          twoD: { x: clearAxis(config.twoD.x), y: clearAxis(config.twoD.y) },
          color: config.color.column === column ? { mode: "none", column: null } : config.color,
          size: config.size.column === column ? { enabled: false, column: null } : config.size,
          filters: { ...config.filters, numeric, categorical, time },
        },
      });
      return;
    }
    set({ config: { ...config, hiddenColumns: config.hiddenColumns.filter((name) => name !== column) } });
  },

  selectRow: (id) =>
    set({
      selectedRowId: id,
      selectedRowIds: id === null ? [] : [id],
    }),

  selectRows: (ids) =>
    set({
      selectedRowIds: [...new Set(ids)],
      selectedRowId: ids[0] ?? null,
    }),

  toggleRowSelection: (id) => {
    const current = get().selectedRowIds;
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    set({ selectedRowIds: next, selectedRowId: next[0] ?? null });
  },
  requestCameraReset: () => set({ cameraResetToken: get().cameraResetToken + 1 }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const theme = get().theme === "light" ? "dark" : "light";
    applyTheme(theme);
    set({ theme });
  },

  setToast: (message) => set({ toast: message }),
}));

/** Test helper: reset all module state between tests. */
export function resetDataStore(): void {
  useDataStore.setState({
    dataset: null,
    status: "empty",
    error: null,
    issues: [],
    config: null,
    selectedRowId: null,
    selectedRowIds: [],
    cameraResetToken: 0,
    toast: null,
  });
}
