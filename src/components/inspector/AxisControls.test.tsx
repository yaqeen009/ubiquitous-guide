import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AxisControls } from "./AxisControls";
import { parseCsv } from "@/data/parse";
import { createDefaultConfig } from "@/data/configuration";
import { MIXED_CSV, SIMPLE_CSV } from "@/test/fixtures";

const { dataset } = parseCsv(MIXED_CSV, "mixed.csv");
const config = createDefaultConfig(dataset);
const numericColumns = dataset.columns.filter((column) => column.type === "numeric");

describe("AxisControls", () => {
  it("lists only numeric columns and reports the current mapping", () => {
    render(
      <AxisControls
        config={config}
        numericColumns={numericColumns}
        onAxis={vi.fn()}
        onTwoDAxis={vi.fn()}
        onResetAxes={vi.fn()}
      />,
    );

    const xAxis = screen.getByLabelText("X axis variable");
    expect(xAxis).toHaveValue("PM2.5");
    expect(within(xAxis).getByRole("option", { name: "PM2.5" })).toBeInTheDocument();
    expect(within(xAxis).getByRole("option", { name: "NO2" })).toBeInTheDocument();
    expect(within(xAxis).queryByRole("option", { name: "Region" })).not.toBeInTheDocument();
  });

  it("reports axis changes", () => {
    const onAxis = vi.fn();
    const onTwoDAxis = vi.fn();
    render(
      <AxisControls
        config={config}
        numericColumns={numericColumns}
        onAxis={onAxis}
        onTwoDAxis={onTwoDAxis}
        onResetAxes={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("X axis variable"), { target: { value: "NO2" } });
    fireEvent.change(screen.getByLabelText("2D Y axis variable"), { target: { value: "PM2.5" } });

    expect(onAxis).toHaveBeenCalledWith("x", "NO2");
    expect(onTwoDAxis).toHaveBeenCalledWith("y", "PM2.5");
  });

  it("warns when fewer than three numeric columns are available", () => {
    const { dataset: simple } = parseCsv(SIMPLE_CSV, "simple.csv");
    render(
      <AxisControls
        config={createDefaultConfig(simple)}
        numericColumns={simple.columns.filter((column) => column.type === "numeric")}
        onAxis={vi.fn()}
        onTwoDAxis={vi.fn()}
        onResetAxes={vi.fn()}
      />,
    );
    expect(screen.getByText(/This dataset has 2 numeric columns/)).toBeInTheDocument();
    expect(screen.getByText(/unmapped dimensions are drawn at the center/)).toBeInTheDocument();
  });

  it("requests a reset", async () => {
    const user = userEvent.setup();
    const onResetAxes = vi.fn();
    render(
      <AxisControls
        config={config}
        numericColumns={numericColumns}
        onAxis={vi.fn()}
        onTwoDAxis={vi.fn()}
        onResetAxes={onResetAxes}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Reset/ }));
    expect(onResetAxes).toHaveBeenCalledTimes(1);
  });
});
