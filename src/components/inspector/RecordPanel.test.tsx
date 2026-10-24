import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { RecordPanel } from "./RecordPanel";
import { useDatasetView } from "@/hooks/useDatasetView";
import { resetDataStore, useDataStore } from "@/store/useDataStore";
import { MIXED_CSV } from "@/test/fixtures";

function RecordHarness() {
  const view = useDatasetView();
  return <RecordPanel view={view} />;
}

function loadFixture(): void {
  act(() => {
    useDataStore.getState().loadText(MIXED_CSV, "mixed.csv");
  });
}

describe("RecordPanel", () => {
  beforeEach(() => resetDataStore());

  it("prompts for a selection when nothing is selected", () => {
    loadFixture();
    render(<RecordHarness />);
    expect(screen.getByText("No record selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse rows" })).toBeInTheDocument();
  });

  it("shows original values and mapped roles for the selected record", () => {
    loadFixture();
    act(() => useDataStore.getState().selectRow(0));
    render(<RecordHarness />);

    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.getByText("AQ-1")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.getAllByText("X").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2D X").length).toBeGreaterThan(0);
  });

  it("flags records with missing values on a mapped axis", () => {
    loadFixture();
    act(() => useDataStore.getState().selectRow(1));
    render(<RecordHarness />);

    expect(screen.getByRole("status")).toHaveTextContent("Not plotted.");
    expect(screen.getByRole("status")).toHaveTextContent("PM2.5");
  });

  it("keeps a selection that falls outside the active filters", () => {
    loadFixture();
    act(() => {
      useDataStore.getState().setSearch("north");
      useDataStore.getState().selectRow(1);
    });
    render(<RecordHarness />);

    expect(screen.getByText("Hidden by filters")).toBeInTheDocument();
    expect(screen.getByText(/outside the current filters/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("clears the selection", async () => {
    const user = userEvent.setup();
    loadFixture();
    act(() => useDataStore.getState().selectRow(0));
    render(<RecordHarness />);

    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(useDataStore.getState().selectedRowId).toBeNull();
    expect(screen.getByText("No record selected")).toBeInTheDocument();
  });

  it("moves to the next visible record", async () => {
    const user = userEvent.setup();
    loadFixture();
    act(() => useDataStore.getState().selectRow(0));
    render(<RecordHarness />);

    await user.click(screen.getByRole("button", { name: "Select next visible record" }));
    expect(useDataStore.getState().selectedRowId).toBe(1);
    expect(screen.getByText("Row 2")).toBeInTheDocument();
  });

  it("marks invalid numeric values in the record", () => {
    act(() => {
      const rows = Array.from({ length: 10 }, (_, index) => (index === 1 ? "N/A" : String(index + 1)));
      useDataStore.getState().loadText(["Value", ...rows].join("\n"), "numbers.csv");
      useDataStore.getState().selectRow(1);
    });
    render(<RecordHarness />);
    expect(screen.getByText("N/A (invalid)")).toBeInTheDocument();
  });
});
