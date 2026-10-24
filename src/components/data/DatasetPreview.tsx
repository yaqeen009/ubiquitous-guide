import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import type { DataColumn } from "@/types";
import { PREVIEW_PAGE_SIZE } from "@/data/limits";
import { displayCell } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";

function cellContent(column: DataColumn, raw: string, numeric: number | null) {
  if (raw.trim() === "") return <span className="text-faint">—</span>;
  if (column.type === "numeric" && (numeric === null || !Number.isFinite(numeric))) {
    return (
      <span className="text-warning" title="Not a valid number; treated as missing in charts">
        {raw}
      </span>
    );
  }
  return displayCell(raw);
}

export function DatasetPreview({ view }: { view: DatasetView }) {
  const dataset = view.dataset;
  const selectRow = useDataStore((state) => state.selectRow);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const clearFilters = useDataStore((state) => state.clearFilters);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const focusRowId = useUiStore((state) => state.focusRowId);
  const setFocusRowId = useUiStore((state) => state.setFocusRowId);
  const [page, setPage] = useState(0);
  const [pendingScroll, setPendingScroll] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageCount = Math.max(1, Math.ceil(view.filteredRows.length / PREVIEW_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  useEffect(() => {
    setPage(0);
  }, [view.filteredRows]);

  useEffect(() => {
    if (focusRowId === null) return;
    const index = view.filteredRows.findIndex((row) => row.id === focusRowId);
    if (index >= 0) {
      setPage(Math.floor(index / PREVIEW_PAGE_SIZE));
      setPendingScroll(focusRowId);
    }
    setFocusRowId(null);
  }, [focusRowId, view.filteredRows, setFocusRowId]);

  useEffect(() => {
    if (pendingScroll === null) return;
    const target = containerRef.current?.querySelector<HTMLElement>(`[data-row-id="${pendingScroll}"]`);
    if (target) {
      target.scrollIntoView({ block: "nearest" });
      target.focus({ preventScroll: true });
    }
    setPendingScroll(null);
  }, [pendingScroll, safePage]);

  const rows = useMemo(
    () => view.filteredRows.slice(safePage * PREVIEW_PAGE_SIZE, safePage * PREVIEW_PAGE_SIZE + PREVIEW_PAGE_SIZE),
    [view.filteredRows, safePage],
  );

  if (!dataset) return null;

  if (view.filteredRows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <SearchX size={22} className="text-faint" />
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-ink">No rows match the active filters</p>
          <p className="text-[11.5px] text-muted">The preview, statistics, and export all use the filtered subset.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={clearFilters}>
          Clear all filters
        </Button>
      </div>
    );
  }

  const start = safePage * PREVIEW_PAGE_SIZE + 1;
  const end = Math.min(view.filteredRows.length, (safePage + 1) * PREVIEW_PAGE_SIZE);
  const lastPage = pageCount - 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto thin-scroll">
        <table className="w-full min-w-[720px] border-collapse text-[11.5px]" aria-label="Dataset row preview">
          <caption className="sr-only">
            Preview of {view.filteredRows.length} filtered rows from {dataset.name}. Select a row to inspect it.
          </caption>
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              <th scope="col" className="w-12 border-b border-border px-2 py-1.5 text-right font-medium text-muted">
                #
              </th>
              {dataset.columns.map((column) => (
                <th
                  key={column.name}
                  scope="col"
                  className="whitespace-nowrap border-b border-border px-2 py-1.5 text-left font-medium text-ink-soft"
                  title={`${column.name} · ${column.type}`}
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = row.id === selectedRowId;
              return (
                <tr
                  key={row.id}
                  data-row-id={row.id}
                  tabIndex={0}
                  aria-selected={selected}
                  onClick={() => {
                    selectRow(row.id);
                    setInspectorTab("record");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectRow(row.id);
                      setInspectorTab("record");
                    }
                  }}
                  className={`cursor-pointer border-b border-border/60 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
                    selected
                      ? "bg-accent-soft shadow-[inset_2px_0_0_var(--ds-accent)]"
                      : "hover:bg-surface-2"
                  }`}
                >
                  <td className="mono-num px-2 py-1 text-right text-faint">{row.id + 1}</td>
                  {dataset.columns.map((column) => {
                    const raw = row.raw[column.index] ?? "";
                    return (
                      <td
                        key={column.name}
                        className="max-w-52 truncate px-2 py-1 text-ink-soft"
                        title={raw === "" ? "Missing value" : raw}
                      >
                        {cellContent(column, raw, row.numeric[column.index] ?? null)}
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
          {start.toLocaleString()}–{end.toLocaleString()} of {view.filteredRows.length.toLocaleString()}
          {view.filteredRows.length !== view.totalCount ? ` (from ${view.totalCount.toLocaleString()})` : ""}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setPage(0)}
            disabled={safePage === 0}
            aria-label="First page"
          >
            <span aria-hidden>«</span>
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={safePage === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="mono-num min-w-16 text-center text-[10.5px] text-muted">
            {safePage + 1} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setPage((value) => Math.min(lastPage, value + 1))}
            disabled={safePage >= lastPage}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setPage(lastPage)}
            disabled={safePage >= lastPage}
            aria-label="Last page"
          >
            <span aria-hidden>»</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
