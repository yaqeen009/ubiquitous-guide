import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DatasetPreview } from "./DatasetPreview";
import { useDatasetView } from "@/hooks/useDatasetView";
import { resetDataStore, useDataStore } from "@/store/useDataStore";
import { MIXED_CSV } from "@/test/fixtures";

function PreviewHarness() {
  const view = useDatasetView();
  return <DatasetPreview view={view} />;
}

function loadFixture(): void {
  act(() => {
    useDataStore.getState().loadText(MIXED_CSV, "mixed.csv");
  });
}

describe("DatasetPreview", () => {
  beforeEach(() => resetDataStore());

  it("renders headers and original cell values", () => {
    loadFixture();
    render(<PreviewHarness />);

    expect(screen.getByRole("columnheader", { name: "Station" })).toBeInTheDocument();
    expect(screen.getByText("AQ-1")).toBeInTheDocument();
    expect(screen.getByText("needs review")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows the filtered count and hides rows outside the filter", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<PreviewHarness />);

    await act(async () => {
      useDataStore.getState().setSearch("south");
    });

    expect(screen.getByText("AQ-2")).toBeInTheDocument();
    expect(screen.queryByText("AQ-1")).not.toBeInTheDocument();
    expect(screen.getByText(/1–1 of 1/)).toBeInTheDocument();
    expect(user).toBeDefined();
  });

  it("selects a row when clicked", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<PreviewHarness />);
    const row = screen.getByText("AQ-3").closest("tr");
    if (!row) throw new Error("Row not found");

    await user.click(row);
    expect(useDataStore.getState().selectedRowId).toBe(2);
    expect(row).toHaveAttribute("aria-selected", "true");
  });

  it("shows an empty state and clears filters", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<PreviewHarness />);

    await act(async () => {
      useDataStore.getState().setSearch("no-such-record");
    });

    expect(screen.getByText("No rows match the active filters")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(screen.getByText("AQ-1")).toBeInTheDocument();
  });

  it("marks invalid numeric cells", () => {
    act(() => {
      const rows = Array.from({ length: 10 }, (_, index) => (index === 3 ? "N/A" : String(index + 1)));
      useDataStore.getState().loadText(["Value", ...rows].join("\n"), "numbers.csv");
    });
    render(<PreviewHarness />);
    const table = screen.getByRole("table");
    const invalid = within(table).getByText("N/A");
    expect(invalid).toHaveAttribute("title", "Not a valid number; treated as missing in charts");
  });
});
