import {
  CircleHelp,
  Compass,
  Database,
  FileUp,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
} from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import { Brand } from "./Brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/useUiStore";
import { formatCompact } from "@/lib/utils";

export function Sidebar({ view }: { view: DatasetView }) {
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const setDataPanelOpen = useUiStore((state) => state.setDataPanelOpen);
  const setMobilePanel = useUiStore((state) => state.setMobilePanel);
  const setHelpOpen = useUiStore((state) => state.setHelpOpen);
  const setImportOpen = useUiStore((state) => state.setImportOpen);
  const dataset = view.dataset;

  const goExplore = () => {
    setMobilePanel("viz");
  };
  const goFilters = () => {
    setInspectorTab("filters");
    setMobilePanel("config");
  };
  const goData = () => {
    setDataPanelOpen(true);
    setMobilePanel("data");
  };

  return (
    <aside className="hidden w-[216px] shrink-0 flex-col border-r border-border bg-surface/70 lg:flex" aria-label="Application navigation">
      <div className="px-4 py-4">
        <Brand />
      </div>

      <div className="px-3">
        <Button variant="primary" size="sm" className="w-full justify-start" onClick={() => setImportOpen(true)}>
          <FileUp size={13} /> Import dataset
        </Button>
      </div>

      <nav className="mt-4 space-y-0.5 px-2" aria-label="Workspace sections">
        {[
          { label: "Explore", icon: <Compass size={14} />, onClick: goExplore },
          { label: "Filters", icon: <SlidersHorizontal size={14} />, onClick: goFilters },
          { label: "Dataset", icon: <Table2 size={14} />, onClick: goData },
          { label: "Guide", icon: <CircleHelp size={14} />, onClick: () => setHelpOpen(true) },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-[12.5px] text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus"
          >
            <span className="text-muted">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mx-3 mt-5 rounded-sm border border-border bg-surface p-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <Database size={11} className="text-muted" aria-hidden />
          <span className="panel-title">Current dataset</span>
        </div>
        <p className="mb-2 break-words text-[11.5px] font-medium leading-snug text-ink" title={dataset?.name}>
          {dataset?.name ?? "No dataset"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={dataset?.source === "demo" ? "warning" : "neutral"}>
            {dataset?.source === "demo" ? "Demo" : "Local"}
          </Badge>
          <span className="mono-num text-[10px] text-muted">
            {formatCompact(view.totalCount)} rows · {dataset?.columns.length ?? 0} cols
          </span>
        </div>
        {view.activeFilters > 0 ? (
          <p className="mono-num mt-2 border-t border-border pt-1.5 text-[10px] text-accent">
            {formatCompact(view.filteredCount)} visible after filters
          </p>
        ) : null}
      </div>

      <div className="mt-auto space-y-2 px-3 pb-3 pt-4">
        <div className="flex items-start gap-1.5 rounded-sm px-1 text-[10px] leading-relaxed text-faint">
          <ShieldCheck size={12} className="mt-0.5 shrink-0" aria-hidden />
          <p>Data is processed in this browser. Nothing is uploaded or persisted on a server.</p>
        </div>
        <p className="px-1 text-[9.5px] uppercase tracking-[0.12em] text-faint">v1.0 · local workspace</p>
      </div>
    </aside>
  );
}
