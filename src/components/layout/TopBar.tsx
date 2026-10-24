import { useRef, useState } from "react";
import { Download, FileJson, FileUp, RotateCcw, Upload } from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { buildCsvFilename, datasetToCsv } from "@/data/export";
import { parseWorkspaceConfiguration, serializeWorkspace } from "@/workspace/configuration";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { downloadText, formatCompact, safeFilename } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";

export function TopBar({ view }: { view: DatasetView }) {
  const dataset = view.dataset;
  const config = useDataStore((state) => state.config);
  const applyConfig = useDataStore((state) => state.applyConfig);
  const clearFilters = useDataStore((state) => state.clearFilters);
  const setToast = useDataStore((state) => state.setToast);
  const replaceWorkspace = useWorkspaceStore((state) => state.replaceWorkspace);
  const setSpatialMode = useWorkspaceStore((state) => state.setSpatialMode);
  const spatialMode = useWorkspaceStore((state) => state.spatialMode);
  const workspace = useWorkspaceStore((state) => state);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const setMobilePanel = useUiStore((state) => state.setMobilePanel);
  const setImportOpen = useUiStore((state) => state.setImportOpen);
  const configInputRef = useRef<HTMLInputElement>(null);
  const [configErrors, setConfigErrors] = useState<string[]>([]);

  if (!dataset || !config) return null;

  const exportCsv = () => {
    if (view.filteredRows.length === 0) return;
    const csv = datasetToCsv(dataset, view.filteredRows);
    downloadText(buildCsvFilename(dataset.name, view.activeFilters > 0), csv, "text/csv;charset=utf-8");
    setToast(
      `Exported ${view.filteredRows.length.toLocaleString()} filtered row${view.filteredRows.length === 1 ? "" : "s"} as CSV.`,
    );
  };

  const saveConfig = () => {
    const json = serializeWorkspace(
      {
        panels: workspace.panels,
        layout: workspace.layout,
        activePanelId: workspace.activePanelId,
        maximizedPanelId: workspace.maximizedPanelId,
        splitRatio: workspace.splitRatio,
      },
      config,
      dataset,
      spatialMode,
    );
    downloadText(`${safeFilename(dataset.name)}-workspace.json`, json, "application/json;charset=utf-8");
    setToast("Workspace configuration saved as JSON. Uploaded data is not included.");
  };

  const importConfig = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const result = parseWorkspaceConfiguration(parsed, dataset);
      if (!result.ok) {
        setConfigErrors(result.errors);
        return;
      }
      applyConfig(result.visualization);
      replaceWorkspace(result.workspace, dataset, result.warnings, result.visualization.hiddenColumns);
      setSpatialMode(result.spatialMode);
      setToast(
        result.warnings.length > 0
          ? `Workspace applied with ${result.warnings.length} note${result.warnings.length === 1 ? "" : "s"}.`
          : "Workspace configuration applied.",
      );
    } catch (error) {
      setConfigErrors([
        error instanceof SyntaxError
          ? "The file is not valid JSON."
          : error instanceof Error
            ? error.message
            : "The configuration could not be read.",
      ]);
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border bg-surface/80 px-3 py-2 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="lg:hidden">
          <Brand compact />
        </div>
        <div className="hidden h-5 w-px bg-border lg:block" aria-hidden />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="max-w-64 truncate text-[13px] font-medium text-ink" title={dataset.name}>
              {dataset.name}
            </h1>
            <Badge tone={dataset.source === "demo" ? "warning" : "neutral"}>
              {dataset.source === "demo" ? "Synthetic demo" : "Local file"}
            </Badge>
          </div>
          <p className="mono-num text-[10px] text-muted">
            {formatCompact(view.totalCount)} rows · {dataset.columns.length} columns
            {view.activeFilters > 0 ? (
              <>
                {" · "}
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => {
                    setInspectorTab("filters");
                    setMobilePanel("config");
                  }}
                >
                  {formatCompact(view.filteredCount)} visible
                </button>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {view.activeFilters > 0 ? (
          <Tooltip content="Clear all filters and restore every record">
            <Button variant="ghost" size="iconSm" onClick={clearFilters} aria-label="Clear all filters">
              <RotateCcw size={14} />
            </Button>
          </Tooltip>
        ) : null}
        <Tooltip content="Import a CSV or load the demo (replaces the current dataset)">
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
            <Upload size={14} />
            <span className="hidden xl:inline">Import</span>
          </Button>
        </Tooltip>
        <Tooltip content={view.filteredRows.length === 0 ? "No rows to export" : "Download the filtered rows as CSV"}>
          <span>
            <Button
              variant="secondary"
              size="sm"
              onClick={exportCsv}
              disabled={view.filteredRows.length === 0}
              aria-label={`Export ${view.filteredRows.length} filtered rows as CSV`}
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </span>
        </Tooltip>
        <Tooltip content="Save open views, layout, mappings, filters, time ranges, and options as JSON">
          <Button variant="ghost" size="iconSm" onClick={saveConfig} aria-label="Save workspace configuration">
            <FileJson size={15} />
          </Button>
        </Tooltip>
        <Tooltip content="Load a workspace JSON file (validated before applying)">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => configInputRef.current?.click()}
            aria-label="Load workspace configuration"
          >
            <FileUp size={15} />
          </Button>
        </Tooltip>
        <input
          ref={configInputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Choose a workspace configuration JSON file"
          onChange={(event) => {
            void importConfig(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <ThemeToggle />
      </div>

      <Dialog
        open={configErrors.length > 0}
        onOpenChange={(open) => {
          if (!open) setConfigErrors([]);
        }}
        title="Configuration could not be applied"
        description="The file was checked before changing anything. Fix the issues below and try again, or export a fresh configuration from this dataset."
        footer={
          <Button variant="secondary" size="sm" onClick={() => setConfigErrors([])}>
            Close
          </Button>
        }
      >
        <ul className="list-disc space-y-1 rounded-sm border border-danger/25 bg-danger-soft p-3 pl-7 text-[12px] leading-relaxed text-danger" role="alert">
          {configErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </Dialog>
    </header>
  );
}
