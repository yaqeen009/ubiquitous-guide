import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { FilterPanel } from "./FilterPanel";
import { useDatasetView } from "@/hooks/useDatasetView";
import { resetDataStore, useDataStore } from "@/store/useDataStore";
import { MIXED_CSV } from "@/test/fixtures";

function FilterHarness() {
  const view = useDatasetView();
  const config = useDataStore((state) => state.config);
  if (!config) return null;
  return (
    <FilterPanel
      config={config}
      numericColumns={view.numericColumns}
      categoryColumns={view.categoryColumns}
      filteredCount={view.filteredCount}
      totalCount={view.totalCount}
    />
  );
}

function loadFixture(): void {
  act(() => {
    useDataStore.getState().loadText(MIXED_CSV, "mixed.csv");
  });
}

describe("FilterPanel", () => {
  beforeEach(() => resetDataStore());

  it("filters by free-text search", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<FilterHarness />);

    await user.type(screen.getByLabelText("Search all dataset values"), "north");

    expect(useDataStore.getState().config?.filters.search).toBe("north");
    expect(screen.getByText(/Search: north/)).toBeInTheDocument();
    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("filters by category checkbox", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<FilterHarness />);

    await user.click(screen.getByRole("checkbox", { name: "Region: North" }));

    expect(useDataStore.getState().config?.filters.categorical.Region).toEqual(["North"]);
    expect(screen.getByText("Visible records").parentElement).toHaveTextContent("3 / 5");
  });

  it("applies a numeric range typed into the inputs", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<FilterHarness />);

    const min = screen.getByRole("spinbutton", { name: "PM2.5 minimum" });
    await user.clear(min);
    await user.type(min, "15");
    await user.tab();

    expect(useDataStore.getState().config?.filters.numeric["PM2.5"]).toEqual({ min: 15, max: 40 });
  });

  it("ignores invalid numeric input", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<FilterHarness />);

    const min = screen.getByRole("spinbutton", { name: "PM2.5 minimum" });
    await user.clear(min);
    await user.type(min, "not a number");
    await user.tab();

    expect(useDataStore.getState().config?.filters.numeric["PM2.5"]).toBeUndefined();
    expect(min).toHaveValue(10);
  });

  it("shows a no-match warning and clears every filter", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<FilterHarness />);

    await user.type(screen.getByLabelText("Search all dataset values"), "zzz");
    expect(screen.getByText(/No records match/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(useDataStore.getState().config?.filters.search).toBe("");
    expect(screen.queryByText(/No records match/)).not.toBeInTheDocument();
  });

  it("removes the active search from its badge", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<FilterHarness />);

    await user.type(screen.getByLabelText("Search all dataset values"), "north");
    await user.click(screen.getByRole("button", { name: "Remove search filter" }));
    expect(useDataStore.getState().config?.filters.search).toBe("");
  });
});
