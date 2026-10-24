import { EyeOff } from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import type { ColumnType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatNumber } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";
import { describeColumnType } from "@/data/infer";

const TYPE_TONE: Record<ColumnType, "neutral" | "accent" | "warning" | "danger" | "success"> = {
  numeric: "accent",
  categorical: "success",
  date: "warning",
  text: "neutral",
  empty: "danger",
};

export function ColumnInspector({ view }: { view: DatasetView }) {
  const config = useDataStore((state) => state.config);
  const toggleColumnExclusion = useDataStore((state) => state.toggleColumnExclusion);
  const dataset = view.dataset;
  if (!dataset || !config) return null;

  return (
    <div className="h-full overflow-auto thin-scroll">
      <table className="w-full min-w-[860px] border-collapse text-[11.5px]" aria-label="Column types and quality">
        <caption className="sr-only">
          Inferred column types, missing values, and numeric extents for {dataset.name}. Excluding a column removes it
          from visualization choices without deleting data.
        </caption>
        <thead className="sticky top-0 z-10 bg-surface-2">
          <tr>
            <th scope="col" className="w-16 border-b border-border px-2 py-1.5 text-left font-medium text-muted">
              Plot
            </th>
            <th scope="col" className="border-b border-border px-2 py-1.5 text-left font-medium text-ink-soft">
              Column
            </th>
            <th scope="col" className="border-b border-border px-2 py-1.5 text-left font-medium text-ink-soft">
              Inferred type
            </th>
            <th scope="col" className="border-b border-border px-2 py-1.5 text-right font-medium text-ink-soft">
              Missing
            </th>
            <th scope="col" className="border-b border-border px-2 py-1.5 text-right font-medium text-ink-soft">
              Distinct
            </th>
            <th scope="col" className="border-b border-border px-2 py-1.5 text-left font-medium text-ink-soft">
              Extent / top values
            </th>
          </tr>
        </thead>
        <tbody>
          {dataset.columns.map((column) => {
            const hidden = config.hiddenColumns.includes(column.name);
            const mapped = [
              config.axes.x === column.name ? "X" : null,
              config.axes.y === column.name ? "Y" : null,
              config.axes.z === column.name ? "Z" : null,
              config.twoD.x === column.name ? "2D X" : null,
              config.twoD.y === column.name ? "2D Y" : null,
              config.color.column === column.name && config.color.mode !== "none" ? "Color" : null,
              config.size.column === column.name && config.size.enabled ? "Size" : null,
            ].filter(Boolean);

            return (
              <tr key={column.name} className={`border-b border-border/60 ${hidden ? "opacity-55" : ""}`}>
                <td className="px-2 py-1.5">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <Checkbox
                      checked={!hidden}
                      onCheckedChange={() => toggleColumnExclusion(column.name)}
                      aria-label={`${hidden ? "Include" : "Exclude"} ${column.name} in visualization controls`}
                    />
                    {hidden ? <EyeOff size={12} className="text-faint" aria-hidden /> : null}
                  </label>
                </td>
                <td className="max-w-56 px-2 py-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium text-ink" title={column.name}>
                      {column.name}
                    </span>
                    {mapped.map((role) => (
                      <span
                        key={role}
                        className="rounded-[2px] border border-border bg-surface-2 px-1 py-px text-[9px] uppercase tracking-wider text-muted"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={TYPE_TONE[column.type]}>{column.type}</Badge>
                    <span className="hidden max-w-52 truncate text-[10.5px] text-faint xl:inline" title={describeColumnType(column)}>
                      {describeColumnType(column).split(" — ")[1] ?? ""}
                    </span>
                  </div>
                </td>
                <td className="mono-num px-2 py-1.5 text-right text-muted">
                  {column.missingCount.toLocaleString()}
                  {column.type === "numeric" && column.invalidNumericCount > 0 ? (
                    <span className="ml-1 text-[10px] text-warning" title="Non-numeric values treated as missing">
                      +{column.invalidNumericCount.toLocaleString()} invalid
                    </span>
                  ) : null}
                </td>
                <td className="mono-num px-2 py-1.5 text-right text-muted">{column.distinctCount.toLocaleString()}</td>
                <td className="max-w-96 px-2 py-1.5 text-ink-soft">
                  {column.type === "numeric" ? (
                    <span className="mono-num text-[11px]">
                      {formatNumber(column.min)} – {formatNumber(column.max)}
                      <span className="ml-2 text-faint">median {formatNumber(column.median)}</span>
                    </span>
                  ) : column.categories.length > 0 ? (
                    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {column.categories.slice(0, 3).map((category) => (
                        <span key={category.value} className="max-w-40 truncate" title={category.value}>
                          {category.value} <span className="mono-num text-[10px] text-faint">{category.count}</span>
                        </span>
                      ))}
                      {column.distinctCount > 3 ? <span className="text-faint">+{column.distinctCount - 3} more</span> : null}
                    </span>
                  ) : (
                    <span className="text-faint">No usable values</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-border px-3 py-2 text-[10.5px] leading-relaxed text-faint">
        Types are inferred from the full column using strict numeric parsing. Excluding a column removes it from axis,
        color, size, and filter choices; its values remain in the preview, statistics, search, and export.
      </p>
    </div>
  );
}
