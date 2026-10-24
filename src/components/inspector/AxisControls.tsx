import type { DataColumn, VisualizationConfig } from "@/types";
import { Field, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

function AxisSelect({
  label,
  value,
  columns,
  onChange,
}: {
  label: string;
  value: string | null;
  columns: DataColumn[];
  onChange: (name: string) => void;
}) {
  const id = `axis-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <Field label={label} htmlFor={id}>
      <Select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} variable`}
      >
        <option value="" disabled>
          Not mapped
        </option>
        {columns.map((column) => (
          <option key={column.name} value={column.name}>
            {column.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function AxisControls({
  config,
  numericColumns,
  onAxis,
  onTwoDAxis,
  onResetAxes,
}: {
  config: VisualizationConfig;
  numericColumns: DataColumn[];
  onAxis: (axis: "x" | "y" | "z", column: string) => void;
  onTwoDAxis: (axis: "x" | "y", column: string) => void;
  onResetAxes: () => void;
}) {
  return (
    <section className="space-y-3" aria-labelledby="axis-heading">
      <div className="flex items-center justify-between">
        <h3 id="axis-heading" className="panel-title">
          Axis mapping
        </h3>
        <Button variant="ghost" size="xs" onClick={onResetAxes} className="gap-1 text-[11px]">
          <RotateCcw size={11} /> Reset
        </Button>
      </div>

      {numericColumns.length < 3 ? (
        <p className="rounded-sm border border-warning/30 bg-warning-soft px-2 py-1.5 text-[11px] leading-relaxed text-warning">
          This dataset has {numericColumns.length} numeric column{numericColumns.length === 1 ? "" : "s"}. Three are
          needed for a full 3D view; unmapped dimensions are drawn at the center.
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <AxisSelect label="X axis" value={config.axes.x} columns={numericColumns} onChange={(name) => onAxis("x", name)} />
        <AxisSelect label="Y axis" value={config.axes.y} columns={numericColumns} onChange={(name) => onAxis("y", name)} />
        <AxisSelect label="Z axis" value={config.axes.z} columns={numericColumns} onChange={(name) => onAxis("z", name)} />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
        <AxisSelect
          label="2D X axis"
          value={config.twoD.x}
          columns={numericColumns}
          onChange={(name) => onTwoDAxis("x", name)}
        />
        <AxisSelect
          label="2D Y axis"
          value={config.twoD.y}
          columns={numericColumns}
          onChange={(name) => onTwoDAxis("y", name)}
        />
      </div>

      <p className="text-[10.5px] leading-relaxed text-faint">
        Each axis uses an independent linear min–max scale over the full dataset. Constant columns sit at the center.
        Rows with missing values on a mapped axis are hidden and counted below the plot.
      </p>
    </section>
  );
}
