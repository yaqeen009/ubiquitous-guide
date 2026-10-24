import { Eye, MousePointer2, Settings2 } from "lucide-react";
import type { Dataset, ViewInstance } from "@/types";
import { columnsForKind, visualizationById } from "@/viz/registry";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useDataStore } from "@/store/useDataStore";

export function PanelSettings({ instance, dataset }: { instance: ViewInstance; dataset: Dataset }) {
  const config = useDataStore((state) => state.config);
  const setPanelField = useWorkspaceStore((state) => state.setPanelField);
  const setPanelOptions = useWorkspaceStore((state) => state.setPanelOptions);
  const setPanelTitle = useWorkspaceStore((state) => state.setPanelTitle);
  const resetPanel = useWorkspaceStore((state) => state.resetPanel);

  const definition = visualizationById(instance.type);
  if (!definition) return null;
  const hidden = config?.hiddenColumns ?? [];

  return (
    <div className="space-y-3 p-3">
      <section className="space-y-2.5">
        <h3 className="panel-title flex items-center gap-1.5">
          <Settings2 size={12} /> {definition.name}
        </h3>
        <Field label="View title" htmlFor={`view-title-${instance.id}`} hint="Optional">
          <Input
            id={`view-title-${instance.id}`}
            value={instance.title ?? ""}
            placeholder={definition.shortName}
            maxLength={80}
            onChange={(event) => setPanelTitle(instance.id, event.target.value)}
            className="h-7 text-[12px]"
          />
        </Field>
        {definition.fields.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-faint">
            This view derives its fields automatically from the available numeric columns.
          </p>
        ) : (
          <div className="space-y-2">
            {definition.fields.map((field) => {
              const choices = columnsForKind(dataset, field.kind, hidden);
              const value = instance.fields[field.key] ?? "";
              return (
                <Field
                  key={field.key}
                  label={field.label}
                  htmlFor={`view-field-${instance.id}-${field.key}`}
                  hint={field.required ? "Required" : "Optional"}
                >
                  <Select
                    id={`view-field-${instance.id}-${field.key}`}
                    compact
                    value={value}
                    onChange={(event) => setPanelField(instance.id, field.key, event.target.value || null)}
                    aria-describedby={field.hint ? `view-hint-${instance.id}-${field.key}` : undefined}
                  >
                    {!field.required ? <option value="">Not mapped</option> : null}
                    {field.required && !value ? <option value="">Choose a column…</option> : null}
                    {choices.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name}
                      </option>
                    ))}
                  </Select>
                  {field.hint ? (
                    <p id={`view-hint-${instance.id}-${field.key}`} className="text-[10px] leading-relaxed text-faint">
                      {field.hint}
                    </p>
                  ) : null}
                </Field>
              );
            })}
          </div>
        )}
      </section>

      {instance.type === "table" ? (
        <Field label="Rows per page" htmlFor={`view-rows-${instance.id}`}>
          <Select
            id={`view-rows-${instance.id}`}
            compact
            value={String(instance.options.pageSize ?? 50)}
            onChange={(event) => setPanelOptions(instance.id, { pageSize: Number(event.target.value) })}
          >
            {[25, 50, 100, 200].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {instance.type === "timeseries" ? (
        <Field label="Maximum series" htmlFor={`view-series-${instance.id}`} hint="Additional categories are reported, not silently merged">
          <Select
            id={`view-series-${instance.id}`}
            compact
            value={String(instance.options.maxSeries ?? 6)}
            onChange={(event) => setPanelOptions(instance.id, { maxSeries: Number(event.target.value) })}
          >
            {[2, 3, 4, 6, 8].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {instance.type === "histogram" ? (
        <Field label="Bins" htmlFor={`view-bins-${instance.id}`}>
          <Select
            id={`view-bins-${instance.id}`}
            compact
            value={String(instance.options.bins ?? "auto")}
            onChange={(event) =>
              setPanelOptions(instance.id, {
                bins: event.target.value === "auto" ? "auto" : Number(event.target.value),
              })
            }
          >
            <option value="auto">Automatic</option>
            {[5, 10, 15, 20, 30].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {instance.type === "correlation" ? (
        <Field label="Columns shown" htmlFor={`view-cols-${instance.id}`} hint="The first N available numeric columns">
          <Select
            id={`view-cols-${instance.id}`}
            compact
            value={String(instance.options.maxColumns ?? 8)}
            onChange={(event) => setPanelOptions(instance.id, { maxColumns: Number(event.target.value) })}
          >
            {[4, 6, 8, 10, 12].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-1.5">
        <Badge tone={definition.capabilities.selection === "none" ? "neutral" : "accent"}>
          {definition.capabilities.selection === "record"
            ? "Record selection"
            : definition.capabilities.selection === "multiple"
              ? "Multi-record"
              : definition.capabilities.selection === "filter"
                ? "Range filter"
                : "No selection"}
        </Badge>
        <Badge tone="neutral" className="gap-1">
          <Eye size={9} /> {definition.category}
        </Badge>
        {definition.capabilities.brushing ? (
          <Badge tone="neutral" className="gap-1">
            <MousePointer2 size={9} /> Brush
          </Badge>
        ) : null}
      </div>
      <p className="text-[10.5px] leading-relaxed text-faint">{definition.selectionNote}</p>

      <Button variant="secondary" size="xs" onClick={() => resetPanel(instance.id, dataset, hidden)}>
        Reset this view's fields
      </Button>
    </div>
  );
}
