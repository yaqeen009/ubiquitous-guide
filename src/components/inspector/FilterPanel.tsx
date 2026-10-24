import { useEffect, useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import type { DataColumn, NumericFilter, VisualizationConfig } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RangeSlider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { getCategoryOptions, removeCategoricalFilter } from "@/data/filters";
import { formatNumber } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";

function inputValue(value: number): string {
  return String(Number(value.toFixed(6)));
}

function NumericFilterRow({
  column,
  range,
  onApply,
  onClear,
}: {
  column: DataColumn;
  range: NumericFilter | undefined;
  onApply: (min: number, max: number) => void;
  onClear: () => void;
}) {
  const min = column.min ?? 0;
  const max = column.max ?? 1;
  const span = max - min;
  const step = span > 0 ? span / 100 : 1;
  const current: [number, number] = [range?.min ?? min, range?.max ?? max];
  const [draftMin, setDraftMin] = useState(inputValue(current[0]));
  const [draftMax, setDraftMax] = useState(inputValue(current[1]));

  useEffect(() => {
    setDraftMin(inputValue(current[0]));
    setDraftMax(inputValue(current[1]));
  }, [current[0], current[1]]);

  const commitInputs = () => {
    const parsedMin = Number(draftMin);
    const parsedMax = Number(draftMax);
    if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) {
      setDraftMin(inputValue(current[0]));
      setDraftMax(inputValue(current[1]));
      return;
    }
    const low = Math.max(min, Math.min(parsedMin, max));
    const high = Math.max(min, Math.min(parsedMax, max));
    const ordered: [number, number] = low <= high ? [low, high] : [high, low];
    if (ordered[0] <= min && ordered[1] >= max) {
      onClear();
      setDraftMin(inputValue(min));
      setDraftMax(inputValue(max));
      return;
    }
    onApply(ordered[0], ordered[1]);
  };

  const handleRange = (next: [number, number]) => {
    if (next[0] <= min && next[1] >= max) onClear();
    else onApply(next[0], next[1]);
  };

  return (
    <div className="space-y-2 border-t border-border pt-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11.5px] font-medium text-ink-soft" title={column.name}>
          {column.name}
        </span>
        {range ? (
          <button
            type="button"
            className="text-[10.5px] text-accent hover:underline"
            onClick={onClear}
            aria-label={`Clear ${column.name} filter`}
          >
            Clear
          </button>
        ) : (
          <span className="mono-num text-[10px] text-faint">
            {formatNumber(min)} – {formatNumber(max)}
          </span>
        )}
      </div>
      <RangeSlider
        label={column.name}
        value={current}
        min={min}
        max={max}
        step={step}
        onValueChange={handleRange}
        disabled={span === 0}
      />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        <Input
          type="number"
          value={draftMin}
          min={min}
          max={max}
          step={step}
          aria-label={`${column.name} minimum`}
          onChange={(event) => setDraftMin(event.target.value)}
          onBlur={commitInputs}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitInputs();
          }}
          className="h-7 px-1.5 text-[11px]"
        />
        <span className="text-[10px] text-faint">to</span>
        <Input
          type="number"
          value={draftMax}
          min={min}
          max={max}
          step={step}
          aria-label={`${column.name} maximum`}
          onChange={(event) => setDraftMax(event.target.value)}
          onBlur={commitInputs}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitInputs();
          }}
          className="h-7 px-1.5 text-[11px]"
        />
      </div>
    </div>
  );
}

function CategoricalFilterRow({
  column,
  selected,
  onToggle,
  onClear,
}: {
  column: DataColumn;
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const options = useMemo(() => getCategoryOptions(column), [column]);
  const visible = expanded ? options : options.slice(0, 8);

  return (
    <div className="space-y-1.5 border-t border-border pt-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11.5px] font-medium text-ink-soft" title={column.name}>
          {column.name}
        </span>
        {selected.length > 0 ? (
          <button
            type="button"
            className="text-[10.5px] text-accent hover:underline"
            onClick={onClear}
            aria-label={`Clear ${column.name} filter`}
          >
            Clear ({selected.length})
          </button>
        ) : (
          <span className="text-[10px] text-faint">{column.distinctCount} values</span>
        )}
      </div>
      <ul className="space-y-0.5">
        {visible.map((option) => {
          const id = `filter-${column.name}-${option.value}`.replace(/\s+/g, "-");
          const checked = selected.includes(option.value);
          return (
            <li key={option.value}>
              <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-[3px] px-0.5 py-0.5 hover:bg-surface-2">
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() => onToggle(option.value)}
                  aria-label={`${column.name}: ${option.label}`}
                />
                <span className={`min-w-0 flex-1 truncate text-[11.5px] ${option.isMissing ? "italic text-faint" : "text-ink-soft"}`}>
                  {option.label}
                </span>
                <span className="mono-num text-[10px] text-faint">{option.count.toLocaleString()}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {options.length > 8 ? (
        <button
          type="button"
          className="text-[10.5px] text-accent hover:underline"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show fewer" : `Show ${options.length - 8} more`}
        </button>
      ) : null}
    </div>
  );
}

export function FilterPanel({
  config,
  numericColumns,
  categoryColumns,
  filteredCount,
  totalCount,
}: {
  config: VisualizationConfig;
  numericColumns: DataColumn[];
  categoryColumns: DataColumn[];
  filteredCount: number;
  totalCount: number;
}) {
  const setSearch = useDataStore((state) => state.setSearch);
  const setNumericFilter = useDataStore((state) => state.setNumericFilter);
  const clearNumericFilter = useDataStore((state) => state.clearNumericFilter);
  const toggleCategoricalFilter = useDataStore((state) => state.toggleCategoricalFilter);
  const setFilters = useDataStore((state) => state.setFilters);
  const { filters } = config;
  const active = Object.keys(filters.numeric).length + Object.values(filters.categorical).filter((values) => values.length > 0).length + (filters.search ? 1 : 0);
  const filterableCategories = categoryColumns.filter((column) => column.type === "categorical" || column.type === "date");

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="panel-title flex items-center gap-1.5">
          <Filter size={12} /> Filters
        </h3>
        {active > 0 ? (
          <Button variant="ghost" size="xs" className="text-[11px]" onClick={() => setFilters({ search: "", numeric: {}, categorical: {} })}>
            Clear all
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
        <Input
          value={filters.search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search all values…"
          aria-label="Search all dataset values"
          className="h-8 pl-7 pr-7 text-[12px]"
        />
        {filters.search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-1 text-faint hover:text-ink"
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>
      <p className="text-[10.5px] text-faint">Case-insensitive. Every word must appear in the row.</p>

      <div className="flex items-center justify-between rounded-sm border border-border bg-surface-2 px-2 py-1.5">
        <span className="text-[11px] text-muted">Visible records</span>
        <span className="mono-num text-[11.5px] text-ink">
          {filteredCount.toLocaleString()} <span className="text-faint">/ {totalCount.toLocaleString()}</span>
        </span>
      </div>

      {active > 0 ? (
        <div className="flex flex-wrap gap-1">
          {filters.search ? (
            <Badge tone="accent" className="normal-case tracking-normal">
              Search: {filters.search}
              <button type="button" onClick={() => setSearch("")} aria-label="Remove search filter" className="ml-0.5 hover:text-ink">
                <X size={10} />
              </button>
            </Badge>
          ) : null}
          {Object.entries(filters.numeric).map(([name, range]) => (
            <Badge key={`num-${name}`} tone="accent" className="normal-case tracking-normal">
              {name}: {formatNumber(range.min)}–{formatNumber(range.max)}
              <button
                type="button"
                onClick={() => clearNumericFilter(name)}
                aria-label={`Remove ${name} range filter`}
                className="ml-0.5 hover:text-ink"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
          {Object.entries(filters.categorical)
            .filter(([, values]) => values.length > 0)
            .map(([name, values]) => (
              <Badge key={`cat-${name}`} tone="accent" className="normal-case tracking-normal">
                {name}: {values.length === 1 ? values[0]?.replace("\u0000missing", "Missing") : `${values.length} selected`}
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, categorical: removeCategoricalFilter(filters, name).categorical })}
                  aria-label={`Remove ${name} category filter`}
                  className="ml-0.5 hover:text-ink"
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
        </div>
      ) : null}

      {filteredCount === 0 ? (
        <div className="rounded-sm border border-warning/30 bg-warning-soft px-2.5 py-2 text-[11.5px] leading-relaxed text-warning">
          No records match. Clear or widen a filter to restore the visualization.
        </div>
      ) : null}

      <section className="space-y-2.5">
        <h4 className="panel-title">Numeric ranges</h4>
        {numericColumns.length === 0 ? (
          <p className="text-[11px] text-faint">No numeric columns.</p>
        ) : (
          numericColumns.map((column) => (
            <NumericFilterRow
              key={column.name}
              column={column}
              range={filters.numeric[column.name]}
              onApply={(min, max) => setNumericFilter(column.name, min, max)}
              onClear={() => clearNumericFilter(column.name)}
            />
          ))
        )}
      </section>

      <section className="space-y-2.5 border-t border-border pt-3">
        <h4 className="panel-title">Categories</h4>
        {filterableCategories.length === 0 ? (
          <p className="text-[11px] text-faint">No categorical columns. Use search for text values.</p>
        ) : (
          filterableCategories.map((column) => (
            <CategoricalFilterRow
              key={column.name}
              column={column}
              selected={filters.categorical[column.name] ?? []}
              onToggle={(value) => toggleCategoricalFilter(column.name, value)}
              onClear={() => {
                setFilters({
                  ...filters,
                  categorical: removeCategoricalFilter(filters, column.name).categorical,
                });
              }}
            />
          ))
        )}
      </section>
    </div>
  );
}
