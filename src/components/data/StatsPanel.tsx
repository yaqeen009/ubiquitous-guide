import { useMemo, useState } from "react";
import type { DatasetView } from "@/hooks/useDatasetView";
import type { ColumnStats, NumericStats, OtherStats } from "@/data/stats";
import { isNumericStats } from "@/data/stats";
import { formatNumber } from "@/lib/utils";
import { SegmentedControl, Badge } from "@/components/ui/badge";
import { useDataStore } from "@/store/useDataStore";

type Scope = "filtered" | "full";

function NumericTable({ stats }: { stats: NumericStats[] }) {
  if (stats.length === 0) {
    return <p className="p-4 text-[12px] text-muted">No numeric columns in this dataset.</p>;
  }
  return (
    <div className="overflow-auto thin-scroll">
      <table className="w-full min-w-[620px] border-collapse text-[11.5px]" aria-label="Numeric summary statistics">
        <thead className="bg-surface-2">
          <tr>
            {["Variable", "Valid", "Missing", "Invalid", "Min", "Max", "Mean", "Median"].map((heading, index) => (
              <th
                key={heading}
                scope="col"
                className={`border-b border-border px-2 py-1.5 font-medium text-muted ${index === 0 ? "text-left" : "text-right"}`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.name} className="border-b border-border/60">
              <th scope="row" className="max-w-52 truncate px-2 py-1 text-left font-medium text-ink-soft" title={stat.name}>
                {stat.name}
              </th>
              <td className="mono-num px-2 py-1 text-right text-ink">{stat.count.toLocaleString()}</td>
              <td className="mono-num px-2 py-1 text-right text-muted">{stat.missing.toLocaleString()}</td>
              <td className={`mono-num px-2 py-1 text-right ${stat.invalid > 0 ? "text-warning" : "text-faint"}`}>
                {stat.invalid.toLocaleString()}
              </td>
              <td className="mono-num px-2 py-1 text-right text-ink-soft">{formatNumber(stat.min)}</td>
              <td className="mono-num px-2 py-1 text-right text-ink-soft">{formatNumber(stat.max)}</td>
              <td className="mono-num px-2 py-1 text-right text-ink-soft">{formatNumber(stat.mean)}</td>
              <td className="mono-num px-2 py-1 text-right text-ink-soft">{formatNumber(stat.median)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryCards({ stats, excluded }: { stats: OtherStats[]; excluded: string[] }) {
  if (stats.length === 0) {
    return <p className="p-4 text-[12px] text-muted">No categorical columns. Text columns are searchable but are not summarized here.</p>;
  }
  return (
    <div className="grid gap-2 p-2 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => {
        const max = stat.top[0]?.count ?? 1;
        return (
          <article key={stat.name} className="rounded-sm border border-border bg-surface p-2.5">
            <header className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="truncate text-[11.5px] font-medium text-ink" title={stat.name}>
                  {stat.name}
                </h4>
                <p className="text-[10px] text-faint">
                  {stat.distinct.toLocaleString()} distinct · {stat.missing.toLocaleString()} missing
                </p>
              </div>
              {excluded.includes(stat.name) ? <Badge>Excluded</Badge> : null}
            </header>
            <ul className="space-y-1">
              {stat.top.slice(0, 6).map((entry) => (
                <li key={entry.value} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate text-ink-soft" title={entry.value}>
                      {entry.value}
                    </span>
                    <span className="mono-num shrink-0 text-[10px] text-muted">{entry.count.toLocaleString()}</span>
                  </div>
                  <div className="h-[2px] w-full rounded-full bg-border/60">
                    <div
                      className="h-[2px] rounded-full bg-accent/60"
                      style={{ width: `${Math.max(2, (entry.count / max) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

export function StatsPanel({ view }: { view: DatasetView }) {
  const config = useDataStore((state) => state.config);
  const [scope, setScope] = useState<Scope>("filtered");

  const stats: ColumnStats[] = scope === "filtered" ? view.filteredStats : view.fullStats;
  const numericStats = useMemo(() => stats.filter(isNumericStats), [stats]);
  const categoryStats = useMemo(
    () => stats.filter((stat): stat is OtherStats => stat.kind === "categorical" || stat.kind === "date"),
    [stats],
  );
  const rowCount = scope === "filtered" ? view.filteredCount : view.totalCount;
  const hidden = config?.hiddenColumns ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <SegmentedControl
          label="Statistics scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: "filtered", label: `Filtered · ${view.filteredCount.toLocaleString()}` },
            { value: "full", label: `Full · ${view.totalCount.toLocaleString()}` },
          ]}
          className="max-w-[300px]"
        />
        <p className="text-[10.5px] text-faint">
          {scope === "filtered" && view.activeFilters > 0
            ? `Filtered subset · ${rowCount.toLocaleString()} of ${view.totalCount.toLocaleString()} rows`
            : `All ${rowCount.toLocaleString()} records`}
          {" · "}statistics use every row, not the rendered sample
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto thin-scroll">
        <section aria-label="Numeric statistics">
          <h3 className="panel-title px-2 pb-1 pt-2">Numeric variables</h3>
          <NumericTable stats={numericStats} />
        </section>
        <section aria-label="Category counts" className="mt-2 border-t border-border">
          <h3 className="panel-title px-2 pb-1 pt-2">Categories</h3>
          <CategoryCards stats={categoryStats} excluded={hidden} />
        </section>
      </div>
    </div>
  );
}
