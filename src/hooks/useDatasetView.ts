import { useMemo } from "react";
import type { ColumnStats } from "@/data/stats";
import { applyFilters, activeFilterCount } from "@/data/filters";
import { computeStats } from "@/data/stats";
import { useDataStore } from "@/store/useDataStore";
import type { DataColumn, DataRow, Filters } from "@/types";

export interface DatasetView {
  dataset: ReturnType<typeof useDataStore.getState>["dataset"];
  filteredRows: DataRow[];
  fullStats: ColumnStats[];
  filteredStats: ColumnStats[];
  numericColumns: DataColumn[];
  categoryColumns: DataColumn[];
  searchableColumns: DataColumn[];
  activeFilters: number;
  totalCount: number;
  filteredCount: number;
  selectedRow: DataRow | null;
  selectedRowHidden: boolean;
  selectedIndex: number;
}

const EMPTY_FILTERS: Filters = { search: "", numeric: {}, categorical: {} };
const EMPTY_HIDDEN: string[] = [];

export function useDatasetView(): DatasetView {
  const dataset = useDataStore((state) => state.dataset);
  const config = useDataStore((state) => state.config);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const filters = config?.filters ?? EMPTY_FILTERS;
  const hidden = config?.hiddenColumns ?? EMPTY_HIDDEN;

  const filteredRows = useMemo(
    () => (dataset ? applyFilters(dataset, filters) : []),
    [dataset, filters],
  );

  const fullStats = useMemo(
    () => (dataset ? computeStats(dataset.columns, dataset.rows) : []),
    [dataset],
  );

  const filteredStats = useMemo(
    () =>
      dataset
        ? filters === EMPTY_FILTERS || activeFilterCount(filters) === 0
          ? fullStats
          : computeStats(dataset.columns, filteredRows)
        : [],
    [dataset, filteredRows, fullStats, filters],
  );

  const selectedRow = useMemo(() => {
    if (!dataset || selectedRowId === null) return null;
    return dataset.rows.find((row) => row.id === selectedRowId) ?? null;
  }, [dataset, selectedRowId]);

  const selectedIndex = useMemo(
    () => (selectedRowId === null ? -1 : filteredRows.findIndex((row) => row.id === selectedRowId)),
    [filteredRows, selectedRowId],
  );

  return {
    dataset,
    filteredRows,
    fullStats,
    filteredStats,
    numericColumns: useMemo(
      () =>
        dataset
          ? dataset.columns.filter((column) => column.type === "numeric" && !hidden.includes(column.name))
          : [],
      [dataset, hidden],
    ),
    categoryColumns: useMemo(
      () =>
        dataset
          ? dataset.columns.filter(
              (column) =>
                (column.type === "categorical" || column.type === "date" || column.type === "text") &&
                !hidden.includes(column.name),
            )
          : [],
      [dataset, hidden],
    ),
    searchableColumns: useMemo(
      () => (dataset ? dataset.columns.filter((column) => column.type !== "empty") : []),
      [dataset],
    ),
    activeFilters: activeFilterCount(filters),
    totalCount: dataset?.rows.length ?? 0,
    filteredCount: filteredRows.length,
    selectedRow,
    selectedRowHidden: selectedRow !== null && selectedIndex === -1,
    selectedIndex,
  };
}
