import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from "lucide-react";
import type { DataColumn, DataRow } from "@/types";
import type { VisualizationProps } from "@/viz/registry";
import { rowDateValue } from "@/data/filters";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";
import { FilteredEmpty } from "./ViewShared";

type SortDirection = "asc" | "desc";

function compareValues(left: DataRow, right: DataRow, column: DataColumn, direction: SortDirection): number {
  const sign = direction === "asc" ? 1 : -1;
  if (column.type === "numeric") {
    const a = left.numeric[column.index];
    const b = right.numeric[column.index];
    if (a == null && b == null) return left.id - right.id;
    if (a == null) return 1;
    if (b == null) return -1;
    return (a - b) * sign;
  }
  if (column.type === "date") {
    const a = rowDateValue(left, column);
    const b = rowDateValue(right, column);
    if (a == null && b == null) return left.id - right.id;
    if (a == null) return 1;
    if (b == null) return -1;
    return (a - b) * sign;
  }
  const a = (left.raw[column.index] ?? "").trim();
  const b = (right.raw[column.index] ?? "").trim();
  if (a === "" && b === "") return left.id - right.id;
  if (a === "") return 1;
  if (b === "") return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }) * sign;
}

function cellText(row: DataRow, column: DataColumn): string {
  const raw = row.raw[column.index] ?? "";
  if (raw.trim() === "") return "—";
  if (column.type === "numeric" && row.numeric[column.index] === null) return `${raw} (invalid)`;
  return raw;
}

export function TableView({ view, instance }: VisualizationProps) {
  const dataset = view.dataset!;
  const selectRow = useDataStore((state) => state.selectRow);
  const toggleRowSelection = useDataStore((state) => state.toggleRowSelection);
  const selectRows = useDataStore((state) => state.selectRows);
  const selectedRowIds = useDataStore((state) => state.selectedRowIds);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const clearFilters = useDataStore((state) => state.clearFilters);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ column: string; direction: SortDirection } | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = Math.max(
    10,
    Math.min(500, typeof instance.options.pageSize === "number" ? Math.trunc(instance.options.pageSize) : 50),
  );

  const selected = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

  const rows = useMemo(() => {
    const terms = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    let next = view.filteredRows;
    if (terms.length > 0) {
      next = next.filter((row) => {
        const haystack = row.raw.map((cell) => cell.toLowerCase()).join(" ");
        return terms.every((term) => haystack.includes(term));
      });
    }
    if (sort) {
      const column = dataset.columns.find((candidate) => candidate.name === sort.column);
      if (column) next = [...next].sort((left, right) => compareValues(left, right, column, sort.direction));
    }
    return next;
  }, [view.filteredRows, query, sort, dataset]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [query, pageSize, sort, view.filteredRows]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  if (!dataset) return null;
  if (view.filteredCount === 0) return <FilteredEmpty onClear={clearFilters} />;

  const toggleSort = (column: string) => {
    setSort((current) => {
      if (!current || current.column !== column) return { column, direction: "asc" };
      if (current.direction === "asc") return { column, direction: "desc" };
      return null;
    });
  };

  const pageIds = pageRows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative min-w-36 flex-1">
          <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this table…"
            aria-label="Search this table"
            className="h-7 pl-7 pr-7 text-[11.5px]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
              aria-label="Clear table search"
            >
              <X size={11} />
            </button>
          ) : null}
        </div>
        <span className="mono-num text-[10.5px] text-muted">
          {rows.length.toLocaleString()} row{rows.length === 1 ? "" : "s"}
          {selected.size > 0 ? ` · ${selected.size} selected` : ""}
        </span>
        {selected.size > 0 ? (
          <Button variant="ghost" size="xs" onClick={() => selectRows([])}>
            Clear selection
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto thin-scroll">
        <table className="w-full min-w-[760px] border-collapse text-[11.5px]" aria-label="Data table view">
          <caption className="sr-only">
            Filtered data table. {rows.length} rows, sorted {sort ? `${sort.column} ${sort.direction}` : "by record order"}.
          </caption>
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              <th scope="col" className="w-8 border-b border-border px-2 py-1.5">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={(checked) => {
                    if (checked === true) selectRows([...new Set([...selectedRowIds, ...pageIds])]);
                    else selectRows(selectedRowIds.filter((id) => !pageIds.includes(id)));
                  }}
                  aria-label="Select all rows on this page"
                />
              </th>
              <th scope="col" className="w-10 border-b border-border px-2 py-1.5 text-right font-medium text-muted">
                #
              </th>
              {dataset.columns.map((column) => {
                const active = sort?.column === column.name;
                const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
                return (
                  <th
                    key={column.name}
                    scope="col"
                    aria-sort={ariaSort}
                    className="whitespace-nowrap border-b border-border px-1 py-1 text-left font-medium text-ink-soft"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.name)}
                      className="inline-flex items-center gap-1 rounded-[2px] px-1 py-0.5 hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-focus"
                      title={`Sort by ${column.name} (${column.type})`}
                    >
                      {column.name}
                      {active ? (
                        sort.direction === "asc" ? (
                          <ArrowUp size={10} aria-hidden />
                        ) : (
                          <ArrowDown size={10} aria-hidden />
                        )
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const isSelected = selected.has(row.id);
              const isPrimary = row.id === selectedRowId;
              return (
                <tr
                  key={row.id}
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => {
                    selectRow(row.id);
                    setInspectorTab("record");
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    selectRow(row.id);
                    setInspectorTab("record");
                  }}
                  className={`cursor-pointer border-b border-border/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus ${
                    isPrimary
                      ? "bg-accent-soft shadow-[inset_2px_0_0_var(--ds-accent)]"
                      : isSelected
                        ? "bg-accent-soft/60"
                        : "hover:bg-surface-2"
                  }`}
                >
                  <td className="px-2 py-1" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRowSelection(row.id)}
                      aria-label={`Select row ${row.id + 1}`}
                    />
                  </td>
                  <td className="mono-num px-2 py-1 text-right text-faint">{row.id + 1}</td>
                  {dataset.columns.map((column) => {
                    const raw = row.raw[column.index] ?? "";
                    const missing = raw.trim() === "";
                    const invalid = column.type === "numeric" && !missing && row.numeric[column.index] === null;
                    return (
                      <td
                        key={column.name}
                        className={`max-w-56 truncate px-2 py-1 ${
                          missing ? "text-faint" : invalid ? "text-warning" : "text-ink-soft"
                        }`}
                        title={missing ? "Missing value" : invalid ? "Not a valid number; treated as missing in charts" : raw}
                      >
                        {missing ? "—" : invalid ? `${raw} (invalid)` : column.type === "numeric" ? formatNumber(row.numeric[column.index]) : cellText(row, column)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-2 py-1.5">
        <p className="mono-num text-[10.5px] text-muted">
          {rows.length === 0 ? "No matching rows" : `${(safePage * pageSize + 1).toLocaleString()}–${Math.min(rows.length, (safePage + 1) * pageSize).toLocaleString()} of ${rows.length.toLocaleString()}`}
          {rows.length !== view.totalCount ? ` (from ${view.totalCount.toLocaleString()})` : ""}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="iconSm" onClick={() => setPage(0)} disabled={safePage === 0} aria-label="First table page">
            <ChevronsLeft size={13} />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={() => setPage(safePage - 1)} disabled={safePage === 0} aria-label="Previous table page">
            <ChevronLeft size={13} />
          </Button>
          <span className="mono-num min-w-14 text-center text-[10.5px] text-muted">
            {safePage + 1} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setPage(safePage + 1)}
            disabled={safePage >= pageCount - 1}
            aria-label="Next table page"
          >
            <ChevronRight size={13} />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setPage(pageCount - 1)}
            disabled={safePage >= pageCount - 1}
            aria-label="Last table page"
          >
            <ChevronsRight size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}
