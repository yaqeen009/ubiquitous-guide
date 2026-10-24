import type { DatasetView } from "@/hooks/useDatasetView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";
import { AxisControls } from "./AxisControls";
import { StylePanel } from "./StylePanel";
import { FilterPanel } from "./FilterPanel";
import { RecordPanel } from "./RecordPanel";

export function Inspector({ view }: { view: DatasetView }) {
  const config = useDataStore((state) => state.config);
  const setAxis = useDataStore((state) => state.setAxis);
  const setTwoDAxis = useDataStore((state) => state.setTwoDAxis);
  const resetAxes = useDataStore((state) => state.resetAxes);
  const inspectorTab = useUiStore((state) => state.inspectorTab);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);

  if (!config) return null;
  const activeFilters =
    Object.keys(config.filters.numeric).length +
    Object.values(config.filters.categorical).filter((values) => values.length > 0).length +
    (config.filters.search ? 1 : 0);

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-surface shadow-panel"
      aria-label="Visualization configuration and record inspector"
    >
      <Tabs
        value={inspectorTab}
        onValueChange={(value) => setInspectorTab(value as typeof inspectorTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList aria-label="Configuration sections">
          <TabsTrigger value="style">Style</TabsTrigger>
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

        <TabsContent value="style" className="min-h-0 flex-1 overflow-y-auto thin-scroll">
          <div className="border-b border-border p-3">
            <AxisControls
              config={config}
              numericColumns={view.numericColumns}
              onAxis={setAxis}
              onTwoDAxis={setTwoDAxis}
              onResetAxes={resetAxes}
            />
          </div>
          <StylePanel
            config={config}
            numericColumns={view.numericColumns}
            categoryColumns={view.categoryColumns}
          />
        </TabsContent>

        <TabsContent value="filters" className="min-h-0 flex-1 overflow-y-auto thin-scroll">
          <FilterPanel
            config={config}
            numericColumns={view.numericColumns}
            categoryColumns={view.categoryColumns}
            filteredCount={view.filteredCount}
            totalCount={view.totalCount}
          />
        </TabsContent>

        <TabsContent value="record" className="min-h-0 flex-1 overflow-hidden">
          <RecordPanel view={view} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
