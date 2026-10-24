import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VisualizationProps } from "@/viz/registry";
import { buildHistogram, describeHistogram, type BinSetting, type HistogramBin } from "@/data/distribution";
import { formatAxisValue } from "@/data/numeric";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/store/useDataStore";
import { formatNumber } from "@/lib/utils";
import { FilteredEmpty, ViewNotice } from "./ViewShared";

function binSetting(value: unknown): BinSetting {
  if (value === "auto") return "auto";
  const numeric = Number(value);
  return numeric === 5 || numeric === 10 || numeric === 15 || numeric === 20 || numeric === 30 ? numeric : "auto";
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9.5px] uppercase tracking-[0.06em] text-faint">{label}</dt>
      <dd className="mono-num truncate text-[11.5px] text-ink-soft" title={value}>
        {value}
      </dd>
    </div>
  );
}

export function HistogramView({ view, instance }: VisualizationProps) {
  const dataset = view.dataset!;
  const config = useDataStore((state) => state.config);
  const setNumericFilter = useDataStore((state) => state.setNumericFilter);
  const clearNumericFilter = useDataStore((state) => state.clearNumericFilter);
  const clearFilters = useDataStore((state) => state.clearFilters);

  const column = dataset.columns.find((candidate) => candidate.name === instance.fields.value) ?? null;
  const setting = binSetting(instance.options.bins);
  const histogram = useMemo(
    () => (column ? buildHistogram(view.filteredRows, column, setting) : null),
    [view.filteredRows, column, setting],
  );

  if (view.filteredCount === 0) return <FilteredEmpty onClear={clearFilters} />;
  if (!column) {
    return <ViewNotice title="No numeric field" detail="Choose a numeric field for this histogram in Configure." />;
  }
  if (!histogram || histogram.empty) {
    return (
      <ViewNotice
        title="No valid values"
        detail="The filtered rows contain only missing or invalid values for this field. The bins are not invented."
        tone="warning"
      />
    );
  }

  const activeRange = config?.filters.numeric[column.name];
  const activeBinIndex = histogram.bins.findIndex(
    (bin) => activeRange?.min === bin.start && activeRange.max === bin.end,
  );
  const data = histogram.bins.map((bin) => ({
    ...bin,
    name: bin.label,
  }));

  const applyBin = (bin: HistogramBin) => {
    if (bin.start <= (histogram.summary.min ?? bin.start) && bin.end >= (histogram.summary.max ?? bin.end)) {
      clearNumericFilter(column.name);
      return;
    }
    setNumericFilter(column.name, bin.start, bin.end);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-[11px] text-muted">
          <span className="font-medium text-ink-soft">{column.name}</span> · {describeHistogram(histogram)}
        </p>
        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor={`histogram-bin-${instance.id}`}>
            Filter {column.name} histogram by bin
          </label>
          <select
            id={`histogram-bin-${instance.id}`}
            value={activeBinIndex >= 0 ? String(activeBinIndex) : ""}
            onChange={(event) => {
              const bin = histogram.bins[Number(event.target.value)];
              if (event.target.value === "") clearNumericFilter(column.name);
              else if (bin) applyBin(bin);
            }}
            className="h-7 max-w-44 rounded-sm border border-border bg-surface px-1.5 text-[10.5px] text-ink"
          >
            <option value="">Filter by bin…</option>
            {histogram.bins.map((bin, index) => (
              <option key={bin.label} value={index}>
                {bin.label}
              </option>
            ))}
          </select>
          {activeRange ? (
            <Button variant="ghost" size="xs" onClick={() => clearNumericFilter(column.name)}>
              Clear range filter
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="grid shrink-0 grid-cols-4 gap-x-3 gap-y-1.5 border-b border-border px-3 py-2 md:grid-cols-8">
        <SummaryMetric label="Valid" value={formatNumber(histogram.summary.count)} />
        <SummaryMetric label="Missing" value={formatNumber(histogram.summary.missing)} />
        <SummaryMetric label="Invalid" value={formatNumber(histogram.summary.invalid)} />
        <SummaryMetric label="Min" value={formatNumber(histogram.summary.min)} />
        <SummaryMetric label="Q1" value={formatNumber(histogram.summary.q1)} />
        <SummaryMetric label="Median" value={formatNumber(histogram.summary.median)} />
        <SummaryMetric label="Mean" value={formatNumber(histogram.summary.mean)} />
        <SummaryMetric label="Std dev" value={formatNumber(histogram.summary.stdDev)} />
      </dl>

      <div className="min-h-0 flex-1 px-1 pb-1 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 18, left: 4 }} barCategoryGap={1}>
            <CartesianGrid stroke="var(--ds-border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--ds-muted)", fontSize: 9.5, fontFamily: "var(--font-mono)" }}
              tickLine={{ stroke: "var(--ds-border-strong)" }}
              axisLine={{ stroke: "var(--ds-border-strong)" }}
              height={32}
              interval="preserveStartEnd"
              tickFormatter={(value: string) => {
                const parsed = Number(String(value).split("–")[0]);
                return Number.isFinite(parsed) ? formatAxisValue(parsed) : String(value);
              }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--ds-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickLine={{ stroke: "var(--ds-border-strong)" }}
              axisLine={{ stroke: "var(--ds-border-strong)" }}
              width={46}
              tickCount={5}
            />
            <ChartTooltip
              isAnimationActive={false}
              formatter={(value) => [formatNumber(Number(value)), "Records"]}
              labelFormatter={(label) => `Range ${label}`}
              contentStyle={{
                background: "var(--ds-surface)",
                border: "1px solid var(--ds-border-strong)",
                borderRadius: 4,
                fontSize: 11.5,
                color: "var(--ds-ink)",
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--ds-accent)"
              isAnimationActive={false}
              cursor="pointer"
              onClick={(data) => {
                const payload = (data as { payload?: HistogramBin } | undefined)?.payload;
                if (payload) applyBin(payload);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="border-t border-border px-3 py-1.5 text-[10.5px] leading-relaxed text-faint">
        Bins aggregate records. Clicking a bar applies its numeric range as a shared filter; no individual record is
        selected. {histogram.constant ? "All valid values are identical. " : ""}Statistics and filters use the full
        filtered set.
      </p>
    </div>
  );
}
