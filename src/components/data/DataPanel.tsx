import { PanelBottomClose, PanelBottomOpen, Table2 } from "lucide-react";
import type { DataTab } from "@/store/useUiStore";
import type { DatasetView } from "@/hooks/useDatasetView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatasetPreview } from "./DatasetPreview";
import { ColumnInspector } from "./ColumnInspector";
import { StatsPanel } from "./StatsPanel";
import { useUiStore } from "@/store/useUiStore";

export function DataPanel({ view }: { view: DatasetView }) {
  const dataset = view.dataset;
  const open = useUiStore((state) => state.dataPanelOpen);
  const setOpen = useUiStore((state) => state.setDataPanelOpen);
  const tab = useUiStore((state) => state.dataTab);
  const setTab = useUiStore((state) => state.setDataTab);
  if (!dataset) return null;

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface" aria-label="Dataset inspection">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Table2 size={14} className="shrink-0 text-muted" aria-hidden />
          <h2 className="text-[12px] font-medium text-ink">Dataset</h2>
          <span className="max-w-48 truncate text-[11.5px] text-muted" title={dataset.name}>
            {dataset.name}
          </span>
          <Badge tone={dataset.source === "demo" ? "warning" : "neutral"}>
            {dataset.source === "demo" ? "Demo" : "Local"}
          </Badge>
          <span className="mono-num hidden text-[10.5px] text-faint sm:inline">
            {view.totalCount.toLocaleString()} rows · {dataset.columns.length} columns
            {view.activeFilters > 0 ? ` · ${view.filteredCount.toLocaleString()} visible` : ""}
          </span>
          {dataset.warnings.length > 0 ? (
            <span
              className="hidden cursor-help text-[10.5px] text-warning md:inline"
              title={dataset.warnings.slice(0, 4).join("\n")}
            >
              {dataset.warnings.length} note{dataset.warnings.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Collapse dataset panel" : "Expand dataset panel"}
          title={open ? "Collapse dataset panel" : "Expand dataset panel"}
        >
          {open ? <PanelBottomClose size={15} /> : <PanelBottomOpen size={15} />}
        </Button>
      </div>

      {open ? (
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as DataTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border pr-2">
            <TabsList aria-label="Dataset views">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>
            <span className="hidden text-[10px] text-faint lg:inline">
              {tab === "preview"
                ? "Select a row to inspect the original record"
                : tab === "columns"
                  ? "Types are inferred; exclude columns you do not want to map"
                  : "Full vs filtered statistics; no sampling applied"}
            </span>
          </div>
          <TabsContent value="preview" className="min-h-0 flex-1 overflow-hidden">
            <DatasetPreview view={view} />
          </TabsContent>
          <TabsContent value="columns" className="min-h-0 flex-1 overflow-hidden">
            <ColumnInspector view={view} />
          </TabsContent>
          <TabsContent value="summary" className="min-h-0 flex-1 overflow-hidden">
            <StatsPanel view={view} />
          </TabsContent>
        </Tabs>
      ) : null}
    </section>
  );
}
