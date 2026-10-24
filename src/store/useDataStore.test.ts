import { beforeEach, describe, expect, it } from "vitest";
import { resetDataStore, useDataStore } from "./useDataStore";
import { resetUiStore, useUiStore } from "./useUiStore";
import { MIXED_CSV, buildInferenceCsv } from "@/test/fixtures";

function loadFixture(): void {
  useDataStore.getState().loadText(MIXED_CSV, "mixed.csv");
}

describe("useDataStore", () => {
  beforeEach(() => {
    resetDataStore();
    resetUiStore();
    document.documentElement.dataset.theme = "light";
    localStorage.clear();
  });

  it("loads parsed text and creates a default configuration", () => {
    loadFixture();
    const state = useDataStore.getState();
    expect(state.status).toBe("ready");
    expect(state.dataset?.rows).toHaveLength(5);
    expect(state.config?.axes.x).toBe("PM2.5");
    expect(state.selectedRowId).toBeNull();
  });

  it("reports parse errors without discarding an existing dataset", () => {
    loadFixture();
    useDataStore.getState().loadText("A,B", "broken.csv");
    const state = useDataStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toMatch(/Only a header row/);
    expect(state.dataset).not.toBeNull();
    state.clearError();
    expect(useDataStore.getState().status).toBe("ready");
  });

  it("loads the demo dataset through the production parser", () => {
    useDataStore.getState().loadDemo();
    const state = useDataStore.getState();
    expect(state.dataset?.source).toBe("demo");
    expect(state.dataset?.rows).toHaveLength(720);
    expect(state.dataset?.columns).toHaveLength(11);
  });

  it("updates axes, 2D mappings, layout, color, and display", () => {
    loadFixture();
    const store = useDataStore.getState();
    store.setAxis("x", "NO2");
    store.setTwoDAxis("y", "PM2.5");
    store.setLayout("split");
    store.setColor("numeric", "PM2.5");
    store.setDisplay({ pointSize: 8, opacity: 0.4 });
    store.setSize({ enabled: true, column: "NO2" });

    const config = useDataStore.getState().config;
    expect(config?.axes.x).toBe("NO2");
    expect(config?.twoD.y).toBe("PM2.5");
    expect(config?.layout).toBe("split");
    expect(config?.color).toEqual({ mode: "numeric", column: "PM2.5" });
    expect(config?.display).toEqual({ pointSize: 8, opacity: 0.4 });
    expect(config?.size).toEqual({ enabled: true, column: "NO2" });
  });

  it("sets and clears filters", () => {
    loadFixture();
    const store = useDataStore.getState();
    store.setSearch("north");
    store.setNumericFilter("PM2.5", 15, 35);
    store.toggleCategoricalFilter("Region", "North");

    let config = useDataStore.getState().config;
    expect(config?.filters.search).toBe("north");
    expect(config?.filters.numeric["PM2.5"]).toEqual({ min: 15, max: 35 });
    expect(config?.filters.categorical.Region).toEqual(["North"]);

    useDataStore.getState().clearNumericFilter("PM2.5");
    useDataStore.getState().clearCategoricalFilter("Region");
    useDataStore.getState().clearFilters();
    config = useDataStore.getState().config;
    expect(config?.filters).toEqual({ search: "", numeric: {}, categorical: {} });
  });

  it("toggling a category twice removes it", () => {
    loadFixture();
    useDataStore.getState().toggleCategoricalFilter("Region", "North");
    useDataStore.getState().toggleCategoricalFilter("Region", "North");
    expect(useDataStore.getState().config?.filters.categorical.Region).toEqual([]);
  });

  it("excludes a column from mappings and filters while keeping the data", () => {
    loadFixture();
    const store = useDataStore.getState();
    store.setNumericFilter("PM2.5", 15, 35);
    store.setAxis("x", "PM2.5");
    store.setColor("numeric", "PM2.5");
    store.toggleColumnExclusion("PM2.5");

    const state = useDataStore.getState();
    expect(state.config?.hiddenColumns).toEqual(["PM2.5"]);
    expect(state.config?.axes.x).toBeNull();
    expect(state.config?.color).toEqual({ mode: "none", column: null });
    expect(state.config?.filters.numeric["PM2.5"]).toBeUndefined();
    expect(state.dataset?.rows).toHaveLength(5);
    expect(state.dataset?.columns.some((column) => column.name === "PM2.5")).toBe(true);

    useDataStore.getState().toggleColumnExclusion("PM2.5");
    expect(useDataStore.getState().config?.hiddenColumns).toEqual([]);
  });

  it("resets axes and config while preserving active filters", () => {
    loadFixture();
    const store = useDataStore.getState();
    store.setAxis("x", "NO2");
    store.setSearch("north");
    store.setLayout("2d");
    store.resetAxes();

    let config = useDataStore.getState().config;
    expect(config?.axes.x).toBe("PM2.5");
    expect(config?.filters.search).toBe("north");

    useDataStore.getState().resetConfig();
    config = useDataStore.getState().config;
    expect(config?.layout).toBe("3d");
    expect(config?.filters.search).toBe("north");
  });

  it("applies an imported config and clears the selection", () => {
    loadFixture();
    useDataStore.getState().selectRow(2);
    const config = useDataStore.getState().config;
    if (!config) throw new Error("Missing config");
    useDataStore.getState().applyConfig({ ...config, layout: "2d" });
    expect(useDataStore.getState().config?.layout).toBe("2d");
    expect(useDataStore.getState().selectedRowId).toBeNull();
  });

  it("selects and clears records", () => {
    loadFixture();
    useDataStore.getState().selectRow(3);
    expect(useDataStore.getState().selectedRowId).toBe(3);
    useDataStore.getState().selectRow(null);
    expect(useDataStore.getState().selectedRowId).toBeNull();
  });

  it("supports multi-selection with one primary record", () => {
    loadFixture();
    useDataStore.getState().selectRows([1, 3]);
    expect(useDataStore.getState().selectedRowIds).toEqual([1, 3]);
    expect(useDataStore.getState().selectedRowId).toBe(1);

    useDataStore.getState().toggleRowSelection(3);
    expect(useDataStore.getState().selectedRowIds).toEqual([1]);
    useDataStore.getState().toggleRowSelection(2);
    expect(useDataStore.getState().selectedRowIds).toEqual([1, 2]);
    expect(useDataStore.getState().selectedRowId).toBe(1);

    useDataStore.getState().selectRow(4);
    expect(useDataStore.getState().selectedRowIds).toEqual([4]);
    expect(useDataStore.getState().selectedRowId).toBe(4);
  });

  it("keeps selection when filters hide the selected record", () => {
    loadFixture();
    useDataStore.getState().selectRows([1, 3]);
    useDataStore.getState().setSearch("north");
    expect(useDataStore.getState().selectedRowIds).toEqual([1, 3]);
    expect(useDataStore.getState().config?.filters.search).toBe("north");
    useDataStore.getState().clearFilters();
    expect(useDataStore.getState().selectedRowIds).toEqual([1, 3]);
  });

  it("applies and clears date-time filters", () => {
    useDataStore.getState().loadText(buildInferenceCsv(), "typed.csv");
    useDataStore.getState().setTimeFilter("when", Date.UTC(2024, 0, 5), Date.UTC(2024, 0, 10));
    expect(useDataStore.getState().config?.filters.time?.when).toEqual({
      min: Date.UTC(2024, 0, 5),
      max: Date.UTC(2024, 0, 10),
    });
    useDataStore.getState().clearTimeFilter("when");
    expect(useDataStore.getState().config?.filters.time?.when).toBeUndefined();
  });

  it("increments the camera reset token", () => {
    const before = useDataStore.getState().cameraResetToken;
    useDataStore.getState().requestCameraReset();
    expect(useDataStore.getState().cameraResetToken).toBe(before + 1);
  });

  it("toggles and persists the theme", () => {
    useDataStore.getState().setTheme("light");
    useDataStore.getState().toggleTheme();
    expect(useDataStore.getState().theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("dataspace-theme")).toBe("dark");
    useDataStore.getState().setTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("clears the dataset back to the empty state", () => {
    loadFixture();
    useDataStore.getState().clearDataset();
    const state = useDataStore.getState();
    expect(state.dataset).toBeNull();
    expect(state.status).toBe("empty");
    expect(state.config).toBeNull();
  });
});

describe("useUiStore", () => {
  beforeEach(() => resetUiStore());

  it("stores inspector, panel, and focus state", () => {
    useUiStore.getState().setInspectorTab("filters");
    useUiStore.getState().setDataPanelOpen(false);
    useUiStore.getState().setMobilePanel("data");
    useUiStore.getState().setDataTab("summary");
    useUiStore.getState().setFocusRowId(12);
    const state = useUiStore.getState();
    expect(state.inspectorTab).toBe("filters");
    expect(state.dataPanelOpen).toBe(false);
    expect(state.mobilePanel).toBe("data");
    expect(state.dataTab).toBe("summary");
    expect(state.focusRowId).toBe(12);
  });
});
