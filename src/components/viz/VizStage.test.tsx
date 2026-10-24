import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VizStage } from "./VizStage";
import { useDatasetView } from "@/hooks/useDatasetView";
import { resetDataStore, useDataStore } from "@/store/useDataStore";
import { resetUiStore, useUiStore } from "@/store/useUiStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MIXED_CSV } from "@/test/fixtures";

vi.mock("recharts", () => {
  const Passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Passthrough,
    ScatterChart: Passthrough,
    CartesianGrid: () => null,
    Scatter: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

function VizHarness() {
  const view = useDatasetView();
  return (
    <TooltipProvider>
      <VizStage view={view} />
    </TooltipProvider>
  );
}

function loadFixture(): void {
  act(() => {
    useDataStore.getState().loadText(MIXED_CSV, "mixed.csv");
  });
}

describe("VizStage", () => {
  beforeEach(() => {
    resetDataStore();
    resetUiStore();
  });

  it("renders the 2D pane with its axis mapping and legend", () => {
    loadFixture();
    act(() => useDataStore.getState().setLayout("2d"));
    render(<VizHarness />);

    expect(screen.getByRole("heading", { name: "2D" })).toBeInTheDocument();
    expect(screen.getByText("PM2.5 × NO2")).toBeInTheDocument();
    expect(screen.getByLabelText("Color legend for Station")).toBeInTheDocument();
  });

  it("switches between layouts from the toolbar", async () => {
    const user = userEvent.setup();
    loadFixture();
    render(<VizHarness />);

    await user.click(screen.getByRole("button", { name: "2D" }));
    expect(useDataStore.getState().config?.layout).toBe("2d");
    expect(screen.getByText("PM2.5 × NO2")).toBeInTheDocument();
  });

  it("reports rows skipped because a mapped axis value is missing", () => {
    loadFixture();
    act(() => useDataStore.getState().setLayout("2d"));
    render(<VizHarness />);
    expect(screen.getByText(/rows hidden by missing axis values/)).toHaveTextContent(
      "1 rows hidden by missing axis values",
    );
  });

  it("shows an empty state when filters exclude every row", async () => {
    const user = userEvent.setup();
    loadFixture();
    act(() => {
      useDataStore.getState().setLayout("2d");
      useDataStore.getState().setSearch("zzz");
    });
    render(<VizHarness />);

    expect(screen.getByText("No records match the filters")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(useDataStore.getState().config?.filters.search).toBe("");
    expect(screen.queryByText("No records match the filters")).not.toBeInTheDocument();
  });

  it("warns when the 2D axes are not mapped", () => {
    loadFixture();
    act(() => {
      useDataStore.getState().setLayout("2d");
      useDataStore.getState().setTwoDAxis("x", "");
    });
    render(<VizHarness />);
    expect(screen.getByText(/Choose two numeric columns/)).toBeInTheDocument();
  });

  it("opens the guide from the toolbar", async () => {
    const user = userEvent.setup();
    loadFixture();
    act(() => useDataStore.getState().setLayout("2d"));
    render(<VizHarness />);

    await user.click(screen.getByRole("button", { name: "Open exploration guide" }));
    expect(useUiStore.getState().helpOpen).toBe(true);
  });
});
