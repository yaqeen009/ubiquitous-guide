import { Palette, RotateCcw, Ruler, Sparkles } from "lucide-react";
import type { DataColumn, VisualizationConfig } from "@/types";
import { Field, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/badge";
import { SingleSlider } from "@/components/ui/slider";
import { useDataStore } from "@/store/useDataStore";
import { formatNumber } from "@/lib/utils";

function Section({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="panel-title flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StylePanel({
  config,
  numericColumns,
  categoryColumns,
}: {
  config: VisualizationConfig;
  numericColumns: DataColumn[];
  categoryColumns: DataColumn[];
}) {
  const setColor = useDataStore((state) => state.setColor);
  const setSize = useDataStore((state) => state.setSize);
  const setDisplay = useDataStore((state) => state.setDisplay);
  const resetConfig = useDataStore((state) => state.resetConfig);
  const setToast = useDataStore((state) => state.setToast);

  const categoricalChoices = categoryColumns.filter((column) => column.type !== "text" || column.distinctCount <= 40);
  const colorChoices = config.color.mode === "numeric" ? numericColumns : categoricalChoices;

  const selectColorMode = (mode: "none" | "numeric" | "categorical") => {
    if (mode === "none") {
      setColor("none", null);
      return;
    }
    const choices = mode === "numeric" ? numericColumns : categoricalChoices;
    const first = choices[0];
    if (!first) {
      setToast(
        mode === "numeric"
          ? "This dataset has no numeric column to color by."
          : "This dataset has no categorical column to color by.",
      );
      return;
    }
    setColor(mode, first.name);
  };

  return (
    <div className="space-y-4 p-3">
      <Section
        title="Appearance"
        icon={<Sparkles size={12} />}
        action={
          <Button variant="ghost" size="xs" className="text-[11px]" onClick={resetConfig} title="Reset axes, color, size, and display">
            <RotateCcw size={11} /> Reset all
          </Button>
        }
      >
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <span className="text-[12px] text-muted">Point size</span>
            <span className="mono-num text-[11px] text-ink">{config.display.pointSize.toFixed(1)} px</span>
          </div>
          <SingleSlider
            label="Point size"
            value={config.display.pointSize}
            min={1}
            max={12}
            step={0.5}
            onValueChange={(value) => setDisplay({ pointSize: value })}
          />
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 pt-1">
            <span className="text-[12px] text-muted">Opacity</span>
            <span className="mono-num text-[11px] text-ink">{Math.round(config.display.opacity * 100)}%</span>
          </div>
          <SingleSlider
            label="Point opacity"
            value={config.display.opacity}
            min={0.1}
            max={1}
            step={0.05}
            onValueChange={(value) => setDisplay({ opacity: value })}
          />
        </div>
      </Section>

      <Section title="Color" icon={<Palette size={12} />}>
        <SegmentedControl
          label="Color encoding"
          value={config.color.mode}
          onChange={selectColorMode}
          options={[
            { value: "none", label: "None" },
            { value: "categorical", label: "Category" },
            { value: "numeric", label: "Number" },
          ]}
        />
        {config.color.mode !== "none" ? (
          <Field label={config.color.mode === "numeric" ? "Numeric color scale" : "Category column"} htmlFor="color-column">
            {colorChoices.length === 0 ? (
              <p className="text-[11px] text-faint">No compatible column available.</p>
            ) : (
              <Select
                id="color-column"
                value={config.color.column ?? ""}
                onChange={(event) => setColor(config.color.mode, event.target.value)}
              >
                {colorChoices.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <p className="text-[11px] text-faint">All points share the theme accent color.</p>
        )}
        {config.color.mode === "numeric" && config.color.column ? (
          <p className="text-[10.5px] leading-relaxed text-faint">
            Viridis scale from {formatNumber(numericColumns.find((column) => column.name === config.color.column)?.min)} to{" "}
            {formatNumber(numericColumns.find((column) => column.name === config.color.column)?.max)}. Missing values keep
            the neutral color.
          </p>
        ) : null}
        {config.color.mode === "categorical" ? (
          <p className="text-[10.5px] leading-relaxed text-faint">
            Colors are assigned from the full dataset and stay stable while filtering. More than 11 categories are
            grouped as “Other”.
          </p>
        ) : null}
      </Section>

      <Section title="Size" icon={<Ruler size={12} />}>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-soft">
          <Checkbox
            checked={config.size.enabled}
            onCheckedChange={(checked) => {
              const enabled = checked === true;
              const first = numericColumns[0];
              if (enabled && !first) {
                setToast("This dataset has no numeric column to size by.");
                return;
              }
              setSize({ enabled, column: enabled ? config.size.column ?? first?.name ?? null : null });
            }}
            aria-label="Enable size mapping"
          />
          Size points by a numeric variable
        </label>
        {config.size.enabled ? (
          <Field label="Size column" htmlFor="size-column">
            <Select
              id="size-column"
              value={config.size.column ?? ""}
              onChange={(event) => setSize({ column: event.target.value })}
            >
              {numericColumns.map((column) => (
                <option key={column.name} value={column.name}>
                  {column.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </Section>

      <p className="text-[10.5px] leading-relaxed text-faint">
        Selection uses a ring and a larger marker in both views, so it is never communicated by color alone. Point size
        remains constant in 2D; the 3D view uses distance attenuation.
      </p>
    </div>
  );
}
