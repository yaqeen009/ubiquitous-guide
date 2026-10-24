import type { DatasetView } from "@/hooks/useDatasetView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { PanelSettings } from "./PanelSettings";
import { visualizationById } from "@/viz/registry";
import { StylePanel } from "./StylePanel";
import { FilterPanel } from "./FilterPanel";
import { RecordPanel } from "./RecordPanel";

export function Inspector({ view }: { view: DatasetView }) {
  const config = useDataStore((state) => state.config);
  const inspectorTab = useUiStore((state) => state.inspectorTab);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const panels = useWorkspaceStore((state) => state.panels);
  const activePanelId = useWorkspaceStore((state) => state.activePanelId);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const activePanel = panels.find((panel) => panel.id === activePanelId) ?? panels[0] ?? null;

  if (!config) return null;
  const activeFilters =
    Object.keys(config.filters.numeric).length +
    Object.keys(config.filters.time ?? {}).length +
    Object.values(config.filters.categorical).filter((values) => values.length > 0).length +
    (config.filters.search ? 1 : 0);

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-surface shadow-panel"
      aria-label="View configuration and record inspector"
    >
      <Tabs
        value={inspectorTab}
        onValueChange={(value) => setInspectorTab(value as typeof inspectorTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList aria-label="Configuration sections">
          <TabsTrigger value="view">View</TabsTrigger>
          <TabsTrigger value="filters">
            Filters
            {activeFilters > 0 ? (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9.5px] text-accent-ink">
                {activeFilters}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="record">
            Record
            {view.selectedRow ? <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="min-h-0 flex-1 overflow-y-auto thin-scroll">
          {activePanel && view.dataset ? (
            <>
              {panels.length > 1 ? (
                <div className="border-b border-border p-3">
                  <label htmlFor="active-view-select" className="mb-1.5 block text-[11px] font-medium text-muted">
                    Active view
                  </label>
                  <select
                    id="active-view-select"
                    value={activePanel.id}
                    onChange={(event) => setActiveView(event.target.value)}
                    className="h-8 w-full rounded-sm border border-border bg-surface px-2 text-[12px] text-ink"
                  >
                    {panels.map((panel) => (
                      <option key={panel.id} value={panel.id}>
                        {panel.title ?? visualizationById(panel.type)?.shortName ?? "View"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <PanelSettings instance={activePanel} dataset={view.dataset} />
              <div className="border-t border-border">
                <StylePanel
                  config={config}
                  numericColumns={view.numericColumns}
                  categoryColumns={view.categoryColumns}
                />
              </div>
            </>
          ) : (
            <p className="p-4 text-[12px] text-muted">Open a view to configure it.</p>
          )}
        </TabsContent>

        <TabsContent value="filters" className="min-h-0 flex-1 overflow-y-auto thin-scroll">
          <FilterPanel
            config={config}
            numericColumns={view.numericColumns}
            categoryColumns={view.categoryColumns}
            filteredCount={view.filteredCount}
            totalCount={view.totalCount}
            dataset={view.dataset ?? undefined}
          />
        </TabsContent>

        <TabsContent value="record" className="min-h-0 flex-1 overflow-hidden">
          <RecordPanel view={view} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
