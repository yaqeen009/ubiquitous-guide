import { useMemo } from "react";
import type { VisualizationProps } from "@/viz/registry";
import {
  buildCorrelationMatrix,
  correlationColor,
  correlationText,
} from "@/data/correlation";
import { useDataStore } from "@/store/useDataStore";
import { FilteredEmpty, ViewNotice } from "./ViewShared";

function textColor(value: number | null): string {
  if (value === null) return "var(--ds-muted)";
  return Math.abs(value) > 0.55 ? "#ffffff" : "var(--ds-ink)";
}

export function CorrelationView({ view, instance }: VisualizationProps) {
  const clearFilters = useDataStore((state) => state.clearFilters);
  const maxColumns = typeof instance.options.maxColumns === "number" ? instance.options.maxColumns : 8;
  const columns = useMemo(
    () => view.numericColumns.slice(0, Math.max(2, Math.min(12, maxColumns))),
    [view.numericColumns, maxColumns],
  );

  const matrix = useMemo(
    () => (columns.length >= 2 ? buildCorrelationMatrix(columns, view.filteredRows) : null),
    [columns, view.filteredRows],
  );

  if (view.filteredCount === 0) return <FilteredEmpty onClear={clearFilters} />;
  if (!matrix) {
    return (
      <ViewNotice
        title="At least two numeric columns are required"
        detail="This heatmap needs two available numeric columns. Add or unexclude a numeric column, or use a distribution view instead."
      />
    );
  }
  if (view.filteredRows.length < 3) {
    return (
      <ViewNotice
        title="Not enough observations"
        detail="Correlation needs at least three filtered rows. Missing pairs are removed per pair, never filled with zero."
        tone="warning"
      />
    );
  }

  const byPair = new Map(matrix.cells.map((cell) => [`${cell.row}\u0000${cell.column}`, cell]));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-[11px] text-muted">
          <span className="font-medium text-ink-soft">Pearson r</span> · pairwise-complete ·{" "}
          {matrix.rowCount.toLocaleString()} filtered rows
          {matrix.sampled ? ` (${matrix.sampleCount.toLocaleString()} sampled for calculation)` : ""}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-faint" aria-label="Correlation color scale">
          <span>-1</span>
          <span
            className="h-2.5 w-24 rounded-[2px] border border-border"
            style={{
              background:
                "linear-gradient(90deg, #a64c2c 0%, #f7f6f0 50%, #2b588c 100%)",
            }}
            aria-hidden
          />
          <span>+1</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto thin-scroll p-2">
        <table className="border-separate border-spacing-0 text-[10px] sm:text-[10.5px]" aria-label="Pearson correlation heatmap">
          <caption className="sr-only">
            Pearson correlation matrix for {columns.length} numeric columns over {matrix.rowCount} filtered rows. A null
            correlation is shown as n/a and is never treated as zero.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface px-1.5 py-1 text-left font-medium text-muted">
                Variable
              </th>
              {columns.map((column) => (
                <th
                  key={column.name}
                  scope="col"
                  className="max-w-24 px-1 py-1 text-center font-medium text-ink-soft"
                  title={column.name}
                >
                  <span className="mx-auto block max-w-24 truncate">{column.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((left) => (
              <tr key={left.name}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-40 truncate bg-surface px-1.5 py-1 text-left font-medium text-ink-soft"
                  title={left.name}
                >
                  {left.name}
                </th>
                {columns.map((right) => {
                  const cell = byPair.get(`${left.name}\u0000${right.name}`);
                  const value = cell?.value ?? null;
                  const missing = value === null;
                  const diagonal = left.name === right.name;
                  return (
                    <td key={right.name} className="p-0.5">
                      <div
                        className="flex h-8 min-w-9 items-center justify-center rounded-[2px] border border-border/60 text-center"
                        style={
                          missing
                            ? {
                                backgroundImage:
                                  "repeating-linear-gradient(45deg, var(--ds-surface-2) 0 3px, var(--ds-surface) 3px 6px)",
                              }
                            : { background: correlationColor(diagonal ? 1 : value), color: textColor(value) }
                        }
                        title={
                          missing
                            ? `${left.name} × ${right.name}: not enough paired observations (n=${cell?.pairs ?? 0})`
                            : `${left.name} × ${right.name}: r=${correlationText(value)} (n=${cell?.pairs ?? 0})`
                        }
                      >
                        <span className={`mono-num ${diagonal ? "opacity-70" : ""}`}>
                          {missing ? "n/a" : correlationText(value)}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-border px-3 py-1.5 text-[10.5px] leading-relaxed text-faint">
        Missing values are removed per pair. Hatching means the correlation is undefined (constant column or fewer than
        three pairs); a neutral cell is a real correlation near zero. Calculation uses up to 2,000 evenly-spaced filtered
        rows when the set is larger.
      </p>
    </div>
  );
}
